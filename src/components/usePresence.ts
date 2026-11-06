import { useEffect, useRef, useState } from 'react';

/** 닫힘 움직임이 끝나지 않을 때(탭이 숨겨짐 등) 그래도 지우는 시간. --dur-base 보다 넉넉히 */
const FALLBACK_MS = 400;

/**
 * 열고 닫는 오버레이(모달·서랍)용. open 이 false 가 돼도 닫힘 움직임이 끝날 때까지 남겨 둔다.
 * phase: 'open' | 'closing'. mounted 가 false 면 그리지 않는다. 닫힐 때는 마지막으로 열려 있던 내용(snapshot)을 그린다.
 * onExited 는 닫힘 움직임 요소의 animationend 에 단다.
 */
export function usePresence<T>(open: boolean, content: T) {
  const [mounted, setMounted] = useState(open);
  const last = useRef(content);
  if (open) last.current = content;

  useEffect(() => {
    if (open) { setMounted(true); return; }
    if (!mounted) return;
    const t = window.setTimeout(() => setMounted(false), FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  const onExited = (e: { target: EventTarget; currentTarget: EventTarget }) => {
    if (!open && e.target === e.currentTarget) setMounted(false);
  };
  return { mounted: open || mounted, phase: open ? 'open' : 'closing', snapshot: open ? content : last.current, onExited } as const;
}
