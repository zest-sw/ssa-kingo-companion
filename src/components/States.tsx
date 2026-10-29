import type { ReactNode } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

/** 빈 상태. message 는 다음 행동을 안내하는 해요체 문장으로 쓴다('없음'으로 끝내지 않는다). */
export function EmptyState({ icon = 'leaf', title, message, action }: { icon?: IconName; title?: ReactNode; message: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-state">
      <span className="ui-state__icon"><Icon name={icon} size={24} /></span>
      {title && <p className="ui-state__title">{title}</p>}
      <p className="ui-state__msg">{message}</p>
      {action && <div className="ui-state__action">{action}</div>}
    </div>
  );
}

/** 비동기 오류. '다시 시도'를 늘 둔다. */
export function ErrorState({ message = '불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.', onRetry }: { message?: ReactNode; onRetry: () => void }) {
  return (
    <div className="ui-state ui-state--error" role="alert">
      <span className="ui-state__icon"><Icon name="alert" size={24} /></span>
      <p className="ui-state__msg">{message}</p>
      <div className="ui-state__action"><Button size="sm" icon="refresh" onClick={onRetry}>다시 시도</Button></div>
    </div>
  );
}

/** 비동기 로딩(분석 갱신, 신청 초안 작성 등). 줄 모양 자리 표시 + 읽어 줄 문장. */
export function LoadingState({ message = '불러오는 중이에요', lines = 3 }: { message?: string; lines?: number }) {
  return (
    <div className="ui-loading" role="status">
      <p className="ui-loading__msg">{message}</p>
      {Array.from({ length: lines }, (_, i) => <span key={i} className="ui-loading__line" aria-hidden="true" />)}
    </div>
  );
}
