import { describe, expect, it } from 'vitest';
import type { Activity } from '../../domain/types';
import { sortActivities } from './sort';

const a = (id: string, dday?: number): Activity => ({ id, title: id, field: 'dev', status: 'preparing', schedule: '', due: dday === undefined ? undefined : { label: '마감', dday } });
const ids = (l: Activity[]) => l.map(x => x.id);

describe('sortActivities', () => {
  const list = [a('x'), a('far', 9), a('today', 0), a('y'), a('near', 3)];
  it('마감순: 가까운 마감 먼저, 마감 없는 활동은 뒤에 입력 순서대로', () => {
    expect(ids(sortActivities(list, 'due'))).toEqual(['today', 'near', 'far', 'x', 'y']);
  });
  it('최근순: 입력 순서의 거꾸로', () => {
    expect(ids(sortActivities(list, 'recent'))).toEqual(['near', 'y', 'today', 'far', 'x']);
  });
  it('원본을 바꾸지 않는다', () => {
    sortActivities(list, 'due');
    expect(ids(list)).toEqual(['x', 'far', 'today', 'y', 'near']);
  });
});
