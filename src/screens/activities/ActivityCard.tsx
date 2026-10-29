import type { ReactNode } from 'react';
import { Badge, Button, FieldTag, ProgressBar, type BadgeTone } from '../../components';
import { navigate } from '../../app/router';
import { ddayText } from '../../domain/text';
import type { Activity, ActivityStatus } from '../../domain/types';
import { STATUS_LABEL } from '../../domain/vocab';

// 경고색 없이 상태 이름만 다르게 쓴다. orange 는 '챙길 것(회고 대기)'에만.
const TONE: Record<ActivityStatus, BadgeTone> = { preparing: 'navy', applied: 'neutral', ongoing: 'green', ended: 'orange', recorded: 'neutral', declined: 'neutral' };

export const StatusBadge = ({ status }: { status: ActivityStatus }) => <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;

/** '신청 마감' → '마감 D-5' */
export function dueText(due: NonNullable<Activity['due']>) {
  return `${due.label.replace(/^신청 /, '')} ${ddayText(due.dday)}`;
}

/** 한 줄 정보: 준비 2/3 · 마감 D-5 / 오늘 + 사전 설문 마감 18:00 / 일정. 오늘이 마감이면 '오늘' 배지와 마감 문구만 둔다. */
export function ActivityMeta({ a }: { a: Activity }): ReactNode {
  if (a.due?.dday === 0) return <><Badge tone="solid-orange">오늘</Badge> {a.due.label}</>;
  const parts = [a.prep && `준비 ${a.prep.done}/${a.prep.total}`, a.due && dueText(a.due)].filter(Boolean);
  return parts.length ? parts.join(' · ') : a.schedule;
}

export const goInterview = (id: string) => navigate(`records/interview/${id}`);

export function ActivityCard({ a, onOpen }: { a: Activity; onOpen: (id: string) => void }) {
  return (
    <article className="act-card" aria-labelledby={`act-${a.id}`}>
      <div className="act-card__top">
        <FieldTag field={a.field} />
        <StatusBadge status={a.status} />
      </div>
      <h3 className="act-card__title">
        <button type="button" id={`act-${a.id}`} className="act-card__open" aria-haspopup="dialog" onClick={() => onOpen(a.id)}>{a.title}</button>
      </h3>
      <p className="act-card__meta"><ActivityMeta a={a} /></p>
      {a.prep && <ProgressBar value={a.prep.done} max={a.prep.total} label={`${a.title} 준비`} />}
      {a.status === 'ended' && <div className="act-card__cta"><Button variant="primary" size="sm" onClick={() => goInterview(a.id)}>회고 쓰기</Button></div>}
    </article>
  );
}
