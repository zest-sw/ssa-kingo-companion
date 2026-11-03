import { describe, expect, it } from 'vitest';
import { friendsLine, hallLine, interestedIds, myTopGroup, recruitLine } from './summary';
import type { RecruitPost } from './index';

const post = (id: string, opportunityId: string, mine = false): RecruitPost => ({ id, opportunityId, author: 'x', slots: 1, note: 'n', mine });

describe('프로필 한 줄', () => {
  it('친구와 요청 수', () => {
    expect(friendsLine(2, 1)).toBe('친구 2명, 요청 1개');
    expect(friendsLine(2, 0)).toBe('친구 2명');
    expect(friendsLine(0, 0)).toMatch(/신청/);
  });
  it('관심 기회는 직접 표시한 것과 신청 준비 중인 기회를 합친다', () => {
    expect(interestedIds([{ id: 'o1', programId: 'p1' }, { id: 'o2' }], [{ programId: 'p1' }], ['o2'])).toEqual(['o2', 'o1']);
  });
  it('모집 글: 내 글이 있으면 그걸, 없으면 관심 기회의 글을 말한다', () => {
    const posts = [post('1', 'a'), post('2', 'b')];
    expect(recruitLine(posts, ['a'])).toBe('모집 글 2개, 관심 있는 기회에 1개');
    expect(recruitLine([...posts, post('3', 'c', true)], ['a'])).toBe('모집 글 3개, 내 글 1개');
    expect(recruitLine(posts, [])).toBe('모집 글 2개');
    expect(recruitLine([], [])).toMatch(/첫 글/);
  });
  it('명예의 전당: 내 분야 길 수를 말한다', () => {
    const halls = [{ group: 'ai' as const }, { group: 'plan' as const }, { group: 'plan' as const }];
    expect(myTopGroup([{ field: 'startup' }, { field: 'startup' }, { field: 'dev' }])).toBe('plan');
    expect(myTopGroup([])).toBeUndefined();
    expect(hallLine(halls, 'plan')).toBe('걸어온 길 3개, 창업·기획은 2개');
    expect(hallLine(halls, 'mentor')).toBe('걸어온 길 3개, 멘토링 길은 아직 없어요');
    expect(hallLine(halls)).toBe('걸어온 길 3개');
  });
});
