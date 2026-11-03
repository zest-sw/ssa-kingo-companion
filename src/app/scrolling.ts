import { useEffect } from 'react';

const IDLE_MS = 700;

/**
 * 스크롤하는 동안 그 칸에 data-scrolling 을 붙인다. base.css 가 이 표시가 있을 때만 스크롤바를 진하게 그린다.
 * 칸마다 따로 붙이지 않고 문서에서 한 번 듣는다(scroll 은 버블링하지 않아 캡처로 듣는다).
 */
export function useScrollingMark() {
  useEffect(() => {
    const timers = new Map<Element, number>();
    const onScroll = (e: Event) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el) return;
      if (!timers.has(el)) el.setAttribute('data-scrolling', '');
      window.clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => { el.removeAttribute('data-scrolling'); timers.delete(el); }, IDLE_MS));
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      timers.forEach((t, el) => { window.clearTimeout(t); el.removeAttribute('data-scrolling'); });
    };
  }, []);
}
