import { useLayoutEffect, useRef, useState } from 'react';

/** 요소 폭을 따라간다. 눈금 간격·줄 나누기처럼 픽셀이 필요한 계산에만 쓴다(위치 자체는 % 로 그린다). */
export function useWidth<T extends HTMLElement>(fallback = 960) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}
