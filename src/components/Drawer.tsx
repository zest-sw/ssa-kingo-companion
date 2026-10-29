import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { useOverlay } from './useOverlay';

type Props = { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; eyebrow?: ReactNode };

/**
 * 오른쪽 서랍(폭 480px). 상세는 모달이 아니라 서랍이 기본이다.
 * ESC·바깥 클릭으로 닫히고, 닫히면 연 버튼으로 포커스가 돌아간다.
 */
export function Drawer({ open, title, onClose, children, footer, eyebrow }: Props) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useOverlay(open, box, onClose);
  if (!open) return null;
  return createPortal(
    <div className="ui-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} className="ui-drawer" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="ui-drawer__head">
          <div>
            {eyebrow && <p className="ui-drawer__eyebrow">{eyebrow}</p>}
            <h2 id={id} tabIndex={-1} data-autofocus className="ui-drawer__title">{title}</h2>
          </div>
          <IconButton icon="x" label="닫기" onClick={onClose} />
        </div>
        <div className="ui-drawer__body">{children}</div>
        {footer && <div className="ui-drawer__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
