// 정답셋: 초안 CSV 만들기와 규칙 비교. `node etl/notices/eval.ts new <시작일> <끝날> [개수]` | `node etl/notices/eval.ts <정답셋.csv>`
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIND_LABEL, type Kind } from './classify.ts';
import { BoardError, bodyOf, CACHE_DIR, listSince, makeGet, SOURCE, viewUrl, type Get } from './cse.ts';
import { readDates } from './deadline.ts';
import { makeAsk, type Ask } from './llm.ts';
import { isDay, judgeAll, llmPart, type Judgement } from './run.ts';

export type GoldRow = {
  id: string; board: string; title: string; postedAt: string; opportunity: boolean;
  kind: Kind | null; deadline: string | 'none' | 'image' | null; host: string | null;
};

/** 엑셀·Numbers가 한글을 바로 읽게 BOM과 CRLF를 붙이고 모든 칸을 따옴표로 감싼다 */
export const writeCsv = (rows: string[][]) =>
  `\uFEFF${rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n')}\r\n`;

/** 엑셀에서 'CSV UTF-8'이 아닌 그냥 'CSV'로 저장하면 EUC-KR(CP949)이다 */
export function decodeCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('euc-kr').decode(bytes);
  }
}

/** RFC 4180: 따옴표 칸 안의 쉼표·줄바꿈·겹따옴표를 그대로 읽는다. 줄 끝은 CRLF·LF 모두 받는다 */
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const COLS = ['링크', '게시판', '제목', '게시일', '기회', '종류', '마감', '주최', '확신', '메모'] as const;
const LINK = /^https:\/\/cse\.skku\.edu\/cse\/notice\.do\?mode=view&articleNo=(\d+)$/;
const FULL_DATE = /^20\d\d\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,2}\s*\.?$/;
/** '대회/공모전', '그림 첨부'처럼 가운뎃점을 다르게 쳐도 받는다 */
const flat = (s: string) => s.replace(/[\s·ㆍ・/.,]/g, '');
const KIND_OF = new Map((Object.keys(KIND_LABEL) as Kind[]).map(k => [flat(KIND_LABEL[k]), k]));
const day = (v: string) => (FULL_DATE.test(v) ? readDates(v, '2000-01-01')[0] : undefined) ?? null;
const DATE_HINT = '날짜는 2026-11-15처럼 써 주세요';

/** 머리글 이름으로 칸을 찾는다. 틀린 값은 멈추지 않고 모두 모은다(줄 번호는 스프레드시트 행 번호) */
export function parseGold(rows: string[][]): { gold: GoldRow[]; errors: string[] } {
  const [head = [], ...body] = rows;
  const at = new Map(head.map((h, i) => [h.trim(), i]));
  const missing = COLS.filter(c => !at.has(c));
  if (missing.length) return { gold: [], errors: missing.map(c => `1행 머리글: ${c} (이 이름의 칸이 없어요)`) };
  const gold: GoldRow[] = [];
  const errors: string[] = [];
  const firstLine = new Map<string, number>();
  body.forEach((cells, i) => {
    if (cells.every(c => !c.trim())) return;
    const line = i + 2;
    const cell = (c: (typeof COLS)[number]) => (cells[at.get(c) ?? -1] ?? '').trim();
    const bad = (col: string, v: string, why: string) => { errors.push(`${line}행 ${col}: ${v || '빈칸'} (${why})`); };

    const no = cell('링크').match(LINK)?.[1];
    const id = `cse:${no}`;
    if (!no) bad('링크', cell('링크'), `${SOURCE}?mode=view&articleNo=<글번호> 꼴로 적어 주세요`);
    else if (firstLine.has(id)) bad('링크', cell('링크'), `${firstLine.get(id)}행과 같은 글이에요`);
    else firstLine.set(id, line);
    const postedAt = day(cell('게시일'));
    if (!postedAt) bad('게시일', cell('게시일'), DATE_HINT);
    const o = cell('기회').toUpperCase();
    if (o !== 'O' && o !== 'X') bad('기회', cell('기회'), 'O나 X로 적어 주세요');

    const kindText = cell('종류');
    const kind = KIND_OF.get(flat(kindText)) ?? null;
    if (kindText && !kind) bad('종류', kindText, `모르는 종류예요. 쓸 수 있는 값: ${Object.values(KIND_LABEL).join(', ')}`);
    else if (o === 'X' && kindText) bad('종류', kindText, '기회가 X면 종류를 비워 주세요');
    else if (o === 'O' && !kindText) bad('종류', '', '기회가 O면 종류를 적어 주세요');

    const dText = cell('마감');
    const deadline = !dText ? null : flat(dText) === '없음' ? 'none' : flat(dText) === '그림첨부' ? 'image' : day(dText);
    if (dText && !deadline) bad('마감', dText, DATE_HINT);
    else if (o === 'X' && dText) bad('마감', dText, '기회가 X면 마감을 비워 주세요');
    else if (o === 'O' && !dText) bad('마감', '', '기회가 O면 날짜, 없음, 그림·첨부 중 하나를 적어 주세요');

    const host = cell('주최').replace(/\s+/g, ' ');
    gold.push({
      id, board: cell('게시판'), title: cell('제목'), postedAt: postedAt ?? '', opportunity: o === 'O',
      kind: o === 'O' ? kind : null, deadline: o === 'O' ? deadline : null, host: host && host !== '없음' ? host : null
    });
  });
  return { gold, errors };
}

export type Miss = { id: string; title: string; rule: string; gold: string; why: string };
export type Metric = { name: string; target: string; num: number; den: number; value: number | null; pass: boolean | null; tag: string; wrong: Miss[] };

type Pair = { g: GoldRow; r: Judgement };
type Def = { name: string; op?: '≥' | '≤'; pct?: number; pool: (p: Pair) => boolean; hit: (p: Pair) => boolean; show?: (p: Pair) => Omit<Miss, 'id' | 'title'> };

const oppOf = (r: Judgement) => (r.verdict === 'opportunity' ? r : null);
const both = (p: Pair) => p.g.opportunity && p.r.verdict === 'opportunity';
const norm = (s: string | null | undefined) => s?.replace(/\s+/g, ' ').trim() || null;
const isDate = (d: GoldRow['deadline']) => d !== null && d !== 'none' && d !== 'image';
const goldDay = (d: GoldRow['deadline']) => (d === 'none' ? '없음' : d === 'image' ? '그림·첨부' : d ?? '');
const reason = (r: Judgement) => (r.verdict === 'review' ? r.why : r.rule);
const showOx = (p: Pair) => ({ rule: p.r.verdict === 'opportunity' ? 'O' : p.r.verdict === 'not' ? 'X' : '확인 필요', gold: p.g.opportunity ? 'O' : 'X', why: reason(p.r) });
const showDay = (p: Pair) => ({ rule: oppOf(p.r)?.deadline ?? '빈칸', gold: goldDay(p.g.deadline), why: oppOf(p.r)?.deadlineRule ?? '' });

/** spec SC-001~SC-007과 주최 채움(참고). 분모는 data-model '지표' 표 그대로다 */
const DEFS: Def[] = [
  { name: '기회 여부', op: '≥', pct: 95, pool: p => p.r.verdict !== 'review', hit: p => (p.r.verdict === 'opportunity') === p.g.opportunity, show: showOx },
  { name: '기회 놓침', op: '≤', pct: 3, pool: p => p.g.opportunity, hit: p => p.r.verdict === 'not', show: showOx },
  { name: '종류', op: '≥', pct: 90, pool: both, hit: p => oppOf(p.r)?.kind === p.g.kind, show: p => ({ rule: oppOf(p.r)?.kind ?? '', gold: p.g.kind ?? '', why: reason(p.r) }) },
  { name: '마감 정확', op: '≥', pct: 95, pool: p => both(p) && !!oppOf(p.r)?.deadline, hit: p => oppOf(p.r)?.deadline === p.g.deadline, show: showDay },
  { name: '마감 채움', op: '≥', pct: 70, pool: p => both(p) && isDate(p.g.deadline), hit: p => !!oppOf(p.r)?.deadline, show: showDay },
  { name: '주최', op: '≥', pct: 90, pool: p => both(p) && !!norm(oppOf(p.r)?.host), hit: p => norm(oppOf(p.r)?.host) === norm(p.g.host), show: p => ({ rule: oppOf(p.r)?.host ?? '', gold: p.g.host ?? '없음', why: '' }) },
  { name: '확인 필요', op: '≤', pct: 10, pool: () => true, hit: p => p.r.verdict === 'review', show: showOx },
  { name: '주최 채움(참고)', pool: p => both(p) && !!norm(p.g.host), hit: p => !!norm(oppOf(p.r)?.host) }
];

/** gold[i]와 judged[i]가 같은 글이다. 기준 비교는 정수로 해서 19/20이 95%를 넘는다 */
export function score(gold: GoldRow[], judged: Judgement[]): Metric[] {
  const pairs = gold.map((g, i) => ({ g, r: judged[i] }));
  return DEFS.map(d => {
    const pool = pairs.filter(d.pool);
    const hits = pool.filter(d.hit);
    const num = hits.length;
    const den = pool.length;
    const pass = !d.op || !d.pct || den === 0 ? null : d.op === '≥' ? num * 100 >= d.pct * den : num * 100 <= d.pct * den;
    const { show } = d;
    const bad = d.op === '≤' ? hits : pool.filter(p => !d.hit(p));
    return {
      name: d.name, target: d.op ? `${d.op}${d.pct}%` : '', num, den, value: den ? num / den : null, pass,
      tag: d.op === '≥' ? `${d.name} 틀림` : d.name, wrong: show ? bad.map(p => ({ id: p.g.id, title: p.g.title, ...show(p) })) : []
    };
  });
}

/** 글 식별자의 SHA-1 순서로 앞에서 n개. 다시 돌려도 같은 표본이다 */
export const sampleBySha1 = (ids: string[], n: number) =>
  ids.map(id => [createHash('sha1').update(id).digest('hex'), id]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).slice(0, n).map(([, id]) => id);

/** 한글은 터미널에서 두 칸을 차지한다 */
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 2 : 1), 0)));

function formatScore(ms: Metric[]): string {
  const rows = [['지표', '값', '기준', '판정', ''], ...ms.map(m => [
    m.name, m.value === null ? '해당 없음' : `${(m.value * 100).toFixed(1)}%`, m.target, m.pass === null ? '' : m.pass ? '통과' : '미달', `(${m.num}/${m.den})`
  ])];
  const table = rows.map(r => r.map((c, i) => pad(c, [16, 10, 7, 6, 0][i])).join('').trimEnd());
  const wrong = ms.flatMap(m => m.wrong.map(w => `[${m.tag}] ${w.id} 규칙=${w.rule} 정답=${w.gold}${w.why ? ` 근거=${w.why}` : ''} · ${w.title}`));
  return [...table, ...(wrong.length ? ['', ...wrong] : [])].join('\n');
}

const GOLD_DIR = fileURLToPath(new URL('../gold', import.meta.url));

/** 기간 안 글로 라벨 칸이 빈 초안을 쓰고, 본문을 보관함에 받아 둔다. 사람이 고친 파일은 덮어쓰지 않는다 */
async function draft(from: string, to: string, n: number | undefined, get: Get, goldDir: string, cacheDir: string): Promise<number> {
  const name = `draft-${from}-${to}.csv`;
  const file = join(goldDir, name);
  if (existsSync(file)) {
    console.error(`이미 있어요: etl/gold/${name}. 사람이 고친 라벨을 지키려고 덮어쓰지 않아요.`);
    return 2;
  }
  let rows = (await listSince(from, get)).filter(r => r.postedAt <= to).sort((a, b) => b.no - a.no);
  if (n !== undefined) {
    const keep = new Set(sampleBySha1(rows.map(r => `cse:${r.no}`), n));
    rows = rows.filter(r => keep.has(`cse:${r.no}`));
  }
  console.error(`초안 대상 ${rows.length}건 (${from} ~ ${to})`);
  const missing: number[] = [];
  for (const [i, r] of rows.entries()) {
    if (!(await bodyOf(r.no, get, cacheDir)).lines) missing.push(r.no);
    if ((i + 1) % 20 === 0 || i + 1 === rows.length) console.error(`본문 ${i + 1}/${rows.length}`);
  }
  // 비교는 보관한 본문으로만 해야 다시 돌려도 같은 결과다. 하나라도 빠지면 초안을 쓰지 않는다
  if (missing.length) {
    console.error(`본문 ${missing.length}건을 받지 못해 초안을 쓰지 않았어요 (글 번호 ${missing.join(', ')}). 다시 실행하면 받아 둔 본문은 건너뛰어요.`);
    return 1;
  }
  mkdirSync(goldDir, { recursive: true });
  writeFileSync(file, writeCsv([[...COLS], ...rows.map(r => [viewUrl(r.no), r.board, r.title, r.postedAt, '', '', '', '', '', ''])]));
  console.log(`초안 ${rows.length}줄: etl/gold/${name}`);
  return 0;
}

/** run.ts와 같은 판정 경로(judgeAll: 규칙, LLM, 보관한 답)로 CSV의 제목·게시판·게시일과 보관한 본문을 판정해 정답과 비교한다 */
async function compare(path: string, get: Get, cacheDir: string, ask?: Ask): Promise<number> {
  if (!existsSync(path)) {
    console.error(`정답셋 파일이 없어요: ${path}`);
    return 2;
  }
  const { gold, errors } = parseGold(readCsv(decodeCsv(readFileSync(path))));
  if (errors.length) {
    console.error([`정답셋을 읽지 못했어요 (${errors.length}건):`, ...errors.map(e => `  ${e}`)].join('\n'));
    return 2;
  }
  if (!gold.length) {
    console.error(`정답셋에 글이 없어요: ${path}`);
    return 2;
  }
  const bodies: (string[] | null)[] = [];
  for (const g of gold) bodies.push((await bodyOf(Number(g.id.slice(4)), get, cacheDir)).lines);
  // 받지 못한 본문을 규칙의 '확인 필요'로 세면 점수가 네트워크 상태에 따라 달라진다
  const missing = gold.filter((_, i) => !bodies[i]).map(g => g.id.slice(4));
  if (missing.length) {
    console.error(`본문 ${missing.length}건을 읽지 못해 비교하지 않았어요 (글 번호 ${missing.join(', ')}).`);
    return 1;
  }
  const rows = gold.map(g => ({ no: Number(g.id.slice(4)), title: g.title, board: g.board, postedAt: g.postedAt, pinned: false }));
  const { judged, llm } = await judgeAll(rows, bodies, ask);
  if (llm) console.log(llmPart(llm));
  // 서버에 닿지 못한 글을 규칙 결과로 세면 한 번뿐인 최종 성적이 규칙 성적이 된다(스펙 2 FR-023). 글 실패는 실행처럼 규칙 결과로 센다
  if (llm?.skipped) {
    console.error(`LLM에 연결하지 못한 글이 ${llm.skipped}건이라 비교하지 않았어요 (${llm.model})`);
    return 1;
  }
  const metrics = score(gold, judged);
  console.log(formatScore(metrics));
  if (llm?.failed) console.log(`LLM 판정 실패 ${llm.failed}건은 규칙 결과로 셌어요`);
  return metrics.every(m => m.pass !== false) ? 0 : 1;
}

const USAGE = '쓰는 법: node etl/notices/eval.ts new <시작일 YYYY-MM-DD> <끝날 YYYY-MM-DD> [개수] | node etl/notices/eval.ts <정답셋.csv>';

/** 종료 코드를 돌려준다: 0 성공·기준 통과, 1 실행 실패·기준 미달, 2 잘못된 입력(contracts/cli.md) */
export async function main(args: string[], get: Get, goldDir = GOLD_DIR, cacheDir = CACHE_DIR, ask?: Ask): Promise<number> {
  const [cmd, from = '', to = '', count] = args;
  if (cmd === 'new' && isDay(from) && isDay(to) && from <= to && (count === undefined || /^[1-9]\d*$/.test(count)) && args.length <= 4) {
    try {
      return await draft(from, to, count === undefined ? undefined : Number(count), get, goldDir, cacheDir);
    } catch (e) {
      if (!(e instanceof BoardError)) throw e;
      console.error(e.message);
      return 1;
    }
  }
  if (cmd && cmd !== 'new' && args.length === 1) return compare(cmd, get, cacheDir, ask);
  console.error(USAGE);
  return 2;
}

// 경로에 심볼릭 링크가 있어도 진입점을 알아본다(run.ts와 같은 이유)
if (import.meta.main) process.exitCode = await main(process.argv.slice(2), makeGet(), GOLD_DIR, CACHE_DIR, makeAsk());
