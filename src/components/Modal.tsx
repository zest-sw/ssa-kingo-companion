import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from './useOverlay';
import { usePresence } from './usePresence';

type Props = {
  open: boolean; title: ReactNode; onClose: () => void; children?: ReactNode; actions: ReactNode;
  /** wide: 항목 하나의 자세히(예: 기회). 몸통만 안에서 스크롤하고 행동은 아래에 붙는다 */
  size?: 'wide';
  /**
   * 제목 위 작은 줄(분류·주최 등).
   * @deprecated 제목 위 눈썹 라벨은 템플릿 장식처럼 읽힌다. 새로 쓰지 말고 제목 아래 사실 줄이나 몸통 첫 줄로 옮긴다.
   */
  eyebrow?: ReactNode;
  /** 제목 옆 오른쪽(닫기 등) */
  aside?: ReactNode;
  /** 행동 줄 아래 작은 안내 */
  note?: ReactNode;
};

/**
 * 가운데 모달. 기본은 확인이 필요한 짧은 질문(예: 기록을 지울까요?). size="wide" 는 목록에서 고른 항목 하나의 자세히.
 * 열고 닫을 때 투명도 + 8px 이동(--dur-base). 닫힐 때도 움직임이 끝난 뒤 지운다. 닫으면 연 자리로 초점이 돌아간다.
 */
export function Modal(props: Props) {
  const { open, onClose } = props;
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useOverlay(open, box, onClose);
  const { mounted, phase, snapshot, onExited } = usePresence(open, props);
  if (!mounted) return null;
  const { title, children, actions, size, eyebrow, aside, note } = snapshot;
  const wide = size === 'wide';
  return createPortal(
    <div className="ui-scrim ui-scrim--center" data-state={phase} onAnimationEnd={onExited} onMouseDown={e => { if (open && e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className={wide ? 'ui-modal ui-modal--wide' : 'ui-modal'} role={wide ? 'dialog' : 'alertdialog'} aria-modal="true" aria-labelledby={id}>
        <div className="ui-modal__head">
          <div className="ui-modal__heading">
            {eyebrow && <div className="ui-modal__eyebrow">{eyebrow}</div>}
            <h2 id={id} tabIndex={-1} data-autofocus className="ui-modal__title">{title}</h2>
          </div>
          {aside}
        </div>
        {children && <div className="ui-modal__body">{children}</div>}
        <div className="ui-modal__actions">{actions}</div>
        {note && <p className="ui-modal__note">{note}</p>}
      </div>
    </div>,
    document.body
  );
}
