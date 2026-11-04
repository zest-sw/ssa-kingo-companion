import { describe, expect, it } from 'vitest';
import type { RecruitPost } from './index';
import { friendsKeyword, hallKeyword, hallRoute, recruitKeyword } from './visual';

const post = (id: string, opportunityId: string, mine = false): RecruitPost => ({ id, opportunityId, author: 'a', slots: 1, note: '', mine });

describe('프로필 소셜 그림', () => {
  it('친구 키워드', () => {
    expect(friendsKeyword(2, 1)).toBe('친구 2 · 요청 1');
    expect(friendsKeyword(2, 0)).toBe('친구 2');
    expect(friendsKeyword(0, 0)).toBe('친구를 찾아 보세요');
  });
  it('모집 키워드', () => {
    expect(recruitKeyword([])).toBe('첫 모집 글을 올려 보세요');
    expect(recruitKeyword([post('a', 'o1')])).toBe('모집 글 1');
    expect(recruitKeyword([post('a', 'o1', true), post('b', 'o2')])).toBe('내 글 1 · 전체 2');
  });
  it('전당 경로는 내 분야와 같은 길을 먼저 보여 준다', () => {
    const hall = [
      { name: '가', group: 'ai' as const, path: [{ field: 'ai' as const }, { field: 'data' as const }] },
      { name: '나', group: 'plan' as const, path: [{ field: 'startup' as const }, { field: 'startup' as const }, { field: 'mentor' as const }] }
    ];
    expect(hallRoute(hall, 'plan')).toEqual({ who: '나', steps: ['plan', 'plan', 'mentor'] });
    expect(hallRoute(hall)?.who).toBe('가');
    expect(hallRoute([])).toBeUndefined();
    expect(hallKeyword(hall)).toBe('걸어온 길 2');
    expect(hallKeyword([])).toBe('아직 올라온 길이 없어요');
  });
});
