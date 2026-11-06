import { useLayoutEffect, type RefObject } from 'react';

type Box = { left: number; right: number; top: number; bottom: number };

/**
 * 토스트 아래 여백(px). 토스트 자리는 앱 전체 아래 가운데 하나다(v3.1). 모달·서랍이 열려 있고
 * 그 자리에 두면 맨 위 층의 행동 줄(행동 버튼 + 아래 안내 줄)을 가릴 때만, 행동 줄 위로 올린다(행동 줄 높이 + 간격).
 * 겹치지 않으면 0(제자리). 넓은 창의 서랍처럼 가로로 비켜 있으면 올리지 않는다.
 */
export function toastLift(toast: { left: number; right: number; height: number }, foot: Box | null, vh: number, base: number, gap: number): number {
  if (!foot) return 0;
  const bottom = vh - base;
  const across = toast.left < foot.right && toast.right > foot.left;
  const along = bottom - toast.height < foot.bottom && bottom > foot.top;
  return across && along ? Math.ceil(vh - foot.top + gap) : 0;
}

/** 맨 위에 열린(닫히는 중이 아닌) 모달·서랍의 행동 줄 칸: 행동 줄 위 끝부터 상자 아래 끝까지 */
function overlayFoot(): Box | null {
  const scrims = document.querySelectorAll<HTMLElement>('.ui-scrim:not([data-state="closing"])');
  const top = scrims[scrims.length - 1];
  const box = top?.querySelector<HTMLElement>('.ui-modal, .ui-drawer');
  const actions = box?.querySelector<HTMLElement>(':scope > .ui-modal__actions, :scope > .ui-drawer__foot');
  if (!box || !actions) return null;
  const b = box.getBoundingClientRect();
  return { left: b.left, right: b.right, top: actions.getBoundingClientRect().top, bottom: b.bottom };
}

const px = (el: Element, name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;

/**
 * 토스트가 떠 있는 동안 모달·서랍이 열리고 닫히거나 창 크기가 바뀌면 자리를 다시 잡는다.
 * 여는 움직임(8px)이 끝난 뒤에도 한 번 더 잰다. 값은 영역의 --toast-over 로 넘긴다(components.css).
 */
export function useToastPlace(region: RefObject<HTMLElement | null>, on: boolean) {
  useLayoutEffect(() => {
    const el = region.current;
    if (!el || !on) return;
    let raf = 0;
    const place = () => {
      const toast = el.firstElementChild?.getBoundingClientRect();
      const lift = toast ? toastLift(toast, overlayFoot(), window.innerHeight, px(el, '--space-6'), px(el, '--space-3')) : 0;
      if (lift) el.style.setProperty('--toast-over', `${lift}px`);
      else el.style.removeProperty('--toast-over');
    };
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    place();
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    document.addEventListener('animationend', later, true);
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      document.removeEventListener('animationend', later, true);
      window.removeEventListener('resize', later);
      el.style.removeProperty('--toast-over');
    };
  }, [region, on]);
}
