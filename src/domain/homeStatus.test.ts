import { describe, expect, it } from 'vitest';
import { rec } from './fixtures.test-util';
import { byJoined, joinedLabel, pathLine, recentJoined, wrapOffset } from './hallStage';
import { inventoryOf, weekTasks } from './homeStatus';
import type { Activity } from './types';

const act = (id: string, over: Partial<Activity>): Activity => ({ id, title: id, field: 'dev', status: 'preparing', schedule: '', ...over });

describe('홈 상태', () => {
  it('가진 것은 센 개수다: 경험 카드는 STAR 칸을 채운 기록(배운 점만 있으면 아님)', () => {
    const full = { situation: 's', role: 'r', action: 'a', result: 'x' };
    const inv = inventoryOf([rec('a', { card: full, verification: 'school' }), rec('b', { card: { learned: 'l' } }), rec('c')], 2);
    expect(inv).toEqual({ cards: 1, school: 1, challenges: 2 });
  });

  it('이번 주 할 일: 신청 마감(6일 안, 가까운 순), 회고, 모임으로 묶고 빈 묶음은 뺀다', () => {
    const groups = weekTasks([
      act('far', { due: { label: '신청 마감', dday: 9 } }), act('d5', { due: { label: '신청 마감', dday: 5 } }),
      act('d0', { due: { label: '사전 설문 마감 18:00', dday: 0 }, programId: 'p0' }), act('gone', { due: { label: '', dday: -1 } }),
      act('r', { status: 'ended', schedule: '10월 11일 끝남' }), act('on', { status: 'ongoing', schedule: '9월 ~ 12월' })
    ], 1);
    expect(groups.map(g => g.kind)).toEqual(['deadline', 'review']);
    expect(groups[0].tasks.map(t => [t.title, t.when, !!t.urgent])).toEqual([['d0', '오늘 18:00', true], ['d5', 'D-5', false]]);
    expect(groups[0].tasks[0].target).toEqual({ path: expect.stringContaining('p0') });
    expect(groups[1].tasks[0]).toMatchObject({ when: '10월 11일 끝남', label: 'r 회고 쓰기', target: { path: 'activities/records/interview/r' } });
  });

  it('할 일이 없으면 빈 목록', () => expect(weekTasks([], 1)).toEqual([]));
});

describe('명예의 전당 장면', () => {
  const people = [{ id: 'a', path: [] }, { id: 'b', path: [] }, { id: 'c', path: [] }];
  const joined = { a: '2026-09', b: '2025-12', c: '2026-03' };
  it('오른 날짜순, 최근 n명은 최근이 앞', () => {
    expect(byJoined(people, joined).map(p => p.id)).toEqual(['b', 'c', 'a']);
    expect(recentJoined(people, joined, 2).map(p => p.id)).toEqual(['a', 'c']);
  });
  it('걸어온 길 한 줄과 오른 달', () => {
    expect(pathLine([{ title: 'A' }, { title: 'B' }, { title: 'C' }])).toBe('A에서 C까지, 활동 3개');
    expect(joinedLabel('2026-09')).toBe('2026년 9월에 올랐어요');
  });
  it('행렬 위치는 한 바퀴 안으로 접힌다', () => {
    expect(wrapOffset(1100, 1000)).toBe(100);
    expect(wrapOffset(-100, 1000)).toBe(900);
  });
});
