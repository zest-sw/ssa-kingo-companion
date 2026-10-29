import { describe, expect, it } from 'vitest';
import { discoveriesOf, discState } from '../domain/discoveries';
import type { InterviewDraft } from '../domain/interview/draft';
import { effectiveChoices, laterUntilDay } from '../domain/recommend-flow/flow';
import type { RecordItem } from '../domain/types';
import { SEED_RECORDS } from '../data/seed';
import { applyWithUndo, INITIAL_STATE, reducer, type Action } from './state';

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

  it('되돌리기는 그 행동이 바꾼 조각만 돌린다', () => {
    const { after, undo } = applyWithUndo(INITIAL_STATE, [{ type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: 3 }]);
    // 되돌리기 전에 다른 조각이 바뀌어도 그대로 남는다.
    const other = reducer(after, { type: 'settings/toggle', key: 'career' });
    const back = reducer(other, undo);
    expect(back.choices).toEqual({});
    expect(back.laterUntil).toEqual({});
    expect(back.settings.career).toBe(false);
  });
});

describe('활동 지우기 (activity/remove)', () => {
  const preparing = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' });
  const id = preparing.activities.find(a => a.programId === 'p-interview')!.id;

  it('활동을 빼고 후보는 관심 없음으로 둔다. 되돌리면 체크 상태까지 돌아온다', () => {
    const checked = reducer(preparing, { type: 'activity/prepItems', id, items: [{ id: 'draft', label: '초안', by: 'me', done: true, at: '21:40' }] });
    const { after, undo } = applyWithUndo(checked, [{ type: 'activity/remove', id }]);
    expect(after.activities.some(a => a.id === id)).toBe(false);
    expect(after.choices['p-interview']).toBe('dismissed');
    const back = reducer(after, undo);
    expect(back.activities.find(a => a.id === id)).toMatchObject({ prep: { done: 1, total: 1 }, prepItems: [{ id: 'draft', done: true }] });
    expect(back.choices['p-interview']).toBe('preparing');
  });

  it('예시 활동을 지우면 초안과 공개 제외 목록에서도 빠진다', () => {
    const s0 = reducer(reducer(INITIAL_STATE, { type: 'draft/save', activityId: 'a-hackathon', draft: draft() }), { type: 'visibility/set', patch: { hiddenActivityIds: ['a-hackathon'] } });
    const s = reducer(s0, { type: 'activity/remove', id: 'a-hackathon' });
    expect(s.drafts).toEqual({});
    expect(s.visibility.hiddenActivityIds).toEqual([]);
    expect(s.choices).toEqual({});
  });
});

describe('나중에 보기 다시 볼 날', () => {
  it('고른 날을 저장하고, 그 날이 지나면 다시 후보에 나온다', () => {
    const s = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: laterUntilDay(1, 3) });
    expect(s.laterUntil['p-talk']).toBe(3);
    expect(effectiveChoices(s.choices, s.laterUntil, 1)['p-talk']).toBe('later');
    expect(effectiveChoices(s.choices, s.laterUntil, 2)['p-talk']).toBeUndefined();
  });
  it('다시 보기나 신청 준비로 바꾸면 날짜가 지워진다', () => {
    const s = reducer(INITIAL_STATE, { type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: 3 });
    expect(reducer(s, { type: 'candidate/clear', programId: 'p-talk' }).laterUntil).toEqual({});
    expect(reducer(s, { type: 'candidate/choose', programId: 'p-talk', choice: 'preparing' }).laterUntil).toEqual({});
  });
});

describe('회고 초안과 역량 근거 확인', () => {
  it('회고를 저장하면 활동이 기록됨이 되고 초안이 지워진다', () => {
    const s0 = reducer(INITIAL_STATE, { type: 'draft/save', activityId: 'a-hackathon', draft: draft() });
    expect(Object.keys(s0.drafts)).toEqual(['a-hackathon']);
    const s = reducer(s0, { type: 'record/add', record: written(), activityId: 'a-hackathon' });
    expect(s.activities.find(a => a.id === 'a-hackathon')).toMatchObject({ status: 'recorded', recordId: 'r-a-hackathon' });
    expect(s.drafts).toEqual({});
  });

  it('기록 삭제를 되돌리면 역량 근거 확인, 활동 상태, 연결 확인이 함께 살아난다', () => {
    const s0 = reducer(INITIAL_STATE, { type: 'record/add', record: written(), activityId: 'a-hackathon' });
    const s1 = reducer(s0, { type: 'record/setFlags', id: 'r-a-hackathon', flags: { confirmedAxes: ['problem'] } });
    const s2 = reducer(s1, { type: 'analysis/answers', answers: { 'e1~r-a-hackathon': 'yes', 'e1~e2': 'no' } });
    const { after, undo } = applyWithUndo(s2, [{ type: 'record/delete', id: 'r-a-hackathon' }]);
    expect(after.activities.find(a => a.id === 'a-hackathon')?.status).toBe('ended');
    expect(after.edgeAnswers).toEqual({ 'e1~e2': 'no' });
    const back = reducer(after, undo);
    expect(back.records.find(r => r.id === 'r-a-hackathon')?.confirmedAxes).toEqual(['problem']);
    expect(back.activities.find(a => a.id === 'a-hackathon')).toMatchObject({ status: 'recorded', recordId: 'r-a-hackathon' });
    expect(back.edgeAnswers).toEqual(s2.edgeAnswers);
  });
});

describe('도전 과제·모집 글', () => {
  it('처음 달성한 시각만 남긴다', () => {
    const s1 = reducer(INITIAL_STATE, { type: 'challenge/achieve', ids: ['first-retro'], at: 1 });
    const s2 = reducer(s1, { type: 'challenge/achieve', ids: ['first-retro'], at: 2 });
    expect(s2).toBe(s1);
    expect(s2.challengeAt).toEqual({ 'first-retro': 1 });
  });
  it('새 모집 글이 앞에 온다', () => {
    const post = (id: string) => ({ id, opportunityId: 'o', author: '나', slots: 2, note: '한 줄', mine: true });
    const s = reducer(reducer(INITIAL_STATE, { type: 'recruit/post', post: post('a') }), { type: 'recruit/post', post: post('b') });
    expect(s.recruitPosts.map(p => p.id)).toEqual(['b', 'a']);
  });
});

describe('처음으로 되돌리기 (reset)', () => {
  it('옮겨 온 값을 모두 비운다', () => {
    const actions: Action[] = [
      { type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: 3 },
      { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' },
      { type: 'activity/prepItems', id: 'a-p-interview', items: [] },
      { type: 'draft/save', activityId: 'a-hackathon', draft: draft() },
      { type: 'record/setFlags', id: 'e1', flags: { confirmedAxes: ['problem'] } },
      { type: 'analysis/answers', answers: { 'e1~e2': 'yes' } },
      { type: 'analysis/self', self: { ...INITIAL_STATE.selfLevels, self: 'high' } },
      { type: 'challenge/achieve', ids: ['first-retro'], at: 1 },
      { type: 'recruit/post', post: { id: 'p', opportunityId: 'o', author: '나', slots: 1, note: 'n', mine: true } }
    ];
    const s = actions.reduce(reducer, INITIAL_STATE);
    expect(s.drafts).not.toEqual({});
    const r = reducer(s, { type: 'reset' });
    expect(r).toBe(INITIAL_STATE);
    expect(r).toMatchObject({ choices: {}, laterUntil: {}, drafts: {}, edgeAnswers: {}, challengeAt: {}, recruitPosts: [] });
    expect(r.records.some(x => x.confirmedAxes)).toBe(false);
    expect(r.activities.some(a => a.prepItems)).toBe(false);
  });
});

function draft(): InterviewDraft {
  return { messages: [{ id: 0, from: 'agent', text: '안녕하세요' }], interview: { card: { situation: '해커톤' }, step: 'role', followedUp: [] }, visibility: 'me', useForRecommend: true, confirmed: [] };
}

function written(): RecordItem {
  return { ...SEED_RECORDS[0], id: 'r-a-hackathon', title: '가을 데이터 해커톤', source: 'agent' };
}
