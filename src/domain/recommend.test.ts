import { describe, expect, it } from 'vitest';
import { catalog, prog, profile, rec } from './fixtures.test-util';
import { diffLabel, mainReason, pickAlternatives, rank, type RankCtx } from './recommend';
import type { Program, Scored } from './types';

const ctx = (programs: Program[], over: Partial<RankCtx> = {}): RankCtx => ({
  catalog: catalog(programs), week: 1, profile: profile(), records: [], doneIds: [], excluded: [], dislikedFields: [], preferEasier: false,
  mode: 'explore', focusDids: [], rejectedDids: [], careerOn: true, reflectOn: true, last: null, ...over
});
const ids = (r: { scored: Scored[] }) => r.scored.map(s => s.p.id);
const scoreOf = (r: { scored: Scored[] }, id: string) => r.scored.find(s => s.p.id === id)!.score;

describe('rank · 거르기', () => {
  it('이번 주 모집이 아니거나 마감이 지났거나 신청 대상이 아니면 뺀다', () => {
    const r = rank(ctx([prog('ok'), prog('other-week', { weeks: [2] }), prog('closed', { ddayW1: -1 }), prog('not-eligible', { eligible: false })]));
    expect(ids(r)).toEqual(['ok']);
    expect(r.funnel).toEqual({ pool: 3, open: 2, eligible: 1, fit: 1, fresh: 1 });
  });

  it('가능한 시간보다 길거나 방식이 다르면 뺀다', () => {
    const r = rank(ctx([prog('short', { hours: 2 }), prog('long', { hours: 6 }), prog('online', { format: 'online' })], { profile: profile({ time: 3, format: 'offline' }) }));
    expect(ids(r)).toEqual(['short']);
  });

  it('이미 했거나 뺀 기회는 뺀다', () => {
    const r = rank(ctx([prog('a'), prog('done'), prog('excluded')], { doneIds: ['done'], excluded: ['excluded'] }));
    expect(ids(r)).toEqual(['a']);
  });

  it('주차가 지나면 마감도 7일씩 줄어 지난 기회가 빠진다', () => {
    expect(ids(rank(ctx([prog('a', { ddayW1: 5, weeks: [1, 2] })], { week: 2 })))).toEqual([]);
  });
});

describe('rank · 가점', () => {
  it('관심 분야는 +3, 이유에 관심을 적는다', () => {
    const r = rank(ctx([prog('mine', { field: 'data' }), prog('other', { field: 'ai' })], { profile: profile({ interests: ['data'] }), records: [rec('r', { field: 'data' }), rec('s', { field: 'ai' })] }));
    expect(ids(r)[0]).toBe('mine');
    expect(scoreOf(r, 'mine') - scoreOf(r, 'other')).toBe(3);
    expect(mainReason(r.scored[0].reasons)?.kind).toBe('interest');
  });

  it('에너지가 오른 일과 같은 일을 하면 +2, 그 기록을 근거로 단다', () => {
    const r = rank(ctx([prog('x', { did: ['make'] })], { records: [rec('r1', { did: 'make', energy: 'up' })] }));
    const reason = r.scored[0].reasons.find(x => x.kind === 'energy');
    expect(reason?.recordId).toBe('r1');
    expect(scoreOf(r, 'x')).toBe(2);
  });

  it('회고 쓰기를 끄면 에너지 가점·감점이 없다', () => {
    const r = rank(ctx([prog('x', { did: ['make'] })], { reflectOn: false, records: [rec('r1', { did: 'make', energy: 'up' })] }));
    expect(scoreOf(r, 'x')).toBe(0);
  });

  it('아니라고 한 발견의 일은 에너지 가점에서 뺀다', () => {
    const r = rank(ctx([prog('x', { did: ['make'] })], { rejectedDids: ['make'], records: [rec('r1', { did: 'make', energy: 'up' })] }));
    expect(scoreOf(r, 'x')).toBe(0);
  });

  it('좁혀 가는 중이면 확인한 발견의 일에 +2', () => {
    const r = rank(ctx([prog('x', { did: ['ask'] })], { mode: 'focus', focusDids: ['ask'], records: [rec('r', { field: 'research' })] }));
    expect(scoreOf(r, 'x')).toBe(2);
    expect(r.scored[0].reasons[0].kind).toBe('focus');
  });

  it('탐색 중이면 안 해 본 분야에 +1, 관심을 모르면 +2', () => {
    const records = [rec('r', { field: 'research' })];
    expect(scoreOf(rank(ctx([prog('n', { field: 'ai' })], { records })), 'n')).toBe(1);
    expect(scoreOf(rank(ctx([prog('n', { field: 'ai' })], { records, profile: profile({ interests: ['unknown'] }) })), 'n')).toBe(2);
  });

  it('관심 방향의 진로 요건과 이어지면 +1, 빈 요건을 채우면 +1.5. 채용 연결을 끄면 없다', () => {
    const cat = catalog([prog('m', { career: { req: 'r1', part: 'match' } }), prog('g', { career: { req: 'r1', part: 'gap', gapLabel: '데이터' } })], {
      jobs: [{ id: 'j', company: 'C', short: 's', title: 't', url: 'u', checkedAt: 'd', state: '' }],
      reqs: [{ id: 'r1', job: 'j', label: 'L', kind: '필수' }],
      directions: [{ id: 'd', field: 'product', label: '', reqIds: ['r1'] }]
    });
    const base = { catalog: cat, profile: profile({ interests: ['product'] }), records: [rec('r', { field: 'research' })] };
    const r = rank(ctx([], base));
    expect(scoreOf(r, 'm')).toBe(1);
    expect(scoreOf(r, 'g')).toBe(1.5);
    const off = rank(ctx([], { ...base, careerOn: false }));
    expect(scoreOf(off, 'm')).toBe(0);
  });

  it('마감 3일 안이면 +0.3', () => {
    const r = rank(ctx([prog('soon', { ddayW1: 3 })], { records: [rec('r')] }));
    expect(scoreOf(r, 'soon')).toBeCloseTo(0.3);
  });
});

describe('rank · 감점', () => {
  const records = [rec('r', { field: 'research' })];
  it('지친 일 -1.5', () => {
    expect(scoreOf(rank(ctx([prog('x', { did: ['present'] })], { records: [rec('r', { did: 'present', energy: 'down' })] })), 'x')).toBe(-1.5);
  });
  it('관심 없는 분야 -4', () => {
    expect(scoreOf(rank(ctx([prog('x')], { records, dislikedFields: ['research'] })), 'x')).toBe(-4);
  });
  it('입문 선호면 2단계 이상 -2', () => {
    const r = rank(ctx([prog('easy', { level: 1 }), prog('hard', { level: 2 })], { records, preferEasier: true }));
    expect(ids(r)).toEqual(['easy', 'hard']);
    expect(scoreOf(r, 'hard')).toBe(-2);
  });
  it('지난번과 같은 분야 -2, 다른 분야에는 반영 이유를 단다', () => {
    const last = { recordId: 'r', title: '지난 활동', field: 'research' as const };
    const r2 = rank(ctx([prog('same', { field: 'research' }), prog('diff', { field: 'data' })], { records: [rec('r', { field: 'research' }), rec('s', { field: 'data' })], last }));
    expect(scoreOf(r2, 'same')).toBe(-2);
    expect(r2.scored.find(s => s.p.id === 'diff')!.reasons.some(x => x.kind === 'bridge')).toBe(true);
  });
});

describe('pickAlternatives', () => {
  const s = (id: string, field: Program['field']): Scored => ({ p: prog(id, { field }), score: 0, reasons: [] });
  it('다음 순위 하나와, 두 후보와 분야가 다른 것 하나를 고른다', () => {
    const scored = [s('top', 'research'), s('a', 'research'), s('b', 'research'), s('c', 'data')];
    expect(pickAlternatives(scored, scored[0].p).map(x => x.p.id)).toEqual(['a', 'c']);
  });
  it('분야가 다른 것이 없으면 그다음 순위', () => {
    const scored = [s('top', 'research'), s('a', 'research'), s('b', 'research')];
    expect(pickAlternatives(scored, scored[0].p).map(x => x.p.id)).toEqual(['a', 'b']);
  });
  it('후보가 모자라면 있는 만큼만', () => {
    expect(pickAlternatives([s('top', 'research')], prog('top'))).toEqual([]);
    expect(pickAlternatives([s('top', 'research'), s('a', 'ai')], prog('top')).map(x => x.p.id)).toEqual(['a']);
  });
});

describe('diffLabel', () => {
  const base = prog('base', { field: 'research', hours: 2, format: 'offline', level: 1 });
  it('안 해 본 새 분야를 먼저 알린다', () => {
    expect(diffLabel(prog('a', { field: 'ai' }), base, new Set(['research']), [])).toBe('새로운 분야 · AI');
  });
  it('더 짧으면 더 가볍게, 온라인이면 함께 적는다', () => {
    expect(diffLabel(prog('a', { hours: 1, format: 'online', durationLabel: '1시간' }), base, new Set(), [])).toBe('더 가볍게 · 온라인 1시간');
  });
  it('방식 → 단계 → 관심 → 일정 순서', () => {
    expect(diffLabel(prog('a', { format: 'online' }), base, new Set(), [])).toBe('온라인으로');
    expect(diffLabel(prog('a', { level: 2 }), base, new Set(), [])).toBe('한 단계 도전');
    expect(diffLabel(prog('a'), base, new Set(), ['research'])).toBe('관심 분야 · UX·리서치');
    expect(diffLabel(prog('a', { when: '10.28' }), base, new Set(), [])).toBe('다른 일정 · 10.28');
  });
});
