import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/** 토스트가 떠 있는 시간. 마우스를 올리거나 버튼에 초점이 있는 동안은 멈춘다 */
export const TOAST_MS = 5000;

type ToastOpts = {
  /** 동작 버튼 이름(예: '되돌리기'). onAction 과 함께 준다 */
  actionLabel?: string;
  onAction?: () => void;
  /** 옛 이름. actionLabel='되돌리기' + onAction 과 같다 */
  onUndo?: () => void;
};
type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void };
type ShowToast = (message: string, opts?: ToastOpts) => void;

const ToastContext = createContext<ShowToast | null>(null);

/**
 * 짧은 결과 알림. 한 번에 하나만 뜨고(새 것이 옛 것을 바꾼다) 5초 뒤 사라진다.
 * 되돌릴 수 있는 행동이면 { actionLabel: '되돌리기', onAction } 을 넘긴다. 버튼은 하나뿐이다.
 */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast 는 ToastProvider 안에서만 쓴다');
  return show;
}

const normalize = (id: number, message: string, opts?: ToastOpts): ToastItem => {
  const onAction = opts?.onAction ?? opts?.onUndo;
  return { id, message, onAction, actionLabel: onAction ? (opts?.actionLabel ?? '되돌리기') : undefined };
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const seq = useRef(0);
  const show = useCallback<ShowToast>((message, opts) => setToast(normalize(++seq.current, message, opts)), []);
  const close = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* 알림 칸은 늘 있어야 스크린 리더가 새 글을 읽는다 */}
      <div className="ui-toast-region" role="status" aria-live="polite">
        {toast && (
          <Toast
            key={toast.id} message={toast.message} actionLabel={toast.actionLabel} timeout={TOAST_MS} onClose={close}
            onAction={toast.onAction && (() => { toast.onAction?.(); close(); })}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** 남은 시간을 재다가 멈췄다 이어 간다 */
function useDismiss(timeout: number | undefined, onClose: (() => void) | undefined) {
  const [paused, setPaused] = useState(false);
  const left = useRef(timeout ?? 0);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!timeout || paused) return;
    const started = Date.now();
    const t = window.setTimeout(() => close.current?.(), left.current);
    return () => { window.clearTimeout(t); left.current -= Date.now() - started; };
  }, [timeout, paused]);
  return setPaused;
}

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** 옛 이름. actionLabel 없이 주면 '되돌리기' 버튼 */
  onUndo?: () => void;
  /** 이 시간(ms) 뒤 onClose. 보통은 ToastProvider 가 넘긴다 */
  timeout?: number;
  onClose?: () => void;
};

/** 토스트 한 장. 보통은 useToast 로 띄우고, 이 컴포넌트를 직접 쓰는 곳은 컴포넌트 목록(#/_kit)뿐이다. */
export function Toast({ message, actionLabel, onAction, onUndo, timeout, onClose }: Props) {
  const act = onAction ?? onUndo;
  const label = act ? (actionLabel ?? '되돌리기') : undefined;
  const setPaused = useDismiss(timeout, onClose);
  const pause = () => setPaused(true);
  const resume = () => setPaused(false);
  return (
    <div className="ui-toast" onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}>
      <span>{message}</span>
      {act && <button type="button" className="ui-toast__btn" onClick={act}>{label}</button>}
    </div>
  );
}
