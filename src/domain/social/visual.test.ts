import { describe, expect, it } from 'vitest';
import type { RecruitPost } from './index';
import { feedTag, friendsKeyword, hallKeyword, hallRoute, recruitBars, recruitKeyword } from './visual';

const post = (id: string, opportunityId: string, mine = false): RecruitPost => ({ id, opportunityId, author: 'a', slots: 1, note: '', mine });
const kindOf = (id: string) => ({ o1: '대회', o2: '해커톤', o3: '해커톤' } as Record<string, string>)[id];

describe('프로필 소셜 그림', () => {
  it('친구 키워드', () => {
    expect(friendsKeyword(2, 1)).toBe('친구 2 · 요청 1');
    expect(friendsKeyword(2, 0)).toBe('친구 2');
    expect(friendsKeyword(0, 0)).toBe('친구를 찾아 보세요');
  });
  it('모집 막대는 종류별 글 수이고 빈 종류도 0으로 둔다', () => {
    const bars = recruitBars([post('a', 'o1'), post('b', 'o2'), post('c', 'o3')], kindOf);
    expect(bars).toEqual([{ kind: '대회', count: 1 }, { kind: '해커톤', count: 2 }, { kind: '공모전', count: 0 }]);
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
  it('친구 소식 라벨은 짧다', () => {
    expect(feedTag('achieved', '첫 회고')).toBe('첫 회고 달성');
    expect(feedTag('hidden')).toBe('숨은 과제 발견');
    expect(feedTag('applied', '경진대회')).toBe('경진대회 신청');
    expect(feedTag('shared', '리서치')).toBe('리서치 회고 공개');
  });
});
