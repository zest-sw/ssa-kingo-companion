import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from './useOverlay';

type Props = { open: boolean; title: ReactNode; onClose: () => void; children?: ReactNode; actions: ReactNode };

/** 가운데 모달. 확인이 필요한 짧은 질문에만 쓴다(예: 기록을 지울까요?). 상세는 Drawer. */
export function Modal({ open, title, onClose, children, actions }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useOverlay(open, box, onClose);
  if (!open) return null;
  return createPortal(
    <div className="ui-scrim ui-scrim--center" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className="ui-modal" role="alertdialog" aria-modal="true" aria-labelledby={id}>
        <h2 id={id} tabIndex={-1} data-autofocus className="ui-modal__title">{title}</h2>
        {children && <div className="ui-modal__body">{children}</div>}
        <div className="ui-modal__actions">{actions}</div>
      </div>
    </div>,
    document.body
  );
}
