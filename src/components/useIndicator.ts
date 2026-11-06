import { useLayoutEffect, type RefObject } from 'react';

/**
 * 탭 줄 밑줄 하나를 고른 칸 아래로 옮긴다. 줄(root)에 --ind-x, --ind-w 를 적고 CSS(::after)가 미끄러지게 그린다.
 * 첫 자리를 잡은 뒤에만 data-ind="ready" 로 움직임을 켠다(처음 그릴 때 왼쪽에서 날아오지 않게).
 * selector 는 지금 칸을 찾는 CSS 선택자, key 는 지금 칸이 바뀌었음을 알리는 값.
 */
export function useIndicator(root: RefObject<HTMLElement | null>, selector: string, key: string | undefined) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const place = () => {
      const cur = el.querySelector<HTMLElement>(selector);
      if (!cur) { el.style.setProperty('--ind-w', '0px'); return; }
      el.style.setProperty('--ind-x', `${cur.offsetLeft}px`);
      el.style.setProperty('--ind-w', `${cur.offsetWidth}px`);
    };
    place();
    if (el.dataset.ind !== 'ready') {
      el.dataset.ind = 'placed';
      // 다음 그림부터 움직인다
      const raf = requestAnimationFrame(() => { el.dataset.ind = 'ready'; });
      return () => cancelAnimationFrame(raf);
    }
  }, [root, selector, key]);

  // 폭이 바뀌면(창 크기, 글꼴이 늦게 옴) 다시 잰다
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const cur = el.querySelector<HTMLElement>(selector);
      if (!cur) return;
      el.style.setProperty('--ind-x', `${cur.offsetLeft}px`);
      el.style.setProperty('--ind-w', `${cur.offsetWidth}px`);
    });
    ro.observe(el);
    el.querySelectorAll(':scope > *').forEach(c => ro.observe(c));
    return () => ro.disconnect();
  }, [root, selector]);
}
