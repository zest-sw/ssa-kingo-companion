import { describe, expect, it } from 'vitest';
import { discoveriesOf, discState } from '../domain/discoveries';
import { INITIAL_STATE, reducer } from './state';

describe('reducer', () => {
  it('신청 준비를 고르면 할 것 칸에 활동이 생기고, 두 번 골라도 하나다', () => {
    const s1 = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' });
    const s2 = reducer(s1, { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' });
    expect(s2.activities.filter(a => a.programId === 'p-interview')).toHaveLength(1);
    expect(s2.activities.at(-1)?.status).toBe('preparing');
    expect(s2.choices['p-interview']).toBe('preparing');
  });

  it('관심 없음 이유가 분야면 그 분야를 덜 추천한다', () => {
    const s = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-chatbot', choice: 'dismissed', reason: 'field' });
    expect(s.dislikedFields).toEqual(['ai']);
  });

  it('기록을 고치면 버전이 올라 확인한 발견이 근거 바뀜이 된다', () => {
    const d = discoveriesOf(INITIAL_STATE.records)[0];
    const s1 = reducer(INITIAL_STATE, { type: 'discovery/confirm', discovery: d, status: 'yes' });
    const target = s1.records.find(r => r.id === d.evidence[0].id)!;
    const s2 = reducer(s1, { type: 'record/update', record: { ...target, quote: '고침' } });
    const after = discoveriesOf(s2.records).find(x => x.key === d.key)!;
    expect(discState(after, s2.confirm)).toBe('changed');
  });

  it('공개·추천 스위치는 버전을 올리지 않는다', () => {
    const s = reducer(INITIAL_STATE, { type: 'record/setFlags', id: 'e1', flags: { useForRecommend: false } });
    expect(s.records.find(r => r.id === 'e1')).toMatchObject({ v: 1, useForRecommend: false });
  });

  it('기록을 지우면 진로 근거와 공개 목록에서도 빠진다', () => {
    const s0 = reducer(INITIAL_STATE, { type: 'visibility/set', patch: { sharedRecordIds: ['e2'] } });
    const s = reducer(s0, { type: 'record/delete', id: 'e2' });
    expect(s.records.some(r => r.id === 'e2')).toBe(false);
    expect(s.reqEvidence['auth-feedback']).not.toContain('e2');
    expect(s.visibility.sharedRecordIds).toEqual([]);
  });

  it('프로필을 비공개로 돌리면 명예의 전당 동의도 거둔다', () => {
    const s1 = reducer(INITIAL_STATE, { type: 'visibility/set', patch: { profilePublic: true, hallOfFameConsent: true } });
    const s2 = reducer(s1, { type: 'visibility/set', patch: { profilePublic: false } });
    expect(s2.visibility.hallOfFameConsent).toBe(false);
  });

  it('기본은 비공개', () => {
    expect(INITIAL_STATE.visibility.profilePublic).toBe(false);
  });

  it('restore 로 되돌린다', () => {
    const s1 = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-talk', choice: 'later' });
    expect(reducer(s1, { type: 'restore', state: INITIAL_STATE })).toBe(INITIAL_STATE);
  });
});
