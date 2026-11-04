import { ddayOf } from './recommend';
import type { Activity, ActivityStatus, BoardColumn, Program } from './types';

/** 한 칸에 여러 상태를 묶는다. 떨어진 신청(declined)도 경고 없이 '끝난 것'에 둔다. */
export const COLUMN_OF: Record<ActivityStatus, BoardColumn> = {
  preparing: 'todo', applied: 'todo', ongoing: 'doing', ended: 'done', recorded: 'done', declined: 'done'
};
export const BOARD_COLUMNS: { id: BoardColumn; label: string }[] = [
  { id: 'todo', label: '할 것' }, { id: 'doing', label: '하는 중' }, { id: 'done', label: '끝난 것' }
];

/** 칸별 활동. 칸 안의 순서는 입력 순서를 지킨다(우선순위 숫자는 쓰지 않는다). */
export function groupByColumn(activities: Activity[]): Record<BoardColumn, Activity[]> {
  const out: Record<BoardColumn, Activity[]> = { todo: [], doing: [], done: [] };
  for (const a of activities) out[COLUMN_OF[a.status]].push(a);
  return out;
}

/** 후보에서 '신청 준비'를 고르면 활동이 된다. */
export function activityFromProgram(p: Program, week: number): Activity {
  return {
    id: `a-${p.id}`,
    title: p.title,
    field: p.field,
    status: 'preparing',
    schedule: p.when,
    due: { label: '신청 마감', dday: Math.max(0, ddayOf(p, week)) },
    programId: p.id
  };
}

/**
 * 끝난 것 칸을 할 일이 남은 것(회고 대기)과 정리된 것(기록됨·이번엔 안 됨)으로 나눈다.
 * 정리된 카드는 접어 두어, 칸이 길어져도 회고 쓸 활동이 먼저 보이게 한다. 할 일이 남은 게 없으면 접지 않는다.
 */
export function splitDone(done: Activity[]): { open: Activity[]; settled: Activity[] } {
  const open = done.filter(a => a.status === 'ended');
  if (open.length === 0) return { open: done, settled: [] };
  return { open, settled: done.filter(a => a.status !== 'ended') };
}
