import { useLayoutEffect, useRef, type FocusEvent, type KeyboardEvent, type RefObject } from 'react';
import { dirOfKey, nearestInDirection, stepGroup, type KeyPt } from '../../domain/analysis/keyNav';

/*
 * 그림(경험 지도·테크 트리) 키보드 규칙 하나. 그림 전체가 Tab 한 번(roving tabindex).
 * 칸 표시: data-rove="<키>" (그리는 쪽은 tabIndex={-1} 로 두고, 지금 칸만 이 훅이 0 으로 바꾼다)
 *          data-rove-weight="2"(방향키가 덜 고르는 칸)  data-rove-start(처음 Tab 으로 들어올 칸, 없으면 첫 칸)  data-rove-group="<묶음>"  data-rove-head(묶음 이름 칸, 방향키 대상에서 빠지고 [ ] 가 먼저 간다)
 * 방향키: 화면에서 그 방향으로 가장 가까운 칸. [ ]: 앞·다음 묶음. Esc: 그림 밖 다음 초점 자리로. Enter·Space 는 칸이 맡는다.
 */
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const centerOf = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, seen: r.width > 0 || r.height > 0 };
};

export function usePictureKeys(box: RefObject<HTMLElement | null>, opts: { onEscape?: () => boolean; scroll?: boolean } = {}) {
  const cur = useRef<string | null>(null);
  const esc = useRef(opts.onEscape);
  esc.current = opts.onEscape;

  const items = () => [...(box.current?.querySelectorAll<HTMLElement | SVGElement>('[data-rove]') ?? [])];
  const keyOf = (el: Element) => el.getAttribute('data-rove') ?? '';
  const apply = () => {
    const all = items();
    const on = all.find(el => keyOf(el) === cur.current) ?? all.find(el => el.hasAttribute('data-rove-start')) ?? all[0];
    for (const el of all) el.tabIndex = el === on ? 0 : -1;
  };
  // 다시 그릴 때마다 맞춘다(칸이 새로 생기거나 사라져도 Tab 자리는 하나)
  useLayoutEffect(apply);

  const move = (el: HTMLElement | SVGElement | undefined) => {
    if (!el) return;
    cur.current = keyOf(el);
    apply();
    // 확대·이동 그림(경험 지도)은 스스로 옮긴다. 안에서 스크롤되는 그림(테크 트리)만 브라우저가 스크롤한다
    el.focus({ preventScroll: !opts.scroll });
  };

  const onFocus = (e: FocusEvent) => {
    const el = (e.target as Element).closest('[data-rove]');
    if (!el || !box.current?.contains(el)) return;
    cur.current = keyOf(el);
    apply();
  };

  /** 처리했으면 true. 처리하지 않은 키는 그림의 다른 키(확대·이동)로 넘긴다 */
  const onKeyDown = (e: KeyboardEvent): boolean => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.nativeEvent.isComposing) return false;
    const here = (e.target as Element).closest<HTMLElement | SVGElement>('[data-rove]');
    if (e.key === 'Escape') {
      if (esc.current?.()) { e.preventDefault(); return true; }
      if (!here) return false;
      e.preventDefault();
      leave();
      return true;
    }
    if (!here || !box.current?.contains(here)) return false;
    const dir = dirOfKey(e.key);
    if (dir && !e.shiftKey) {
      e.preventDefault();
      const all = items();
      const from = centerOf(here);
      const pts: KeyPt[] = all.filter(el => !el.hasAttribute('data-rove-head')).flatMap(el => {
        const c = centerOf(el);
        return c.seen ? [{ id: keyOf(el), x: c.x, y: c.y, weight: Number(el.getAttribute('data-rove-weight')) || 1 }] : [];
      });
      const to = nearestInDirection(pts, from, dir, keyOf(here));
      move(all.find(el => keyOf(el) === to));
      return true;
    }
    if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      const all = items();
      const groups = [...new Set(all.map(el => el.getAttribute('data-rove-group')).filter((g): g is string => !!g))];
      const own = all.filter(el => el.getAttribute('data-rove-group') === here.getAttribute('data-rove-group'));
      // 묶음 이름 칸이 없는 그림(테크 트리)은 그 줄의 첫 칸이 이름 자리다
      const onName = here.hasAttribute('data-rove-head') || (!own.some(el => el.hasAttribute('data-rove-head')) && own[0] === here);
      const g = stepGroup(groups.length, groups.indexOf(here.getAttribute('data-rove-group') ?? ''), onName, e.key === ']' ? 1 : -1);
      const inGroup = all.filter(el => el.getAttribute('data-rove-group') === groups[g]);
      move(inGroup.find(el => el.hasAttribute('data-rove-head')) ?? inGroup[0]);
      return true;
    }
    return false;
  };

  /** 그림 밖, 문서 순서로 다음 초점 자리로. 그림이 끝이면 바로 앞 자리로(body 로 떨어지면 키보드 자리를 잃는다) */
  const leave = () => {
    const stage = box.current;
    if (!stage) return;
    const outside = [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => !stage.contains(el) && el.offsetParent !== null);
    const after = (el: HTMLElement) => !!(stage.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    const next = outside.find(after) ?? outside.filter(el => !after(el)).pop();
    next?.focus();
  };

  return { onKeyDown, onFocus };
}
