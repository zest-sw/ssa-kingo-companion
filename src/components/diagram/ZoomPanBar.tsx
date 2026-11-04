import type { ReactNode } from 'react';
import { ZOOM } from '../../domain/analysis/graphView';

type Props = {
  k: number;
  onIn: () => void; onOut: () => void; onFit: () => void;
  /** 처음 배치로(옮긴 노드도 되돌림). 없으면 버튼을 두지 않는다 */
  onReset?: () => void;
  /** 스크린 리더에 읽어 줄 배율 변화('확대 150%') */
  announce: string;
  /** 막대 맨 앞에 더 둘 것(찾기 등) */
  children?: ReactNode;
  className?: string;
};

const P = {
  in: <path d="M12 5v14M5 12h14" />,
  out: <path d="M5 12h14" />,
  fit: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  reset: <><path d="M5 12a7 7 0 1 0 2.05-4.95" /><path d="M5 4.5V8h3.5" /></>
};

/** 도구 막대 아이콘. 공용 Icon 과 같은 선(1.5)·크기(16) */
export function ZoomIcon({ children }: { children: ReactNode }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
  );
}

/** 확대·축소·화면에 맞춤·처음 배치로. 자리(칸 오른쪽 위 등)는 부르는 쪽 CSS 가 정한다. */
export function ZoomPanBar({ k, onIn, onOut, onFit, onReset, announce, children, className }: Props) {
  const btn = (label: string, key: string, icon: ReactNode, on: () => void, disabled = false) => (
    <button type="button" className="ui-icon-btn" aria-label={label} title={`${label} (${key})`} onClick={on} disabled={disabled}>
      <ZoomIcon>{icon}</ZoomIcon>
    </button>
  );
  return (
    <div className={className} role="toolbar" aria-label="그림 보기" aria-orientation="vertical" data-zp-ignore>
      {children}
      {btn('확대', '+', P.in, onIn, k >= ZOOM.max - 1e-3)}
      {btn('축소', '-', P.out, onOut, k <= ZOOM.min + 1e-3)}
      {btn('화면에 맞춤', '0', P.fit, onFit)}
      {onReset && <button type="button" className="ui-icon-btn" aria-label="처음 배치로" title="처음 배치로" onClick={onReset}><ZoomIcon>{P.reset}</ZoomIcon></button>}
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  );
}
