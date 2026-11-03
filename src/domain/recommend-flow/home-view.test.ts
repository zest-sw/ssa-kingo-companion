import { describe, expect, it } from 'vitest';
import type { Activity } from '../types';
import { semesterBars, semesterTag, timelineOrder, todayTasks } from './summary';

const act = (over: Partial<Activity>): Activity => ({ id: 'a', title: 'A', field: 'dev', status: 'preparing', schedule: '', ...over });

describe('미니 타임라인', () => {
  const list = [
    act({ id: 'd2', title: '연수', due: { label: '신청 마감', dday: 5 } }),
    act({ id: 'd1', title: '튜터', due: { label: '사전 설문 마감 18:00', dday: 0 } }),
    act({ id: 'r', title: '해커톤', status: 'ended', field: 'data' })
  ];
  it('할 일마다 이름·무슨 일·며칠 뒤·시각을 갖는다', () => {
    const t = todayTasks(list, 1);
    expect(t.find(x => x.id === 'due:d1')).toMatchObject({ title: '튜터', what: '신청 마감', day: 0, at: '18:00' });
    expect(t.find(x => x.id === 'review:r')).toMatchObject({ what: '회고', day: 0 });
    expect(t.find(x => x.id === 'due:d2')?.at).toBeUndefined();
  });
  it('가까운 날부터, 같은 날이면 시각 순(시각 없는 것이 먼저)', () => {
    expect(timelineOrder(todayTasks(list, 1)).map(x => x.id)).toEqual(['review:r', 'due:d1', 'due:d2']);
  });
});

describe('이번 학기 분야별 막대', () => {
  const list = [
    act({ id: '1', status: 'ongoing', field: 'ai' }), act({ id: '2', status: 'ended', field: 'data' }),
    act({ id: '3', status: 'recorded', field: 'startup' }), act({ id: '4', status: 'preparing', field: 'dev' })
  ];
  it('신청 준비 중인 활동은 세지 않고, 많은 분야부터 센다', () => {
    const bars = semesterBars(list);
    expect(bars.map(b => [b.label, b.count])).toEqual([['AI·데이터', 2], ['창업·기획', 1]]);
  });
  it('머리말은 활동 수와 가장 많은 분야', () => {
    expect(semesterTag(semesterBars(list))).toBe('활동 3개 · AI·데이터 중심');
    expect(semesterTag(semesterBars([act({ status: 'ongoing', field: 'ai' }), act({ status: 'ongoing', field: 'dev' })]))).toBe('활동 2개 · 고르게');
    expect(semesterTag([])).toBe('아직 활동이 없어요');
    expect(semesterBars([])).toEqual([]);
  });
});
