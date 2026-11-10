import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardError, listUrl, SOURCE, viewUrl, type Get, type NoticeRow } from './cse.ts';
import type { Ask, LlmOutcome } from './llm.ts';
import { buildResult, collect, formatSummary, judge, judgeAll, main, writeResult } from './run.ts';

const row = (no: number, title: string, postedAt: string, board = '채용/모집'): NoticeRow => ({ no, title, board, postedAt, pinned: false });
const DONGJIN = '[동진쎄미켐] 2026년 11월 신입/경력 정기채용 (~11/15(일))';
/** 직접 만든 본문 줄(제목줄 다음 줄에 기간) */
const BODY = ['◆ 접수기간', '11/09(월) ~ 11/15(일) 18:00'];

describe('judge', () => {
  it('기회는 주최·종류·마감과 두 근거를 갖는다', () => {
    expect(judge(row(228201, DONGJIN, '2026-11-06'), BODY)).toEqual({
      verdict: 'opportunity', id: 'cse:228201', title: DONGJIN, url: viewUrl(228201), postedAt: '2026-11-06',
      host: '동진쎄미켐', kind: 'job', deadline: '2026-11-15', rule: '제목: 채용', deadlineRule: '본문: 접수기간'
    });
  });

  it('기회 아님, 확인 필요, 본문 못 받음', () => {
    expect(judge(row(1, '2026학년도 2학기 성적우수장학금 안내', '2026-10-19', '장학'), [])).toEqual({ verdict: 'not', id: 'cse:1', rule: '기회 아님: 성적우수' });
    expect(judge(row(2, '[SK그룹] Pre-SKALA 참여자 모집 (~10/14 09시까지)', '2026-09-29'), [])).toEqual({
      verdict: 'review', id: 'cse:2', title: '[SK그룹] Pre-SKALA 참여자 모집 (~10/14 09시까지)', url: viewUrl(2), postedAt: '2026-09-29', why: '규칙에 안 걸림 (채용/모집)'
    });
    expect(judge(row(3, DONGJIN, '2026-11-06'), null)).toMatchObject({ verdict: 'review', why: '본문 못 받음' });
  });
});

describe('buildResult', () => {
  const ssafy = '취업역량과 AI 활용역량을 한 번에! SSAFY 16기 모집';
  const kb = (part: string) => `[KB국민은행] 2026 하계 체험형 인턴 모집(${part}) (~6/24)`;
  const judged = [
    judge(row(216747, `${ssafy} (~5/11)`, '2026-04-23'), []),
    judge(row(217063, `${ssafy} (~5/11월)`, '2026-04-29'), []),
    judge(row(219217, kb('디지털부문'), '2026-06-16'), []),
    judge(row(219219, kb('AI·플랫폼개발부문'), '2026-06-16'), []),
    judge(row(219218, kb('IT부문'), '2026-06-16'), []),
    judge(row(900, 'SKKU AI Colloquium 2026', '2026-10-28', '행사/세미나'), []),
    judge(row(901, 'SKKU AI Colloquium 2026', '2026-10-29', '행사/세미나'), []),
    judge(row(1, '2026학년도 2학기 성적우수장학금 안내', '2026-10-19', '장학'), []),
    judge(row(2, '[SK그룹] Pre-SKALA 참여자 모집 (~10/14 09시까지)', '2026-09-29'), [])
  ];
  const { file, summary } = buildResult(judged, { since: '2026-04-01', collectedAt: '2026-11-07T12:00:00.000Z', fetched: 3 });

  it('날짜 표기만 다르고 마감이 같은 기회는 최근 글 하나만 남기고, 부문이 다르거나 마감이 없으면 합치지 않는다', () => {
    expect(file.opportunities.map(o => o.id)).toEqual(['cse:219219', 'cse:219218', 'cse:219217', 'cse:217063', 'cse:901', 'cse:900']);
    expect(file.review.map(r => r.id)).toEqual(['cse:2']);
  });

  it('요약 수는 서로 맞고 정해진 꼴로 찍힌다', () => {
    expect(summary).toEqual({ fetched: 3, opportunity: 6, not: 1, review: 1, merged: 1, deadlineBlank: 2 });
    expect(summary.opportunity + summary.not + summary.review + summary.merged).toBe(judged.length);
    expect(formatSummary(summary)).toBe('새 글 3 · 기회 6 · 기회 아님 1 · 확인 필요 1 · 합친 중복 1 · 마감 빈칸 2');
  });

  it('결과 파일은 계약 모양 그대로다', () => {
    expect(Object.keys(file)).toEqual(['source', 'collectedAt', 'since', 'opportunities', 'review']);
    expect(file.source).toBe(SOURCE);
    for (const o of file.opportunities) {
      expect(Object.keys(o)).toEqual(['id', 'title', 'url', 'postedAt', 'host', 'kind', 'deadline', 'rule', 'deadlineRule']);
      expect(o.url).toBe(viewUrl(Number(o.id.slice(4))));
      expect(o.rule).toMatch(/^(제목|게시판): /);
      expect(o.deadline === null).toBe(o.deadlineRule === null);
    }
    for (const r of file.review) expect(Object.keys(r)).toEqual(['id', 'title', 'url', 'postedAt', 'why']);
  });

  it('날짜를 지운 제목이 빈칸만 다르게 남아도 다시 올린 공지로 합친다', () => {
    const { file: f, summary: s } = buildResult([
      judge(row(224820, '[현대해상] 2026 현대해상 대졸 신입사원 채용 (~9/21월 18시까지)', '2026-09-08'), []),
      judge(row(225573, '[현대해상] 2026 현대해상 대졸 신입사원 채용(~9/21(월)까지)', '2026-09-15'), [])
    ], { since: '2026-08-01', collectedAt: '2026-11-07T12:00:00.000Z', fetched: 0 });
    expect(f.opportunities.map(o => [o.id, o.deadline])).toEqual([['cse:225573', '2026-09-21']]);
    expect(s.merged).toBe(1);
  });
});

// 가짜 게시판: 첫 쪽에 글 목록(모두 2026-11-01)과 기준일보다 오래된 글(99번) 하나, 본문은 body(no). 실제 본문은 쓰지 않는다
const OK_BODY = '<div class="fr-view"><p>■ 접수기간: 11/3 ~ 11/14</p></div>';
const NO_BODY = '<p>잘못된 접근이에요</p>';
function fakeBoard(nos: number[], body: (no: number) => string = () => OK_BODY) {
  const views: number[] = [];
  const item = (n: number, day: string) =>
    `<dl class="board-list-content-wrap"><dt><span class="c-board-list-category">[채용/모집]</span>` +
    `<a href="?mode=view&amp;articleNo=${n}">[회사${n}] 인턴 채용</a></dt><dd><ul><li>No.${n}</li><li>${day}</li></ul></dd></dl>`;
  const get: Get = async url => {
    const no = Number(url.match(/articleNo=(\d+)/)?.[1]);
    if (no) {
      views.push(no);
      return `<html><body>${body(no)}</body></html>`;
    }
    if (url !== listUrl(0)) throw new Error(`첫 쪽에서 멈춰야 하는데 다음 쪽을 읽었다: ${url}`);
    return `<html><body>${[...nos.map(n => item(n, '2026-11-01')), item(99, '2026-01-01')].join('')}</body></html>`;
  };
  return { get, views };
}
const refuse = () => { throw new Error('HTTP 403'); };
const tmp = () => mkdtempSync(join(tmpdir(), 'cse-run-'));
const quiet = () => ({
  err: vi.spyOn(console, 'error').mockImplementation(() => {}),
  log: vi.spyOn(console, 'log').mockImplementation(() => {})
});
const caught = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

describe('collect', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('보관한 본문은 다시 받지 않고 새 글 본문만 받는다', async () => {
    quiet();
    const dir = tmp();
    expect((await collect('2026-10-01', fakeBoard([2, 1]).get, dir)).fetched).toBe(2);
    const same = fakeBoard([2, 1]);
    expect((await collect('2026-10-01', same.get, dir)).fetched).toBe(0);
    expect(same.views).toEqual([]);
    const more = fakeBoard([3, 2, 1]);
    expect((await collect('2026-10-01', more.get, dir)).fetched).toBe(1);
    expect(more.views).toEqual([3]);
  });

  it('새로 받은 본문 2건 이상에 모두 본문 영역이 없으면 구조가 바뀐 것으로 보고 멈춘다', async () => {
    quiet();
    const err = await caught(collect('2026-10-01', fakeBoard([2, 1], () => NO_BODY).get, tmp()));
    expect(err).toBeInstanceOf(BoardError);
    expect((err as Error).message).toBe('게시판 구조가 바뀐 것 같아요: 새로 받은 본문 2건에서 본문 영역을 못 찾았어요.');
  });

  it('새로 받으려던 본문이 한 건뿐이면 본문 영역이 없어도 멈추지 않는다(두 건부터 본다)', async () => {
    quiet();
    const dir = tmp();
    await collect('2026-10-01', fakeBoard([1]).get, dir);
    const { bodies, fetched } = await collect('2026-10-01', fakeBoard([2, 1], () => NO_BODY).get, dir);
    expect(bodies.get(2)).toBeNull();
    expect(bodies.get(1)).toEqual(['■ 접수기간: 11/3 ~ 11/14']);
    expect(fetched).toBe(0);
  });

  it('새로 받으려던 본문 요청이 모두 실패하면 받은 본문이 없다고 멈춘다', async () => {
    quiet();
    const err = await caught(collect('2026-10-01', fakeBoard([2, 1], refuse).get, tmp()));
    expect(err).toBeInstanceOf(BoardError);
    expect((err as Error).message).toBe('본문을 하나도 받지 못했어요 (2건 모두 실패).');
  });

  it('본문 영역이 없는 글이 한 건이면 그 글만 비우고 보관하지 않는다', async () => {
    quiet();
    const dir = tmp();
    const { bodies, fetched } = await collect('2026-10-01', fakeBoard([3, 2, 1], no => (no === 2 ? NO_BODY : OK_BODY)).get, dir);
    expect(bodies.get(2)).toBeNull();
    expect(bodies.get(3)).toEqual(['■ 접수기간: 11/3 ~ 11/14']);
    expect(fetched).toBe(2);
    expect(existsSync(join(dir, '2.html'))).toBe(false);
  });
});

describe('writeResult', () => {
  const file = (collectedAt: string) =>
    buildResult([judge(row(228201, DONGJIN, '2026-11-06'), BODY)], { since: '2026-08-09', collectedAt, fetched: 1 }).file;

  it('.tmp에 다 쓴 뒤 이름을 바꿔서 .tmp가 남지 않는다', () => {
    const out = join(tmp(), 'out', 'cse-notices.json');
    writeResult(out, file('2026-11-07T12:00:00.000Z'));
    expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual(file('2026-11-07T12:00:00.000Z'));
    expect(readFileSync(out, 'utf8').endsWith('}\n')).toBe(true);
    expect(existsSync(`${out}.tmp`)).toBe(false);
  });

  it('쓰다가 실패하면 기존 파일이 그대로다', () => {
    const out = join(tmp(), 'cse-notices.json');
    writeFileSync(out, 'previous');
    mkdirSync(`${out}.tmp`); // .tmp 자리에 폴더가 있으면 쓰기가 실패한다
    expect(() => writeResult(out, file('2026-11-07T12:00:00.000Z'))).toThrow();
    expect(readFileSync(out, 'utf8')).toBe('previous');
  });

  it('같은 입력이면 수집 시각 줄만 다르다', () => {
    const dir = tmp();
    writeResult(join(dir, 'a.json'), file('2026-11-07T12:00:00.000Z'));
    writeResult(join(dir, 'b.json'), file('2026-11-08T09:30:00.000Z'));
    const a = readFileSync(join(dir, 'a.json'), 'utf8').split('\n');
    const b = readFileSync(join(dir, 'b.json'), 'utf8').split('\n');
    expect(a.length).toBe(b.length);
    expect(a.filter((line, i) => line !== b[i])).toEqual(['  "collectedAt": "2026-11-07T12:00:00.000Z",']);
  });
});

describe('main', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('기준일 꼴이 틀리면 요청 없이 2로 끝난다', async () => {
    const { err } = quiet();
    const get = vi.fn<Get>();
    const dir = tmp();
    expect(await main(['2026/04/01'], get, join(dir, 'cse-notices.json'), dir)).toBe(2);
    expect(err).toHaveBeenCalledWith('기준일은 YYYY-MM-DD 꼴로 주세요: 2026/04/01');
    expect(await main(['2026-02-30'], get, join(dir, 'cse-notices.json'), dir)).toBe(2);
    expect(await main(['2026-10-01', '2026-11-01'], get, join(dir, 'cse-notices.json'), dir)).toBe(2);
    expect(err).toHaveBeenLastCalledWith('기준일은 YYYY-MM-DD 꼴로 주세요: 2026-10-01 2026-11-01');
    expect(get).not.toHaveBeenCalled();
  });

  it('목록을 못 받으면 1로 끝나고 이전 결과 파일은 그대로다', async () => {
    const { err, log } = quiet();
    const dir = tmp();
    const out = join(dir, 'cse-notices.json');
    writeFileSync(out, 'previous');
    expect(await main(['2026-10-01'], async () => { throw new Error('HTTP 503'); }, out, dir)).toBe(1);
    expect(err).toHaveBeenLastCalledWith('목록을 받지 못했어요 (0번째부터): 응답 코드 503. 이전 결과는 그대로예요.');
    expect(readFileSync(out, 'utf8')).toBe('previous');
    expect(log).not.toHaveBeenCalled();
  });

  it('본문을 하나도 받지 못하면 1로 끝나고 이전 결과 파일은 한 바이트도 바뀌지 않는다', async () => {
    const { err, log } = quiet();
    const dir = tmp();
    const out = join(dir, 'cse-notices.json');
    writeFileSync(out, '{"previous": true}\n');
    expect(await main(['2026-10-01'], fakeBoard([2, 1], refuse).get, out, join(dir, 'cache'))).toBe(1);
    expect(err).toHaveBeenLastCalledWith('본문을 하나도 받지 못했어요 (2건 모두 실패). 이전 결과는 그대로예요.');
    expect(readFileSync(out, 'utf8')).toBe('{"previous": true}\n');
    expect(log).not.toHaveBeenCalled();
  });

  it('성공하면 결과 파일을 쓰고 표준 출력에 요약 한 줄을 찍고 0으로 끝난다', async () => {
    const { log } = quiet();
    const dir = tmp();
    const out = join(dir, 'out', 'cse-notices.json');
    expect(await main(['2026-10-01'], fakeBoard([2, 1]).get, out, join(dir, 'cache'))).toBe(0);
    expect(log.mock.calls).toEqual([['새 글 2 · 기회 2 · 기회 아님 0 · 확인 필요 0 · 합친 중복 0 · 마감 빈칸 0']]);
    expect(JSON.parse(readFileSync(out, 'utf8'))).toMatchObject({ since: '2026-10-01', opportunities: [{ id: 'cse:2' }, { id: 'cse:1' }] });
  });
});

// 스펙 2: 로컬 LLM 판정. LLM은 가짜 Ask로 바꿔 넣고 실제 Ollama는 부르지 않는다
describe('judge: LLM 판정 (스펙 2)', () => {
  it('LLM 판정이 있으면 규칙 대신 쓰고, 주최는 제목 규칙 값, 마감은 LLM 종류로 다시 정한다', () => {
    const r = row(5, '[가나다] 진로 캠프 안내', '2026-11-01', '행사/세미나');
    const lines = ['▶ 일시: 11월 20일(금) 14:00'];
    expect(judge(r, lines)).toMatchObject({ kind: 'edu', host: '가나다', deadline: null, rule: '제목: 캠프' });
    expect(judge(r, lines, { verdict: 'opportunity', kind: 'lecture', rule: 'LLM: m' })).toMatchObject({
      kind: 'lecture', host: '가나다', rule: 'LLM: m', deadline: '2026-11-20', deadlineRule: '행사 날: 본문'
    });
    expect(judge(r, lines, { verdict: 'not', rule: 'LLM: m' })).toEqual({ verdict: 'not', id: 'cse:5', rule: 'LLM: m' });
    expect(judge(r, null, { verdict: 'not', rule: 'LLM: m' })).toMatchObject({ verdict: 'review', why: '본문 못 받음' });
  });
});

describe('judgeAll (스펙 2)', () => {
  const SKALA = '[SK그룹] Pre-SKALA 참여자 모집 (~10/14 09시까지)';
  const R = [row(1, SKALA, '2026-09-29'), row(2, DONGJIN, '2026-11-06'), row(3, '[가나다] 인턴 모집', '2026-11-01')];
  const O: LlmOutcome = { answer: { verdict: 'O', kind: 'edu', host: 'SK그룹', sure: true }, cached: false };
  /** 글 번호별로 정해 둔 결과를 주는 가짜 Ask(없으면 'fail') */
  const fake = (outcomes: Record<number, LlmOutcome>): Ask & { mock: { calls: unknown[][] } } =>
    Object.assign(vi.fn(async (r: NoticeRow) => outcomes[r.no] ?? 'fail'), { model: 'm' });
  const S = { fetched: 1, opportunity: 2, not: 0, review: 1, merged: 0, deadlineBlank: 0 };
  const LINE = '새 글 1 · 기회 2 · 기회 아님 0 · 확인 필요 1 · 합친 중복 0 · 마감 빈칸 0';
  afterEach(() => { vi.restoreAllMocks(); });

  it('ask가 없으면 규칙만 쓰고 llm은 null이다', async () => {
    const lines = [[], BODY, []];
    expect(await judgeAll(R, lines)).toEqual({ judged: R.map((r, i) => judge(r, lines[i])), llm: null });
  });

  it('review 방식은 규칙이 확인 필요로 낸 글만, all은 본문을 받은 글을 모두 묻는다. 결과는 rows 순서다', async () => {
    quiet();
    const ask = fake({ 1: O });
    const a = await judgeAll(R, [[], BODY, null], ask, 'review');
    expect(ask.mock.calls).toHaveLength(1);
    expect(a.judged.map(j => j.id)).toEqual(['cse:1', 'cse:2', 'cse:3']);
    expect(a.judged[0]).toMatchObject({ verdict: 'opportunity', kind: 'edu', rule: 'LLM: m', host: 'SK그룹', deadline: '2026-10-14', deadlineRule: '제목' });
    expect(a.judged[1]).toMatchObject({ rule: '제목: 채용' });
    expect(a.judged[2]).toMatchObject({ verdict: 'review', why: '본문 못 받음' });
    expect(a.llm).toEqual({ model: 'm', cached: 0, fresh: 1, failed: 0, skipped: 0 });
    const all = fake({ 1: O, 2: { ...O, cached: true } });
    expect((await judgeAll(R, [[], BODY, null], all, 'all')).llm).toEqual({ model: 'm', cached: 1, fresh: 1, failed: 0, skipped: 0 });
    expect(all.mock.calls).toHaveLength(2); // 본문을 못 받은 3번은 묻지 않는다
  });

  it('확신 낮은 답은 low가 review면 확인 필요, accept면 그대로 판정이다', async () => {
    quiet();
    const unsure: LlmOutcome = { answer: { verdict: 'O', kind: 'edu', host: null, sure: false }, cached: false };
    expect((await judgeAll(R.slice(0, 1), [[]], fake({ 1: unsure }), 'review', 'review')).judged[0]).toMatchObject({ verdict: 'review', why: 'LLM 확신 낮음' });
    // LLM이 주최를 '없음'으로 답해도 결과의 주최는 제목 규칙 값이다
    expect((await judgeAll(R.slice(0, 1), [[]], fake({ 1: unsure }), 'review', 'accept')).judged[0]).toMatchObject({ verdict: 'opportunity', kind: 'edu', host: 'SK그룹' });
  });

  it('요약: LLM을 썼으면 끝에 수를 붙이고, 안 썼으면 스펙 1과 같은 한 줄이다', () => {
    expect(formatSummary(S)).toBe(LINE);
    expect(formatSummary(S, { model: 'm', cached: 3, fresh: 2, failed: 1, skipped: 0 })).toBe(`${LINE} · LLM 판정 5(보관 3 · 새로 2 · 실패 1)`);
  });

  it('서버에 닿지 못한 글(K)은 규칙 결과이고 K>0이면 요약 다음 줄에 알린다. 보관한 답과 글 실패는 따로 센다', async () => {
    quiet();
    const r = await judgeAll(R, [[], BODY, []], fake({ 1: { ...O, cached: true }, 3: 'down' }), 'all');
    expect(r.judged[0]).toMatchObject({ rule: 'LLM: m' });
    expect(r.judged[1]).toMatchObject({ rule: '제목: 채용' }); // 'fail' → 규칙
    expect(r.judged[2]).toMatchObject({ rule: '제목: 인턴' }); // 'down' → 규칙
    expect(r.llm).toEqual({ model: 'm', cached: 1, fresh: 0, failed: 1, skipped: 1 });
    expect(formatSummary(S, r.llm)).toBe(`${LINE} · LLM 판정 1(보관 1 · 새로 0 · 실패 1)\nLLM에 연결하지 못해 1건은 규칙만 썼어요 (m)`);
  });

  it('결과가 스펙 1 결과 파일 계약의 rule·deadlineRule 패턴을 지킨다(LLM 근거 포함)', async () => {
    quiet();
    const schema = JSON.parse(readFileSync(new URL('../../specs/20261107-193624-cse-notice-opportunities/contracts/cse-notices.schema.json', import.meta.url), 'utf8'));
    const props = schema.$defs.opportunity.properties;
    const rule = new RegExp(props.rule.pattern);
    const deadlineRule = new RegExp(props.deadlineRule.anyOf[0].pattern);
    const { judged } = await judgeAll(R, [[], BODY, []], fake({ 1: O, 3: { answer: { verdict: 'O', kind: 'lecture', host: null, sure: true }, cached: false } }), 'all');
    const opps = judged.filter(j => j.verdict === 'opportunity');
    expect(opps).toHaveLength(3);
    for (const o of opps) {
      expect(o.rule).toMatch(rule);
      if (o.deadlineRule !== null) expect(o.deadlineRule).toMatch(deadlineRule);
    }
  });

  it('main에 ask를 넣으면 요약에 LLM 수가 붙는다', async () => {
    const { log } = quiet();
    const dir = tmp();
    const job: LlmOutcome = { answer: { verdict: 'O', kind: 'job', host: null, sure: true }, cached: false };
    const ask = fake({ 1: job, 2: { ...job, cached: true } });
    expect(await main(['2026-10-01'], fakeBoard([2, 1]).get, join(dir, 'out.json'), join(dir, 'cache'), ask)).toBe(0);
    expect(ask.mock.calls).toHaveLength(2); // 기본은 '모든 글' 방식이라 본문을 받은 두 글을 모두 묻는다
    expect(log.mock.calls).toEqual([['새 글 2 · 기회 2 · 기회 아님 0 · 확인 필요 0 · 합친 중복 0 · 마감 빈칸 0 · LLM 판정 2(보관 1 · 새로 1 · 실패 0)']]);
  });
});
