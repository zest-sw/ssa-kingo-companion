import { describe, expect, it } from 'vitest';
import { fromDraft, parseDrafts, toDraft, type InterviewDraft } from './draft';

const flow = { card: { situation: '해커톤', role: '발표' }, step: 2, visibility: 'me', useForRecommend: true } as const;

describe('초안', () => {
  it('보던 질문과 답을 남겼다가 그대로 이어 간다', () => {
    const d = toDraft({ ...flow });
    expect(d.interview.step).toBe('action');
    expect(fromDraft(d)).toMatchObject({ card: flow.card, step: 2 });
  });
  it('미리보기에서 나가면 미리보기로 돌아온다', () => {
    expect(fromDraft(toDraft({ ...flow, step: 'preview', energy: 'up' }))).toMatchObject({ step: 'preview', energy: 'up' });
  });
  it('옛 대화형 초안이 결과 칸에 멈췄으면 첫 빈 질문으로 간다', () => {
    const old: InterviewDraft = { interview: { card: { situation: 'a', role: 'b' }, step: 'result' }, visibility: 'me', useForRecommend: true };
    expect(fromDraft(old).step).toBe(2);
    expect(fromDraft({ ...old, interview: { ...old.interview, card: { situation: 'a', role: 'b', action: 'c', learned: 'd' } } }).step).toBe('preview');
  });
  it('저장소에서 읽을 때 모양이 맞는 것만 남긴다', () => {
    expect(Object.keys(parseDrafts({ a: toDraft({ ...flow }), b: { x: 1 } }))).toEqual(['a']);
  });
  it('옛 대화형 초안(messages·confirmed·followedUp)도 읽고, 남은 칸은 버린다', () => {
    const saved = { messages: [{ id: 0, from: 'agent', text: '안녕' }], interview: { card: { situation: 'a' }, step: 'role', followedUp: [] }, visibility: 'me', useForRecommend: true, confirmed: [] };
    expect(parseDrafts({ a: saved })).toEqual({ a: { interview: { card: { situation: 'a' }, step: 'role' }, energy: undefined, visibility: 'me', useForRecommend: true } });
  });
});
