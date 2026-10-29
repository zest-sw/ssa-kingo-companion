import { describe, expect, it } from 'vitest';
import { activityFromProgram, groupByColumn } from './activities';
import { buildCandidates, dismissEffect } from './candidates';
import { catalog, prog, profile, rec } from './fixtures.test-util';
import { ddayText, hasBatchim, josa } from './text';
import type { Activity, ActivityStatus } from './types';

describe('josa', () => {
  it('받침 있으면 앞, 없으면 뒤', () => {
    expect(josa('기록', '을', '를')).toBe('을');
    expect(josa('데이터', '을', '를')).toBe('를');
    expect(josa('창업 ', '과', '와')).toBe('과');
  });
  it('한글이 아니면 받침 없음으로 본다', () => {
    expect(hasBatchim('AI')).toBe(false);
  });
  it('ddayText', () => {
    expect(ddayText(0)).toBe('오늘까지');
    expect(ddayText(3)).toBe('D-3');
  });
});

describe('groupByColumn', () => {
  const a = (id: string, status: ActivityStatus): Activity => ({ id, title: id, field: 'dev', status, schedule: '' });
  it('할 것=신청 준비·결과 대기, 하는 중=진행 중, 끝난 것=회고 대기·기록됨·이번엔 안 됨', () => {
    const g = groupByColumn([a('1', 'preparing'), a('2', 'applied'), a('3', 'ongoing'), a('4', 'ended'), a('5', 'recorded'), a('6', 'declined')]);
    expect(g.todo.map(x => x.id)).toEqual(['1', '2']);
    expect(g.doing.map(x => x.id)).toEqual(['3']);
    expect(g.done.map(x => x.id)).toEqual(['4', '5', '6']);
  });
  it('후보에서 신청 준비를 고르면 할 것 칸 활동이 된다', () => {
    const act = activityFromProgram(prog('p1', { ddayW1: 4 }), 1);
    expect(act).toMatchObject({ id: 'a-p1', status: 'preparing', programId: 'p1', due: { dday: 4 } });
  });
});

describe('buildCandidates', () => {
  const base = {
    catalog: catalog([prog('a', { field: 'research' }), prog('b', { field: 'research' }), prog('c', { field: 'data' }), prog('d', { field: 'ai' })]),
    week: 1, profile: profile({ interests: ['research'] }), records: [rec('r1')], confirm: {}, settings: { discover: true, career: true },
    choices: {}, dislikedFields: [], preferEasier: false, last: null
  };

  it('가장 추천 1개와 대안 2개, 배지는 아직 안 고른 후보 수', () => {
    const v = buildCandidates(base);
    expect(v.primary?.p.field).toBe('research');
    expect(v.alternatives).toHaveLength(2);
    expect(v.newCount).toBe(3);
  });

  it('고른 후보는 목록에서 빠지고, 나중에 보기는 따로 모인다', () => {
    const v = buildCandidates({ ...base, choices: { a: 'later', b: 'dismissed', c: 'preparing' } });
    expect(v.scored.map(s => s.p.id)).toEqual(['d']);
    expect(v.later.map(p => p.id)).toEqual(['a']);
    expect(v.newCount).toBe(1);
  });

  it('추천에 쓰지 않기를 고른 기록은 발견에서 뺀다', () => {
    const records = [rec('x', { did: 'make' }), rec('y', { did: 'make', useForRecommend: false })];
    expect(buildCandidates({ ...base, records }).discoveries).toEqual([]);
    expect(buildCandidates({ ...base, records: records.map(r => ({ ...r, useForRecommend: true })) }).discoveries).toHaveLength(1);
  });

  it('맞다고 확인한 발견이 있으면 좁혀 가는 중', () => {
    const records = [rec('x', { did: 'make' }), rec('y', { did: 'make' })];
    const sig = ['x@1', 'y@1'];
    expect(buildCandidates({ ...base, records }).mode).toBe('explore');
    expect(buildCandidates({ ...base, records, confirm: { 'freq:make': { status: 'yes', sig } } }).mode).toBe('focus');
  });

  it('관심 없음 이유: 분야면 그 분야 감점, 어려움이면 입문 선호', () => {
    expect(dismissEffect('field', prog('p', { field: 'ai' }))).toEqual({ dislikedField: 'ai' });
    expect(dismissEffect('hard', prog('p'))).toEqual({ preferEasier: true });
    expect(dismissEffect('time', prog('p'))).toEqual({});
  });
});
