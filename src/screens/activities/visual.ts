import type { Activity } from '../../domain/types';
import { columnCounts } from './timeline';

// 내 활동 한눈에의 조연 그림(할 일 한 줄 막대)이 쓸 값. 계산만 하고 그리지 않는다.

export type StatusBar = { id: 'todo' | 'doing' | 'done'; label: string; count: number };

/** 할 것·하는 중·끝난 것 개수 */
export function statusBars(activities: Activity[]): StatusBar[] {
  const c = columnCounts(activities);
  return [{ id: 'todo', label: '할 것', count: c.todo }, { id: 'doing', label: '하는 중', count: c.doing }, { id: 'done', label: '끝난 것', count: c.done }];
}
