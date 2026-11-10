import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Kind } from './classify.ts';
import type { Get, NoticeRow } from './cse.ts';
import { decodeCsv, main, parseGold, readCsv, sampleBySha1, score, writeCsv, type GoldRow } from './eval.ts';
import type { Ask, LlmOutcome } from './llm.ts';
import type { Judgement } from './run.ts';

const HEAD = ['링크', '게시판', '제목', '게시일', '기회', '종류', '마감', '주최', '확신', '메모'];
const link = (no: number) => `https://cse.skku.edu/cse/notice.do?mode=view&articleNo=${no}`;
const line = (no: number, o: string, kind = '', deadline = '', host = '', sure = '', postedAt = '2026-11-06') =>
  [link(no), '채용/모집', `제목 ${no}`, postedAt, o, kind, deadline, host, sure, ''];

describe('CSV', () => {
  it('쉼표·따옴표·줄바꿈이 든 칸이 그대로 돌아오고, BOM과 CRLF로 쓴다', () => {
    const rows = [HEAD, [link(1), '채용/모집', '제목, "따옴표"\n둘째 줄', '2026-11-06', 'O', '채용', '2026-11-15', '', '높음', '']];
    const text = writeCsv(rows);
    expect(text.startsWith('\uFEFF"링크","게시판"')).toBe(true);
    expect(text.split('\r\n')).toHaveLength(3);
    expect(readCsv(text)).toEqual(rows);
    expect(readCsv('링크,제목\nhttps://a,"가,나"\n')).toEqual([['링크', '제목'], ['https://a', '가,나']]);
  });

  it('UTF-8이 아니면 EUC-KR로 읽는다', () => {
    expect(decodeCsv(new Uint8Array([0xc7, 0xd1]))).toBe('한');
    expect(decodeCsv(new TextEncoder().encode('\uFEFF한'))).toBe('한');
  });
});

describe('parseGold', () => {
  it('스프레드시트가 바꾼 날짜 꼴, o·x, 한글 종류 이름, 없음·그림·첨부를 받는다', () => {
    const { gold, errors } = parseGold([
      HEAD,
      line(1, 'o', '채용', '2026/11/15', '동진쎄미켐', '높음'),
      line(2, 'O', '대회·공모전', '2026.11.15', '없음', '낮음'),
      line(3, 'O', '특강', '2026. 11. 15.'),
      line(4, 'O', '교육·캠프', '없음'),
      line(5, 'O', '장학', '그림·첨부'),
      line(6, 'x', '', '', '', '', '2026/11/6')
    ]);
    expect(errors).toEqual([]);
    expect(gold.map(g => [g.id, g.opportunity, g.kind, g.deadline, g.host, g.postedAt])).toEqual([
      ['cse:1', true, 'job', '2026-11-15', '동진쎄미켐', '2026-11-06'],
      ['cse:2', true, 'contest', '2026-11-15', null, '2026-11-06'],
      ['cse:3', true, 'lecture', '2026-11-15', null, '2026-11-06'],
      ['cse:4', true, 'edu', 'none', null, '2026-11-06'],
      ['cse:5', true, 'scholarship', 'image', null, '2026-11-06'],
      ['cse:6', false, null, null, null, '2026-11-06']
    ]);
    expect(gold[0]).toMatchObject({ board: '채용/모집', title: '제목 1' });
  });

  it('틀린 값을 모두 모아 행·칸·값으로 알린다', () => {
    const { errors } = parseGold([
      HEAD,
      line(1, 'O', '대회', '2026-11-15'),
      line(2, 'X', '채용'),
      line(3, 'O', '채용', ''),
      line(1, 'O', '채용', '없음'),
      ['https://example.com/?articleNo=9', '일반', '제목', '2026-11-06', 'O', '채용', '없음', '', '', ''],
      line(4, 'O', '채용', '11월 15일'),
      line(5, '예')
    ]);
    expect(errors).toEqual([
      '2행 종류: 대회 (모르는 종류예요. 쓸 수 있는 값: 채용, 특강, 해커톤, 대회·공모전, 교육·캠프, 동아리·학회, 봉사, 멘토링, 글로벌, 장학, 교과)',
      '3행 종류: 채용 (기회가 X면 종류를 비워 주세요)',
      '4행 마감: 빈칸 (기회가 O면 날짜, 없음, 그림·첨부 중 하나를 적어 주세요)',
      `5행 링크: ${link(1)} (2행과 같은 글이에요)`,
      '6행 링크: https://example.com/?articleNo=9 (https://cse.skku.edu/cse/notice.do?mode=view&articleNo=<글번호> 꼴로 적어 주세요)',
      '7행 마감: 11월 15일 (날짜는 2026-11-15처럼 써 주세요)',
      '8행 기회: 예 (O나 X로 적어 주세요)'
    ]);
  });

  it('머리글이 빠지면 그 이름을 알린다', () => {
    expect(parseGold([HEAD.filter(h => h !== '확신'), line(1, 'X')]).errors).toEqual(['1행 머리글: 확신 (이 이름의 칸이 없어요)']);
  });
});

describe('score', () => {
  const g = (no: number, kind: Kind | null, deadline: GoldRow['deadline'] = null, host: string | null = null): GoldRow =>
    ({ id: `cse:${no}`, board: '', title: `제목 ${no}`, postedAt: '2026-09-01', opportunity: kind !== null, kind, deadline, host });
  const base = (no: number) => ({ id: `cse:${no}`, title: `제목 ${no}`, url: link(no), postedAt: '2026-09-01' });
  const opp = (no: number, kind: Kind, deadline: string | null = null, host: string | null = null): Judgement =>
    ({ verdict: 'opportunity', ...base(no), host, kind, deadline, rule: `제목: ${kind}`, deadlineRule: deadline ? '제목' : null });
  const not = (no: number): Judgement => ({ verdict: 'not', id: `cse:${no}`, rule: '기회 아님: 결과 안내' });
  const review = (no: number): Judgement => ({ verdict: 'review', ...base(no), why: '규칙에 안 걸림 (채용/모집)' });

  // 손으로 센 10줄: 줄마다 어느 지표의 분자·분모에 들어가는지 주석에 적었다
  const pairs: [GoldRow, Judgement][] = [
    [g(1, 'job', '2026-11-15', '동진쎄미켐'), opp(1, 'job', '2026-11-15', '동진쎄미켐')], // 모두 맞음
    [g(2, 'lecture', '2026-09-30'), opp(2, 'lecture', '2026-09-29', 'AI중심대학사업단')], // 마감 틀림, 주최 틀림(정답 없음)
    [g(3, 'edu', 'none', 'SK그룹'), opp(3, 'edu', '2026-05-11')], // 정답 '없음'인데 채움 → 마감 틀림, 주최 못 채움
    [g(4, 'contest', 'image', ' KB  국민은행 '), opp(4, 'lecture', null, 'KB 국민은행')], // 종류 틀림, 주최는 공백 정리 후 같음
    [g(5, 'job', '2026-10-01', '뷰웍스'), opp(5, 'job')], // 마감 못 채움
    [g(6, 'scholarship', '2026-10-06'), not(6)], // 기회 놓침
    [g(7, null), not(7)],
    [g(8, null), opp(8, 'lecture')], // 기회 아닌데 기회
    [g(9, 'job', '2026-10-14'), review(9)],
    [g(10, null), review(10)]
  ];
  const metrics = score(pairs.map(p => p[0]), pairs.map(p => p[1]));
  const byName = (name: string) => metrics.find(m => m.name === name);

  it('지표 7개와 주최 채움의 분자·분모가 정의대로다', () => {
    expect(metrics.map(m => [m.name, m.num, m.den])).toEqual([
      ['기회 여부', 6, 8], ['기회 놓침', 1, 7], ['종류', 4, 5], ['마감 정확', 1, 3], ['마감 채움', 2, 3],
      ['주최', 2, 3], ['확인 필요', 2, 10], ['주최 채움(참고)', 2, 4]
    ]);
    expect(metrics.map(m => m.pass)).toEqual([false, false, false, false, false, false, false, null]);
  });

  it('항목별로 틀린 글을 규칙 값·정답 값·근거와 함께 낸다', () => {
    expect(byName('종류')?.wrong).toEqual([{ id: 'cse:4', title: '제목 4', rule: 'lecture', gold: 'contest', why: '제목: lecture' }]);
    expect(byName('기회 놓침')?.wrong).toEqual([{ id: 'cse:6', title: '제목 6', rule: 'X', gold: 'O', why: '기회 아님: 결과 안내' }]);
    expect(byName('마감 정확')?.wrong.map(w => [w.id, w.rule, w.gold])).toEqual([['cse:2', '2026-09-29', '2026-09-30'], ['cse:3', '2026-05-11', '없음']]);
    expect(byName('마감 채움')?.wrong.map(w => [w.id, w.rule, w.gold])).toEqual([['cse:5', '빈칸', '2026-10-01']]);
    expect(byName('확인 필요')?.wrong.map(w => w.id)).toEqual(['cse:9', 'cse:10']);
  });

  it('분모가 0이면 해당 없음이고 판정하지 않는다', () => {
    expect(score([], []).map(m => [m.value, m.pass])).toEqual(Array(8).fill([null, null]));
  });

  it('기준 경계값을 정수로 비교한다(19/20 = 95%는 통과)', () => {
    const ok = Array.from({ length: 20 }, (_, i) => i + 1);
    const m = score(ok.map(no => g(no, 'job')), ok.map(no => (no === 20 ? not(no) : opp(no, 'job'))));
    expect(m[0]).toMatchObject({ name: '기회 여부', num: 19, den: 20, pass: true });
  });
});

describe('sampleBySha1', () => {
  it('입력 순서를 섞어도 같은 n개를 고른다', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `cse:${220000 + i}`);
    const picked = sampleBySha1(ids, 7);
    expect(picked).toHaveLength(7);
    expect([...sampleBySha1([...ids].reverse(), 7)].sort()).toEqual([...picked].sort());
  });
});

describe('main', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  const tmp = () => mkdtempSync(join(tmpdir(), 'cse-eval-'));
  const quiet = () => ({
    err: vi.spyOn(console, 'error').mockImplementation(() => {}),
    log: vi.spyOn(console, 'log').mockImplementation(() => {})
  });
  // 가짜 게시판: 첫 쪽에 1·2번 글과 기준일보다 오래된 99번 글. 본문은 직접 만든 줄이다
  const item = (no: number, board: string, title: string, day: string) =>
    `<dl class="board-list-content-wrap"><dt><span class="c-board-list-category">[${board}]</span>` +
    `<a href="?mode=view&amp;articleNo=${no}">${title}</a></dt><dd><ul><li>No.${no}</li><li>${day}</li></ul></dd></dl>`;
  const JOB = '[회사1] 인턴 채용';
  const GRAD = '[졸업평가] 연구논문작품 최종자료 제출 안내';
  const LIST = `<html><body>${item(2, '학사', GRAD, '2026-11-02')}${item(1, '채용/모집', JOB, '2026-11-01')}${item(99, '일반', '옛 글', '2026-01-01')}</body></html>`;
  const VIEW = '<html><body><div class="fr-view"><p>◆ 접수기간: 11/3 ~ 11/14</p></div></body></html>';
  const board = (fail: number[] = []): Get => async url => {
    if (url.includes('mode=list')) return LIST;
    if (fail.includes(Number(url.match(/articleNo=(\d+)/)?.[1]))) throw new Error('HTTP 503');
    return VIEW;
  };
  const LABELS = [
    [link(2), '학사', GRAD, '2026-11-02', 'X', '', '', '', '', ''],
    [link(1), '채용/모집', JOB, '2026-11-01', 'O', '채용', '2026-11-14', '회사1', '높음', '']
  ];
  const csv = (rows: string[][]) => {
    const path = join(tmp(), 'gold.csv');
    writeFileSync(path, writeCsv([HEAD, ...rows]));
    return path;
  };

  it('new: 본문을 모두 보관하고 라벨 칸이 빈 초안을 쓴다', async () => {
    quiet();
    const [gold, cache] = [tmp(), tmp()];
    expect(await main(['new', '2026-10-01', '2026-11-30'], board(), gold, cache)).toBe(0);
    const rows = readCsv(decodeCsv(readFileSync(join(gold, 'draft-2026-10-01-2026-11-30.csv'))));
    expect(rows.map(r => r[0])).toEqual(['링크', link(2), link(1)]);
    expect(existsSync(join(cache, '1.html')) && existsSync(join(cache, '2.html'))).toBe(true);
  });

  it('new: 본문을 하나라도 못 받으면 초안을 쓰지 않고 1로 끝난다', async () => {
    const { err } = quiet();
    const gold = tmp();
    expect(await main(['new', '2026-10-01', '2026-11-30'], board([2]), gold, tmp())).toBe(1);
    expect(err).toHaveBeenLastCalledWith('본문 1건을 받지 못해 초안을 쓰지 않았어요 (글 번호 2). 다시 실행하면 받아 둔 본문은 건너뛰어요.');
    expect(readdirSync(gold)).toEqual([]);
  });

  it('new: 시작일이 끝날보다 늦으면 쓰는 법을 보이고 2로 끝난다', async () => {
    const { err } = quiet();
    const get = vi.fn<Get>();
    expect(await main(['new', '2026-11-30', '2026-10-01'], get, tmp(), tmp())).toBe(2);
    expect(String(err.mock.calls[0][0])).toMatch(/^쓰는 법: /);
    expect(get).not.toHaveBeenCalled();
  });

  it('비교: 정답셋에 글이 없으면 2로 끝난다(아무것도 재지 않고 통과하지 않는다)', async () => {
    const { err } = quiet();
    const path = csv([]);
    expect(await main([path], vi.fn<Get>(), tmp(), tmp())).toBe(2);
    expect(err).toHaveBeenLastCalledWith(`정답셋에 글이 없어요: ${path}`);
  });

  it('비교: 본문을 못 읽은 글이 있으면 점수를 내지 않고 1로 끝난다', async () => {
    const { err, log } = quiet();
    expect(await main([csv(LABELS)], board([1]), tmp(), tmp())).toBe(1);
    expect(err).toHaveBeenLastCalledWith('본문 1건을 읽지 못해 비교하지 않았어요 (글 번호 1).');
    expect(log).not.toHaveBeenCalled();
  });

  it('비교: 보관한 본문만으로 판정해 지표 표를 찍고, 기준을 모두 넘기면 0으로 끝난다', async () => {
    const { log } = quiet();
    const cache = tmp();
    await main(['new', '2026-10-01', '2026-11-30'], board(), tmp(), cache);
    const get = vi.fn<Get>();
    expect(await main([csv(LABELS)], get, tmp(), cache)).toBe(0);
    expect(get).not.toHaveBeenCalled();
    const table = String(log.mock.calls[log.mock.calls.length - 1][0]);
    expect(table).toContain('기회 여부');
    expect(table).not.toContain('미달');
  });
  // 스펙 2: 실행과 같은 판정 경로. 기본은 '모든 글' 방식이라 본문을 받은 세 글을 모두 LLM에 묻는다(가짜 Ask).
  // 3번 글은 규칙만 쓰면 확인 필요로 가는 제목이다
  const ASKED = [link(3), '채용/모집', '[가나다] 참여자 모집', '2026-11-03', 'O', '교육·캠프', '2026-11-14', '가나다', '', ''];
  const askWith = (o: LlmOutcome | Record<number, LlmOutcome>): Ask =>
    Object.assign(async (r: NoticeRow) => (typeof o === 'string' || 'answer' in o ? o : o[r.no] ?? 'fail'), { model: 'm' });

  it('비교(스펙 2): LLM 서버에 닿지 못한 글이 있으면 점수를 내지 않고 1로 끝난다', async () => {
    const { err, log } = quiet();
    expect(await main([csv([...LABELS, ASKED])], board(), tmp(), tmp(), askWith('down'))).toBe(1);
    expect(err).toHaveBeenLastCalledWith('LLM에 연결하지 못한 글이 3건이라 비교하지 않았어요 (m)');
    expect(log.mock.calls).toEqual([['LLM 판정 0(보관 0 · 새로 0 · 실패 0)']]);
  });

  it('비교(스펙 2): 글 판정 실패는 규칙 결과로 점수에 넣고 실패 수를 보인다', async () => {
    const { log } = quiet();
    await main([csv([...LABELS, ASKED])], board(), tmp(), tmp(), askWith('fail'));
    const out = log.mock.calls.map(c => String(c[0]));
    expect(out[0]).toBe('LLM 판정 0(보관 0 · 새로 0 · 실패 3)');
    expect(out[1]).toContain('확인 필요');
    expect(out[2]).toBe('LLM 판정 실패 3건은 규칙 결과로 셌어요');
  });

  it('비교(스펙 2): LLM 답으로 판정해 기준을 모두 넘기면 0으로 끝난다', async () => {
    const { log } = quiet();
    const said = (verdict: 'O' | 'X', kind: Kind | null): LlmOutcome => ({ answer: { verdict, kind, host: null, sure: true }, cached: false });
    expect(await main([csv([...LABELS, ASKED])], board(), tmp(), tmp(), askWith({ 1: said('O', 'job'), 2: said('X', null), 3: said('O', 'edu') }))).toBe(0);
    expect(String(log.mock.calls[0][0])).toBe('LLM 판정 3(보관 0 · 새로 3 · 실패 0)');
    expect(String(log.mock.calls[1][0])).not.toContain('미달');
  });
});
