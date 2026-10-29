import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_STATE, reducer, type Action, type AppState } from './state';
import { clearSaved, loadState, restoreSaved, saveState, toSaved } from './storage';

/** 새로고침: 저장한 모양을 JSON 으로 오가게 한 뒤 다시 읽는다 */
const reload = (s: AppState) => restoreSaved(JSON.parse(JSON.stringify(toSaved(s))));
const play = (actions: Action[]) => actions.reduce(reducer, INITIAL_STATE);

function fakeStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); }
  };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('새로고침 뒤에도 남는 것', () => {
  it('신청 준비 체크가 남는다', () => {
    const s = play([
      { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' },
      { type: 'activity/prepItems', id: 'a-p-interview', items: [{ id: 'target', label: '신청 대상 확인', by: 'agent', done: true, at: '21:38' }, { id: 'draft', label: '신청서 초안 확인', by: 'me', done: true, at: '21:40' }] }
    ]);
    const r = reload(s);
    expect(r.activities.find(a => a.id === 'a-p-interview')).toEqual(s.activities.find(a => a.id === 'a-p-interview'));
    expect(r.choices['p-interview']).toBe('preparing');
  });

  it('나중에 보기와 다시 볼 날이 남는다', () => {
    const r = reload(play([{ type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: 3 }]));
    expect(r.choices).toEqual({ 'p-talk': 'later' });
    expect(r.laterUntil).toEqual({ 'p-talk': 3 });
  });

  it('회고 대기 활동의 초안과 분석 답이 남는다', () => {
    const draft = { messages: [], interview: { card: {}, step: 'situation' as const, followedUp: [] }, visibility: 'me' as const, useForRecommend: true, confirmed: [] };
    const s = play([
      { type: 'draft/save', activityId: 'a-hackathon', draft },
      { type: 'analysis/answers', answers: { 'e1~e2': 'yes' } },
      { type: 'analysis/self', self: { ...INITIAL_STATE.selfLevels, creative: 'high' } }
    ]);
    const r = reload(s);
    expect(r.drafts).toEqual(s.drafts);
    expect(r.edgeAnswers).toEqual({ 'e1~e2': 'yes' });
    expect(r.selfLevels.creative).toBe('high');
  });

  it('예시 기록은 남기지 않으니, 저장 안 한 기록에 이어진 활동은 회고 대기로 돌아간다', () => {
    const s = play([
      { type: 'candidate/choose', programId: 'p-interview', choice: 'preparing' },
      { type: 'activity/setStatus', id: 'a-p-interview', status: 'ended' },
      { type: 'record/add', record: { ...INITIAL_STATE.records[0], id: 'r-x', source: 'agent' }, activityId: 'a-p-interview' }
    ]);
    const r = reload(s);
    expect(r.records).toBe(INITIAL_STATE.records);
    expect(r.activities.find(a => a.id === 'a-p-interview')).toMatchObject({ status: 'ended', recordId: undefined });
  });

  it('모양이 틀린 조각은 버리고 예시 값을 쓴다', () => {
    const r = restoreSaved({ profile: INITIAL_STATE.profile, onboarded: true, visibility: {}, choices: { a: 'nope', b: 'later' }, laterUntil: { b: 'x' }, drafts: { z: 1 } });
    expect(r.choices).toEqual({ b: 'later' });
    expect(r.laterUntil).toEqual({});
    expect(r.drafts).toEqual({});
    expect(restoreSaved('깨진 값')).toBe(INITIAL_STATE);
  });
});

describe('localStorage', () => {
  it('나의 분석의 옛 키를 한 번 옮기고 지운다', () => {
    const ls = fakeStorage({ 'ssa-an:edge-answers': JSON.stringify({ 'e1~e2': 'no' }), 'ssa-an:self-levels': JSON.stringify({ self: 'high' }) });
    vi.stubGlobal('window', { localStorage: ls });
    const s = loadState();
    expect(s.edgeAnswers).toEqual({ 'e1~e2': 'no' });
    expect(s.selfLevels.self).toBe('high');
    expect([...ls.data.keys()]).toEqual(['kingo-companion:v1']);
    expect(loadState().edgeAnswers).toEqual({ 'e1~e2': 'no' });
  });

  it('처음으로 되돌리면 저장한 값을 모두 지운다', () => {
    const ls = fakeStorage({ 'ssa-an:self-levels': '{}' });
    vi.stubGlobal('window', { localStorage: ls });
    saveState(play([{ type: 'candidate/choose', programId: 'p-talk', choice: 'later', until: 3 }]));
    clearSaved();
    expect(ls.data.size).toBe(0);
    expect(loadState()).toBe(INITIAL_STATE);
  });
});
