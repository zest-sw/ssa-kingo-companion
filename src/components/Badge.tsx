import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'green' | 'navy' | 'orange' | 'lime' | 'solid-orange' | 'dashed';

/**
 * 표시용 꼬리표: 상태(신청 준비, 진행 중), 오늘, 가장 추천, AI 추정(dashed).
 * 경고색은 쓰지 않는다. orange 는 '오늘·마감 임박·회고 대기' 같은 챙길 것에만.
 */
export function Badge({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={`ui-badge ui-badge--${tone}`}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/** 사이드바·탭 옆 숫자 배지 */
export function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="ui-count num">
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label} {count}개</span>
    </span>
  );
}
