// 진입점: 목록 → 본문 → 판정 → 중복 정리 → 결과 파일. `node etl/notices/run.ts [기준일]` (Node 22.18 이상)
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classify, hostOf, type Judged, type Kind } from './classify.ts';
import { BoardError, bodyOf, CACHE_DIR, listSince, makeGet, SOURCE, viewUrl, type Get, type NoticeRow } from './cse.ts';
import { deadlineOf, readDates, stripDates } from './deadline.ts';
import { fromLlm, LLM_LOW, LLM_ROUTE, makeAsk, type Ask, type LlmStats } from './llm.ts';

export type Opportunity = {
  id: string; title: string; url: string; postedAt: string; host: string | null; kind: Kind;
  deadline: string | null; rule: string; deadlineRule: string | null;
};
export type ReviewItem = { id: string; title: string; url: string; postedAt: string; why: string };
export type Judgement =
  | ({ verdict: 'opportunity' } & Opportunity)
  | ({ verdict: 'review' } & ReviewItem)
  | { verdict: 'not'; id: string; rule: string };
export type ResultFile = { source: string; collectedAt: string; since: string; opportunities: Opportunity[]; review: ReviewItem[] };
export type Summary = { fetched: number; opportunity: number; not: number; review: number; merged: number; deadlineBlank: number };

export const OUT_FILE = fileURLToPath(new URL('../out/cse-notices.json', import.meta.url));

/** 글 하나를 판정한다. 본문을 받지 못했으면 제목과 상관없이 확인 필요다(FR-027).
 *  LLM 판정(llm)이 있으면 규칙 판정 대신 쓰고, 마감은 그 종류로 다시 정한다(스펙 2 FR-007).
 *  주최는 LLM이 정한 기회도 제목 규칙 값이다(스펙 2 FR-001, 2026-11-10 결정) */
export function judge(row: NoticeRow, lines: string[] | null, llm?: Judged): Judgement {
  const id = `cse:${row.no}`;
  const base = { id, title: row.title, url: viewUrl(row.no), postedAt: row.postedAt };
  if (!lines) return { verdict: 'review', ...base, why: '본문 못 받음' };
  const c = llm ?? classify(row.title, row.board);
  if (c.verdict === 'not') return { verdict: 'not', id, rule: c.rule };
  if (c.verdict === 'review') return { verdict: 'review', ...base, why: c.why };
  const d = deadlineOf(lines, row.title, row.postedAt, c.kind);
  return { verdict: 'opportunity', ...base, host: hostOf(row.title), kind: c.kind, deadline: d?.date ?? null, rule: c.rule, deadlineRule: d?.rule ?? null };
}

/** 규칙으로 판정하고, 보낼 글(route)은 LLM에 한 번에 하나씩 묻는다. lines[i]는 rows[i]의 본문이고 결과도 rows 순서다.
 *  ask가 없으면 규칙만 쓴다. LLM이 실패하거나 서버에 닿지 못한 글은 규칙 결과다(스펙 2 FR-012·FR-013) */
export async function judgeAll(rows: NoticeRow[], lines: (string[] | null)[], ask?: Ask, route = LLM_ROUTE, low = LLM_LOW): Promise<{ judged: Judgement[]; llm: LlmStats | null }> {
  if (!ask) return { judged: rows.map((r, i) => judge(r, lines[i])), llm: null };
  const llm: LlmStats = { model: ask.model, cached: 0, fresh: 0, failed: 0, skipped: 0 };
  const sent = rows.map((r, i) => lines[i] !== null && (route === 'all' || classify(r.title, r.board).verdict === 'review'));
  const total = sent.filter(Boolean).length;
  const judged: Judgement[] = [];
  let asked = 0;
  for (const [i, r] of rows.entries()) {
    const body = lines[i];
    if (!sent[i] || !body) {
      judged.push(judge(r, body));
      continue;
    }
    const o = await ask(r, body);
    if (o === 'down') llm.skipped++;
    else if (o === 'fail') llm.failed++;
    else if (o.cached) llm.cached++;
    else llm.fresh++;
    judged.push(judge(r, body, typeof o === 'object' ? fromLlm(o.answer, ask.model, low) : undefined));
    if (++asked % 20 === 0 || asked === total) console.error(`LLM ${asked}/${total}`);
  }
  return { judged, llm };
}

const newestFirst = (a: { id: string }, b: { id: string }) => Number(b.id.slice(4)) - Number(a.id.slice(4));

/** 판정을 결과 파일과 요약으로. 날짜 표기만 다르고 마감이 같은 기회(다시 올린 공지)는 최근 글 하나만 남긴다 */
export function buildResult(judged: Judgement[], opts: { since: string; collectedAt: string; fetched: number }): { file: ResultFile; summary: Summary } {
  const all: Opportunity[] = [];
  const review: ReviewItem[] = [];
  let not = 0;
  for (const j of judged) {
    if (j.verdict === 'not') not++;
    else if (j.verdict === 'review') { const { verdict: _, ...r } = j; review.push(r); }
    else { const { verdict: _, ...o } = j; all.push(o); }
  }
  // ponytail: 제목에서 날짜와 빈칸을 뺀 글자 + 마감이 같으면 같은 공지로 본다. 다른 공지가 합쳐지는 일이 정답셋에서 보이면 열쇠를 좁힌다
  const seen = new Set<string>();
  const opportunities = all.sort(newestFirst).filter(o => {
    if (!o.deadline) return true;
    // 날짜를 지운 자리의 빈칸은 표기마다 달라서('채용 (~9/21월…)'·'채용(~9/21(월)…)') 열쇠에서 뺀다
    const key = `${stripDates(o.title).replace(/\s+/g, '')}|${o.deadline}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    file: { source: SOURCE, collectedAt: opts.collectedAt, since: opts.since, opportunities, review: review.sort(newestFirst) },
    summary: {
      fetched: opts.fetched, opportunity: opportunities.length, not, review: review.length,
      merged: all.length - opportunities.length, deadlineBlank: opportunities.filter(o => !o.deadline).length
    }
  };
}

export const llmPart = (l: LlmStats) => `LLM 판정 ${l.cached + l.fresh}(보관 ${l.cached} · 새로 ${l.fresh} · 실패 ${l.failed})`;

/** LLM을 썼으면 끝에 LLM 수를 붙이고, 서버에 닿지 못해 규칙만 쓴 글(K)이 있으면 다음 줄에 알린다(스펙 2 FR-012·FR-016) */
export function formatSummary(s: Summary, llm?: LlmStats | null): string {
  const line = `새 글 ${s.fetched} · 기회 ${s.opportunity} · 기회 아님 ${s.not} · 확인 필요 ${s.review} · 합친 중복 ${s.merged} · 마감 빈칸 ${s.deadlineBlank}`;
  if (!llm) return line;
  const head = `${line} · ${llmPart(llm)}`;
  return llm.skipped ? `${head}\nLLM에 연결하지 못해 ${llm.skipped}건은 규칙만 썼어요 (${llm.model})` : head;
}

/** 기준일 안 글과 그 본문. fetched는 이번에 새로 받아 보관한 본문 수다 */
export async function collect(since: string, get: Get, dir = CACHE_DIR) {
  const rows = await listSince(since, get);
  console.error(`목록 ${rows.length}건 (기준일 ${since})`);
  const bodies = new Map<number, string[] | null>();
  let tried = 0;
  let regionless = 0;
  let fetched = 0;
  for (const [i, r] of rows.entries()) {
    const b = await bodyOf(r.no, get, dir);
    if (b.fetched || !b.lines) tried++; // 보관함에 없어서 서버에 물은 글
    if (b.fetched && !b.lines) regionless++;
    if (b.fetched && b.lines) fetched++;
    bodies.set(r.no, b.lines);
    if ((i + 1) % 20 === 0 || i + 1 === rows.length) console.error(`본문 ${i + 1}/${rows.length}`);
  }
  // 한 건은 그 글 탓일 수 있지만, 새로 물은 본문이 두 건 이상인데 하나도 못 얻었으면 게시판 모양이나 연결이 문제다(FR-026).
  // 그대로 쓰면 이전 결과가 '본문 못 받음'뿐인 파일로 바뀐다
  // ponytail: 본문 영역이 영영 없는 글은 보관하지 않아 실행마다 다시 묻는다. 그런 글이 기간 안에 두 건 넘게 있으면 새 글이 없는 날 멈춘다. 생기면 보관함에 빈 표시를 남긴다
  // ponytail: 다 받은 뒤에 판단해서 구조가 바뀐 날에는 새 글 수만큼 헛요청이 간다. 90일치(약 150건)라 그대로 둔다
  if (tried >= 2 && fetched === 0) {
    throw new BoardError(regionless
      ? `게시판 구조가 바뀐 것 같아요: 새로 받은 본문 ${regionless}건에서 본문 영역을 못 찾았어요.`
      : `본문을 하나도 받지 못했어요 (${tried}건 모두 실패).`);
  }
  return { rows, bodies, fetched };
}

/** 반쪽 파일이 남지 않게 .tmp에 다 쓴 뒤 이름을 바꾼다(같은 폴더 안 이름 바꾸기는 한 번에 일어난다) */
export function writeResult(path: string, file: ResultFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, `${JSON.stringify(file, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

/** 달력에 있는 YYYY-MM-DD인가('2026-02-30'은 아니다) */
export const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && readDates(s, s)[0] === s;

/** 컴퓨터 날짜로 n일 전 */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 종료 코드를 돌려준다: 0 성공, 1 게시판 문제(결과 파일은 그대로), 2 잘못된 인자(contracts/cli.md).
 *  ask는 바깥에서 넣는다. 실제 LLM은 아래 import.meta.main 줄에서만 만들어 검사가 Ollama를 부르지 않는다 */
export async function main(args: string[], get: Get, out = OUT_FILE, dir = CACHE_DIR, ask?: Ask): Promise<number> {
  const arg = args[0];
  if (args.length > 1 || (arg !== undefined && !isDay(arg))) {
    console.error(`기준일은 YYYY-MM-DD 꼴로 주세요: ${args.join(' ')}`);
    return 2;
  }
  const since = arg ?? daysAgo(90);
  try {
    const { rows, bodies, fetched } = await collect(since, get, dir);
    const { judged, llm } = await judgeAll(rows, rows.map(r => bodies.get(r.no) ?? null), ask);
    const { file, summary } = buildResult(judged, { since, collectedAt: new Date().toISOString(), fetched });
    writeResult(out, file);
    console.log(formatSummary(summary, llm));
    return 0;
  } catch (e) {
    if (!(e instanceof BoardError)) throw e;
    console.error(`${e.message} 이전 결과는 그대로예요.`);
    return 1;
  }
}

// 경로에 심볼릭 링크가 있어도 진입점을 알아본다(process.argv[1]과 import.meta.url 비교는 링크를 다르게 풀어 조용히 아무것도 안 한다)
if (import.meta.main) process.exitCode = await main(process.argv.slice(2), makeGet(), OUT_FILE, CACHE_DIR, makeAsk());
