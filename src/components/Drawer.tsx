import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { useOverlay } from './useOverlay';
import { usePresence } from './usePresence';

type Props = {
  open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode;
  /** @deprecated 제목 위 눈썹 라벨은 템플릿 장식처럼 읽힌다. 새로 쓰지 말고 몸통 첫 줄로 옮긴다. */
  eyebrow?: ReactNode;
};

/**
 * 오른쪽 서랍(폭 480px). 상세는 모달이 아니라 서랍이 기본이다.
 * ESC·바깥 클릭으로 닫히고, 닫히면 연 버튼으로 포커스가 돌아간다. 열고 닫을 때 투명도 + 8px 이동(닫힐 때도 움직인 뒤 지운다).
 */
export function Drawer(props: Props) {
  const { open, onClose } = props;
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useOverlay(open, box, onClose);
  const { mounted, phase, snapshot, onExited } = usePresence(open, props);
  if (!mounted) return null;
  const { title, children, footer, eyebrow } = snapshot;
  return createPortal(
    <div className="ui-scrim" data-state={phase} onAnimationEnd={onExited} onMouseDown={e => { if (open && e.target === e.currentTarget) onClose(); }}>
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
