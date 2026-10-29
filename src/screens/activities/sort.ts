import type { Activity } from '../../domain/types';

export type SortKey = 'due' | 'recent';

/**
 * 목록 보기 정렬. 마감순은 마감이 있는 활동을 가까운 날부터, 마감 없는 활동은 그 뒤에 입력 순서대로.
 * 최근순은 나중에 생긴 활동이 먼저(입력 순서의 거꾸로). 순위나 점수가 아니라 보기 순서일 뿐이다.
 */
export function sortActivities(list: Activity[], key: SortKey): Activity[] {
  if (key === 'recent') return [...list].reverse();
  const withDue = list.filter(a => a.due).sort((a, b) => (a.due?.dday ?? 0) - (b.due?.dday ?? 0));
  return [...withDue, ...list.filter(a => !a.due)];
}
