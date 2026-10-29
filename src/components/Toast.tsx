import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ToastItem = { id: number; message: string; onUndo?: () => void };
type ShowToast = (message: string, opts?: { onUndo?: () => void }) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** 짧은 결과 알림. 되돌릴 수 있는 행동이면 onUndo 를 넘긴다(8초, 없으면 5초 뒤 사라짐). */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast 는 ToastProvider 안에서만 쓴다');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const show = useCallback<ShowToast>((message, opts) => setToast({ id: Date.now(), message, onUndo: opts?.onUndo }), []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.onUndo ? 8000 : 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="ui-toast-region" role="status" aria-live="polite">
        {toast && <Toast key={toast.id} message={toast.message} onUndo={toast.onUndo && (() => { toast.onUndo?.(); setToast(null); })} onClose={() => setToast(null)} />}
      </div>
    </ToastContext.Provider>
  );
}

/** 토스트 한 장. 보통은 useToast 로 띄우고, 이 컴포넌트를 직접 쓰는 곳은 컴포넌트 목록(#/_kit)뿐이다. */
export function Toast({ message, onUndo, onClose }: { message: string; onUndo?: () => void; onClose?: () => void }) {
  return (
    <div className="ui-toast">
      <span>{message}</span>
      {onUndo && <button type="button" className="ui-toast__btn" onClick={onUndo}>되돌리기</button>}
      {onClose && <button type="button" className="ui-toast__btn ui-toast__btn--quiet" aria-label="알림 닫기" onClick={onClose}>닫기</button>}
    </div>
  );
}
