import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import { answerAxis, buildStrengths, chancesFor, samplesOf, splitStrengths, strengthHeadline, strengthKeyword, topStrengths, usableSentences, whenOf, withAnswers } from './strengths';

const recs = [
  rec('a', { axes: ['problem', 'communication'], semester: '2026-1', note: '문제 문장을 정리했다', confirmedAxes: ['problem'] }),
  rec('b', { axes: ['problem', 'communication'], semester: '2026-2', note: '질문지를 만들었다' }),
  rec('c', { axes: ['problem', 'creative'], semester: '2026-2', note: '화면 초안을 만들었다', field: 'dev' }),
  rec('d', { axes: ['communication'], semester: '2026-여름', note: '의견을 묶었다', confirmedAxes: ['communication'] })
];

describe('나의 강점', () => {
  it('역량마다 근거 기록을 세고 근거 많은 순, 같으면 확인 많은 순으로 놓는다', () => {
    const rows = buildStrengths(recs);
    expect(rows.slice(0, 3).map(r => [r.axis, r.evidence.length, r.confirmed])).toEqual([['problem', 3, 1], ['communication', 3, 1], ['creative', 1, 0]]);
    expect(rows.find(r => r.axis === 'expertise')!.evidence).toHaveLength(0);
  });
  it('확인한 근거가 먼저, 그다음 최근 학기 순이다', () => {
    const p = buildStrengths(recs).find(r => r.axis === 'problem')!;
    expect(p.evidence.map(e => [e.recordId, e.confirmed])).toEqual([['a', true], ['b', false], ['c', false]]);
  });
  it("'아니에요'라고 한 근거는 뺀다", () => {
    const rows = buildStrengths([...recs.slice(0, 3), { ...recs[3], rejectedAxes: ['communication'] }]);
    expect(rows.find(r => r.axis === 'communication')!.evidence).toHaveLength(2);
    expect(rows[0].axis).toBe('problem');
  });
  it('근거 있는 것만 줄로 그리고 나머지는 적은 쪽으로 모은다', () => {
    const { shown, few } = splitStrengths(buildStrengths(recs), 2);
    expect(shown.map(r => r.axis)).toEqual(['problem', 'communication']);
    expect(few.map(r => r.axis)).toEqual(['creative', 'expertise', 'collaboration', 'self']);
    expect(splitStrengths(buildStrengths([]), 4).shown).toEqual([]);
  });
  it('머리말은 가장 자주 드러난 강점(같으면 둘)을 말한다', () => {
    const rows = buildStrengths(recs);
    expect(topStrengths(rows).map(r => r.label)).toEqual(['문제해결', '소통']);
    expect(strengthHeadline(rows)).toBe('문제해결 · 소통이 가장 자주 드러나요');
    expect(strengthHeadline(buildStrengths([recs[2], rec('e', { axes: ['creative'] })]))).toBe('창의성이 가장 자주 드러나요');
    expect(strengthHeadline(buildStrengths([]))).toBe('회고를 쓰면 강점이 보여요');
    expect(strengthKeyword(rows)).toBe('문제해결: 근거 3개');
  });
  it('대표 근거는 줄끼리 겹치지 않게 고른다', () => {
    const rows = buildStrengths(recs);
    const s = samplesOf(rows.slice(0, 3));
    expect(s.problem?.recordId).toBe('a');
    expect(s.communication?.recordId).toBe('d');
    expect(s.creative?.recordId).toBe('c');
  });
  it('학기별로 근거를 묶고 오래된 학기부터', () => {
    const p = buildStrengths(recs).find(r => r.axis === 'problem')!;
    expect(whenOf(p).map(w => [w.semester, w.items.length])).toEqual([['2026-1', 1], ['2026-2', 2]]);
  });
  it('기회는 그 역량으로 이어지는 일을 하는 것만, 순서대로 n개', () => {
    const ps = [prog('x', { did: ['listen'] }), prog('y', { did: ['make'] }), prog('z', { did: ['ask', 'make'] })];
    expect(chancesFor('problem', ps, 2).map(c => [c.program.id, c.did])).toEqual([['y', 'make'], ['z', 'ask']]);
    expect(chancesFor('collaboration', ps, 2)).toEqual([]);
  });
  it('신청서에 쓸 문장은 확인한 근거만', () => {
    const p = buildStrengths(recs).find(r => r.axis === 'problem')!;
    expect(usableSentences(p)).toEqual(['문제 문장을 정리했다']);
  });
  it('분석한 기록에 지금 근거 답만 덧입힌다', () => {
    const now = [{ ...recs[1], title: '바뀐 제목', confirmedAxes: ['problem' as const] }];
    const out = withAnswers(recs.slice(0, 2), now);
    expect(out[1]).toMatchObject({ title: 'b', confirmedAxes: ['problem'] });
    expect(out[0]).toBe(recs[0]);
  });
  it('맞아요와 아니에요는 서로 반대 목록에서 지운다', () => {
    const r = rec('r', { axes: ['problem'], confirmedAxes: ['problem', 'self'] });
    expect(answerAxis(r, 'problem', false)).toEqual({ confirmedAxes: ['self'], rejectedAxes: ['problem'] });
    expect(answerAxis({ ...r, rejectedAxes: ['problem'] }, 'problem', true)).toEqual({ confirmedAxes: ['self', 'problem'], rejectedAxes: [] });
  });
});
