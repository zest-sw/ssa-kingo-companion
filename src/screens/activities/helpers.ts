import { ddayText } from '../../domain/text';
import type { Activity } from '../../domain/types';

type Due = NonNullable<Activity['due']>;

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


/** 그만둘 수 있는 활동: 기록됐거나 이미 끝난(안 됨) 활동은 제외 */
export const canQuit = (a: Activity) => a.status !== 'recorded' && a.status !== 'declined';

/** 하는 중이 이만큼 이상이면 보드에 안내 한 줄을 둔다. 경고가 아니라 새로 시작하기 전에 한 번 보라는 말이다. */
export const DOING_BUSY = 3;

/** 서랍의 한 줄: 지금 단계에서 다음에 오는 일. 일정·준비·실행 기록·회고가 한 흐름으로 읽히게 한다. */
export function nextLine(a: Activity): string {
  switch (a.status) {
    case 'preparing': {
      const left = a.prep ? a.prep.total - a.prep.done : 0;
      return left > 0 ? `신청 준비가 ${left}개 남았어요` : '신청 준비를 이어서 해요';
    }
    case 'applied': return '결과를 기다리는 중이에요';
    case 'ongoing': return '진행 중이에요. 끝나면 회고를 쓸 수 있어요';
    case 'ended': return '끝났어요. 회고를 쓰면 기록으로 남아요';
    case 'recorded': return '회고가 기록으로 남았어요';
    case 'declined': return '이번엔 안 됐어요. 다음 모집에서 다시 볼 수 있어요';
  }
}
