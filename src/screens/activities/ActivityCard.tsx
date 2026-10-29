import type { ReactNode } from 'react';
import { Badge, Button, FieldTag, ProgressBar, type BadgeTone } from '../../components';
import { navigate } from '../../app/router';
import type { Activity, ActivityStatus } from '../../domain/types';
import { STATUS_LABEL } from '../../domain/vocab';
import { metaView } from './helpers';

// 경고색 없이 상태 이름(글)으로 구분한다. 회고 대기도 중립 톤이고, 오렌지는 '오늘' 배지에만 쓴다.
const TONE: Record<ActivityStatus, BadgeTone> = { preparing: 'navy', applied: 'neutral', ongoing: 'green', ended: 'neutral', recorded: 'neutral', declined: 'neutral' };

export const StatusBadge = ({ status }: { status: ActivityStatus }) => <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;

/** 한 줄 정보: 준비 2/3 · 마감 D-5 / 오늘 + 사전 설문 마감 18:00 / 일정 */
export function ActivityMeta({ a }: { a: Activity }): ReactNode {
  const m = metaView(a);
  return m.kind === 'today' ? <><Badge tone="solid-orange">오늘</Badge> {m.label}</> : m.text;
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
