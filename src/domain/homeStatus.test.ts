import { describe, expect, it } from 'vitest';
import { rec } from './fixtures.test-util';
import { byJoined, joinedLabel, pathLine, recentJoined, wrapOffset } from './hallStage';
import { deepestField, inventoryOf, nearestDday, situationOf } from './homeStatus';
import type { Activity } from './types';

const act = (id: string, over: Partial<Activity>): Activity => ({ id, title: id, field: 'dev', status: 'preparing', schedule: '', ...over });

describe('상태창', () => {
  it('가진 것은 센 개수다: 경험 카드는 STAR 칸을 채운 기록(배운 점만 있으면 아님)', () => {
    const full = { situation: 's', role: 'r', action: 'a', result: 'x' };
    const inv = inventoryOf([rec('a', { card: full, verification: 'school' }), rec('b', { card: { learned: 'l' } }), rec('c')], 2);
    expect(inv).toMatchObject({ records: 3, cards: 1, school: 1, challenges: 2 });
  });

  it('가장 깊이 간 분야는 심화 수준이 높은 쪽, 같으면 기록이 많은 쪽', () => {
    expect(deepestField([rec('a', { field: 'startup', level: 3 }), rec('b', { field: 'dev', level: 2 }), rec('c', { field: 'dev', level: 2 })])).toBe('창업·기획 심화');
    expect(deepestField([rec('a', { field: 'startup', level: 1 }), rec('b', { field: 'dev', level: 1 }), rec('c', { field: 'dev', level: 1 })])).toBe('개발 입문');
    expect(deepestField([])).toBeUndefined();
  });

  it('지금 상황: 하는 중 · 이번 주(6일 안) 마감 · 회고 대기', () => {
    const s = situationOf([
      act('a', { status: 'ongoing' }), act('b', { due: { label: '', dday: 3 } }), act('c', { due: { label: '', dday: 9 } }),
      act('d', { status: 'ended' }), act('e', { status: 'applied', due: { label: '', dday: 0 } })
    ]);
    expect(s).toEqual({ doing: 1, dueThisWeek: 2, reviewWaiting: 1 });
  });


  it('가장 가까운 마감은 지난 것을 뺀다', () => {
    expect(nearestDday([5, -1, 2])).toBe(2);
    expect(nearestDday([-3])).toBeUndefined();
  });
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
