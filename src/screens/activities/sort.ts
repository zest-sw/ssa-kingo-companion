import { BOARD_COLUMNS, groupByColumn } from '../../domain/activities';
import type { Activity, BoardColumn } from '../../domain/types';
import { parseSchedule } from './timeline';

export type ListGroup = { id: BoardColumn; label: string; items: Activity[] };

/**
 * 목록 보기: 보드와 같은 세 칸으로 묶고, 칸 안은 날짜 순.
 * 할 것은 마감이 가까운 순(마감 없는 활동은 뒤), 하는 중은 시작이 이른 순(날짜 없으면 뒤),
 * 끝난 것은 회고 대기가 먼저. 같으면 입력 순서를 지킨다. 순위나 점수가 아니라 보기 순서일 뿐이다.
 */
export function listGroups(activities: Activity[]): ListGroup[] {
  const cols = groupByColumn(activities);
  const rank = (a: Activity, id: BoardColumn): number => {
    if (id === 'todo') return a.due?.dday ?? Infinity;
    if (id === 'doing') return Date.parse(parseSchedule(a.schedule).start ?? '') || Infinity;
    return a.status === 'ended' ? 0 : 1;
  };
  return BOARD_COLUMNS.map(c => ({
    id: c.id,
    label: c.label,
    // Array.sort 는 안정 정렬이라 같은 값끼리 입력 순서가 남는다. Infinity - Infinity 는 NaN 이라 따로 비교한다.
    items: [...cols[c.id]].sort((x, y) => { const rx = rank(x, c.id), ry = rank(y, c.id); return rx === ry ? 0 : rx < ry ? -1 : 1; })
  }));
}
