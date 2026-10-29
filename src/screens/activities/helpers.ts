import { ddayText } from '../../domain/text';
import type { Activity } from '../../domain/types';

type Due = NonNullable<Activity['due']>;
type Patch = Partial<Omit<Activity, 'id'>>;

/** '신청 마감' → '마감 D-5' */
export const dueText = (due: Due) => `${due.label.replace(/^신청 /, '')} ${ddayText(due.dday)}`;

/** 마감 표시. 오늘이 마감이면 '오늘' 배지와 마감 문구, 아니면 D-day 글. */
export type DueView = { kind: 'today'; label: string } | { kind: 'text'; text: string };
export const dueView = (due: Due): DueView => (due.dday === 0 ? { kind: 'today', label: due.label } : { kind: 'text', text: dueText(due) });

/** 카드의 한 줄 정보: 오늘 마감이면 배지 + 문구만, 아니면 '준비 2/3 · 마감 D-5', 둘 다 없으면 일정 */
export function metaView(a: Activity): DueView {
  if (a.due?.dday === 0) return dueView(a.due);
  const parts = [a.prep && `준비 ${a.prep.done}/${a.prep.total}`, a.due && dueText(a.due)].filter(Boolean);
  return { kind: 'text', text: parts.length ? parts.join(' · ') : a.schedule };
}

/** 그만두기. 전역 상태에 활동을 지우는 액션이 없어 '이번엔 안 됨'(끝난 것)으로 옮기고 마감·준비는 비운다. */
export const quitPatch = (): Patch => ({ status: 'declined', schedule: '직접 그만뒀어요', due: undefined, prep: undefined });

/** 그만둘 수 있는 활동: 기록됐거나 이미 끝난(안 됨) 활동은 제외 */
export const canQuit = (a: Activity) => a.status !== 'recorded' && a.status !== 'declined';
