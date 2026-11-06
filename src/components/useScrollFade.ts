import { useEffect, type RefObject } from 'react';

/**
 * 안에서 스크롤하는 칸의 위·아래 흐림(TDS 메뉴 레퍼런스). 더 있는 쪽에만 data-fade 에 'top'·'bottom' 을 적고,
 * CSS(.ui-fade)가 그 가장자리를 mask 로 옅게 만든다. 넘치지 않으면 흐림이 없다.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      // 1px 여유: 배율에서 scrollTop 이 소수로 남는다
      const top = el.scrollTop > 1;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      const v = [top && 'top', bottom && 'bottom'].filter(Boolean).join(' ');
      if ((el.dataset.fade ?? '') !== v) {
        if (v) el.dataset.fade = v; else delete el.dataset.fade;
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    ro?.observe(el);
    const watch = () => { ro?.disconnect(); ro?.observe(el); el.childNodes.forEach(c => { if (c instanceof Element) ro?.observe(c); }); };
    watch();
    // 내용이 바뀌면(목록이 늘거나 줄면) 다시 본다
    const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => { watch(); schedule(); });
    mo?.observe(el, { childList: true, subtree: true });
    return () => { el.removeEventListener('scroll', schedule); ro?.disconnect(); mo?.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [ref]);
}
