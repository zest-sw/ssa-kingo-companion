import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/** 토스트가 떠 있는 시간. 마우스를 올리거나 초점이 토스트 안에 있는 동안은 멈춘다 */
export const TOAST_MS = 5000;
/** 되돌리기 같은 동작 버튼이 있으면 키보드로 버튼에 닿을 시간을 더 준다 */
export const TOAST_ACTION_MS = 7000;

type ToastOpts = {
  /** 동작 버튼 이름(예: '되돌리기'). onAction 과 함께 준다 */
  actionLabel?: string;
  onAction?: () => void;
  /** 옛 이름. actionLabel='되돌리기' + onAction 과 같다 */
  onUndo?: () => void;
  /**
   * true 면 줄을 선다: 떠 있는 토스트가 닫힌 뒤에 뜬다(도전 과제 달성처럼 행동 결과에 딸려 오는 알림).
   * 줄 선 토스트가 떠 있을 때 결과 토스트가 오면 결과가 먼저 뜨고, 밀려난 것은 줄 맨 앞으로 돌아간다.
   */
  after?: boolean;
};
type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void; after?: boolean };
type ShowToast = (message: string, opts?: ToastOpts) => void;

/** 앞 토스트가 닫히고 줄 선 토스트가 뜨기까지 쉬는 틈. 같은 순간에 오는 결과 토스트가 먼저 자리를 잡게 한다 */
export const TOAST_GAP_MS = 400;

const ToastContext = createContext<ShowToast | null>(null);

/**
 * 짧은 결과 알림. 앱 전체에서 아래 가운데 한 자리에만 뜬다(화면을 바꿔도 옮겨 다니지 않는다).
 * 한 번에 하나만 뜨고(새 결과가 옛 결과를 바꾼다) 5초, 동작 버튼이 있으면 7초 뒤 사라진다.
 * 되돌릴 수 있는 행동이면 { actionLabel: '되돌리기', onAction } 을 넘긴다. 버튼은 하나뿐이다.
 * 결과 뒤에 말할 알림은 { after: true } 로 줄을 세운다. 그래서 결과 → 달성 순서가 늘 지켜진다.
 */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast 는 ToastProvider 안에서만 쓴다');
  return show;
}

const normalize = (id: number, message: string, opts?: ToastOpts): ToastItem => {
  const onAction = opts?.onAction ?? opts?.onUndo;
  return { id, message, onAction, actionLabel: onAction ? (opts?.actionLabel ?? '되돌리기') : undefined, after: opts?.after };
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const seq = useRef(0);
  // 같은 이벤트 안에서 이어 부를 때도 순서를 지키려고, 렌더를 기다리지 않는 ref 로 지금 토스트를 든다
  const current = useRef<ToastItem | null>(null);
  const queue = useRef<ToastItem[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const put = useCallback((item: ToastItem | null) => { current.current = item; setToast(item); }, []);
  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    if (current.current || !queue.current.length) return;
    timer.current = window.setTimeout(() => { if (!current.current) put(queue.current.shift() ?? null); }, TOAST_GAP_MS);
  }, [put]);
  const show = useCallback<ShowToast>((message, opts) => {
    const item = normalize(++seq.current, message, opts);
    if (item.after) { queue.current.push(item); schedule(); return; }
    if (current.current?.after) queue.current.unshift(current.current);
    window.clearTimeout(timer.current);
    put(item);
  }, [put, schedule]);
  const close = useCallback(() => { put(null); schedule(); }, [put, schedule]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* 알림 칸은 늘 있어야 스크린 리더가 새 글을 읽는다 */}
      <div className="ui-toast-region" role="status" aria-live="polite">
        {toast && (
          <Toast
            key={toast.id} message={toast.message} actionLabel={toast.actionLabel} timeout={toast.onAction ? TOAST_ACTION_MS : TOAST_MS} onClose={close}
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
  // 마우스와 초점 중 하나라도 토스트에 있으면 멈춘다(마우스가 나가도 초점이 남아 있으면 계속 멈춤)
  const hover = useRef(false);
  const focus = useRef(false);
  const sync = () => setPaused(hover.current || focus.current);
  return (
    <div
      className="ui-toast"
      onMouseEnter={() => { hover.current = true; sync(); }}
      onMouseLeave={() => { hover.current = false; sync(); }}
      onFocus={() => { focus.current = true; sync(); }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { focus.current = false; sync(); } }}
    >
      <span>{message}</span>
      {act && <button type="button" className="ui-toast__btn" onClick={act}>{label}</button>}
    </div>
  );
}
