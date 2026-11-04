import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import { answerAxis, fewLine, buildStrengths, chancesFor, samplesOf, splitStrengths, strengthHeadline, strengthKeyword, leadStrengths, usableSentences, whenOf, withAnswers, radarSpots, radarScale, radarMoments, defaultRadarAxis, radarSub } from './strengths';

const recs = [
  rec('a', { axes: ['problem', 'communication'], semester: '2026-1', note: '문제 문장을 정리했다', confirmedAxes: ['problem'] }),
  rec('b', { axes: ['problem', 'communication'], semester: '2026-2', note: '질문지를 만들었다' }),
  rec('c', { axes: ['problem', 'creative'], semester: '2026-2', note: '화면 초안을 만들었다', field: 'dev' }),
  rec('d', { axes: ['communication'], semester: '2026-여름', note: '의견을 묶었다', confirmedAxes: ['communication'] })
];

describe('나의 강점', () => {
  it('확인한 근거가 전체 근거 수보다 먼저다', () => {
    const rows = buildStrengths([...recs.map(r => ({ ...r, confirmedAxes: [] })), rec('x', { axes: ['self'], confirmedAxes: ['self'] })]);
    expect(rows[0].axis).toBe('self');
    expect(rows[1].axis).toBe('problem');
  });
  it('역량마다 근거 기록을 세고 확인 많은 순, 같으면 근거 많은 순으로 놓는다', () => {
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
  it('머리말은 확인한 근거로만 단정한다', () => {
    const rows = buildStrengths(recs);
    expect(leadStrengths(rows)).toMatchObject({ confirmed: true, rows: [{ label: '문제해결' }, { label: '소통' }] });
    expect(strengthHeadline(rows)).toEqual({ text: '문제해결 · 소통이 가장 확실히 드러나요 · 확인 각 1개', estimated: false });
    const one = buildStrengths([...recs, rec('e', { axes: ['problem'], confirmedAxes: ['problem'] })]);
    expect(strengthHeadline(one).text).toBe('문제해결이 가장 확실히 드러나요 · 확인 2개');
    expect(strengthKeyword(one)).toEqual({ text: '문제해결: 확인 2개', estimated: false });
    expect(strengthHeadline(buildStrengths([]))).toEqual({ text: '회고를 쓰면 강점이 보여요', estimated: false });
  });
  it('확인한 강점이 없으면 AI 후보임을 밝힌다', () => {
    const guessed = buildStrengths(recs.map(r => ({ ...r, confirmedAxes: [] })));
    expect(leadStrengths(guessed).confirmed).toBe(false);
    expect(strengthHeadline(guessed)).toEqual({ text: 'AI 가 본 강점 후보: 문제해결 · 소통 · 근거를 확인해 주세요', estimated: true });
    expect(strengthKeyword(guessed)).toEqual({ text: '강점 후보: 문제해결 · 확인 전', estimated: true });
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

describe('fewLine', () => {
  const row = (label: string, n: number) => ({ axis: 'self' as const, label, confirmed: 0, evidence: Array.from({ length: n }, (_, i) => ({ recordId: `r${i}`, title: '', semester: '2026-1', group: 'plan' as const, text: '', confirmed: false })) });
  it('근거가 있는 것은 그다음 강점, 없는 것은 아직 없다고 나눠 말한다', () => {
    expect(fewLine([row('창의성', 8), row('자기주도', 0)])).toBe('그다음 강점: 창의성. 아직 근거가 없어요: 자기주도');
    expect(fewLine([row('자기주도', 0)])).toBe('아직 근거가 없어요: 자기주도');
  });
});

describe('강점 레이더', () => {
  const rows = buildStrengths(recs);
  it('역량 순서대로 여섯 꼭짓점, 값은 확인 수와 전체 수', () => {
    const s = radarSpots(rows);
    expect(s.map(x => x.axis)).toEqual(['expertise', 'problem', 'communication', 'collaboration', 'self', 'creative']);
    expect(s.find(x => x.axis === 'problem')).toMatchObject({ confirmed: 1, total: 3 });
    expect(radarSub(s[1])).toBe('확인 1 · 전체 3');
  });
  it('학기까지만 세면 그 뒤 기록은 빠진다', () => {
    const s = radarSpots(rows, 2026 * 4 + 0);
    expect(s.find(x => x.axis === 'problem')).toMatchObject({ confirmed: 1, total: 1 });
    expect(s.find(x => x.axis === 'creative')!.total).toBe(0);
  });
  it('눈금은 2개 단위로 최소 4, 많으면 4개 단위', () => {
    expect(radarScale(radarSpots(rows))).toEqual({ max: 4, ticks: [2, 4] });
    expect(radarScale([{ axis: 'self', label: '', confirmed: 0, total: 7 }])).toEqual({ max: 8, ticks: [2, 4, 6, 8] });
    expect(radarScale([{ axis: 'self', label: '', confirmed: 0, total: 11 }])).toEqual({ max: 12, ticks: [4, 8, 12] });
  });
  it('시점은 지금과 지난 해 말, 기본 꼭짓점은 가장 확실한 강점', () => {
    expect(radarMoments(rows).map(m => m.id)).toEqual(['now']);
    const two = buildStrengths([rec('p', { axes: ['self'], semester: '2025-1' }), ...recs]);
    expect(radarMoments(two).map(m => m.label)).toEqual(['지금', '2025년 말']);
    expect(defaultRadarAxis(rows)).toBe('problem');
    expect(defaultRadarAxis(buildStrengths([]))).toBeNull();
  });
});
