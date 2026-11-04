import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import type { Pt } from '../../domain/analysis/graphLayout';
import { IDENTITY, lerpView, panBy, toWorld, zoomAt, zoomPct, ZOOM, type View } from '../../domain/analysis/graphView';

/**
 * 그림 칸 확대·이동·끌기. 휠(커서 기준)·트랙패드 핀치·두 손가락 핀치로 확대, 빈 곳을 끌어 이동, 끌 수 있는 것(hit)은 옮긴다.
 * 보기는 React 상태가 아니라 ref 에 두고 requestAnimationFrame 마다 그림 묶음(content)의 transform 하나만 바꾼다.
 * 움직임이 멈추면(settled) 한 번 상태로 알려, 배율에 따라 바뀌는 그림(관계 이름 자리 등)만 다시 그린다.
 */
export type ZoomPanOptions = {
  /** '화면에 맞춤' 보기 */
  fit: () => View;
  /** 이동·확대 제한(그림을 잃지 않게) */
  bound?: (v: View) => View;
  /** 배율마다 칸에 둘 CSS 변수와 data-zoom 값(의미 기반 확대) */
  styleOf?: (k: number) => { vars: Record<string, string>; detail: string };
  /** 누른 것의 id 와 끌 수 있는지. null 이면 빈 곳(끌면 이동) */
  hit?: (target: Element) => { id: string; drag: boolean } | null;
  /** 끌기: 시작점에서 그림 좌표로 얼마나 옮겼나 */
  onDrag?: (id: string, delta: Pt, phase: 'start' | 'move' | 'end') => void;
  /** 보기가 바뀌어 그릴 때마다(툴팁처럼 보기를 따라가는 HTML 을 옮길 때) */
  onPaint?: (v: View) => void;
  /** 누름(끌지 않고 뗌). id 가 null 이면 빈 곳. count 2 는 두 번 누름 */
  onTap?: (id: string | null, count: 1 | 2) => void;
};

type Mode = 'idle' | 'pan' | 'node' | 'pinch';
type Gesture = { mode: Mode; id: string | null; start: Pt; view: View; moved: boolean; dist: number; mid: Pt };

/** 빈 곳은 4px 움직이면 이동. 누를 수 있는 것 위에서는 손떨림(트랙패드·빠른 클릭)을 누름으로 보도록 8px 까지 봐준다 */
const MOVE_PX = 4;
const CLICK_SLOP_PX = 8;
const DOUBLE_MS = 350;
const SETTLE_MS = 140;
const ANIM_MS = 260;
/** data-zp-ignore 안(도구 막대, 찾기 칸)은 이동·끌기를 시작하지 않는다 */
const IGNORE = '[data-zp-ignore]';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t: number) => 1 - (1 - t) ** 3;

export function useZoomPan(stage: RefObject<HTMLElement | null>, content: RefObject<SVGGElement | null>, options: ZoomPanOptions) {
  const opts = useRef(options);
  opts.current = options;
  const view = useRef<View>(IDENTITY);
  const [settled, setSettled] = useState<View>(IDENTITY);
  const [dragging, setDragging] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const frame = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const anim = useRef<{ from: View; to: View; t0: number } | null>(null);
  const said = useRef<number | null>(null);
  const detail = useRef('');

  const paint = useCallback((v: View) => {
    const g = content.current, el = stage.current;
    if (g) g.setAttribute('transform', `translate(${v.x} ${v.y}) scale(${v.k})`);
    const s = el && opts.current.styleOf?.(v.k);
    if (el && s) {
      for (const [k, val] of Object.entries(s.vars)) el.style.setProperty(k, val);
      if (detail.current !== s.detail) { detail.current = s.detail; el.dataset.zoom = s.detail; }
    }
    opts.current.onPaint?.(v);
  }, [content, stage]);

  const settle = useCallback(() => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const v = view.current;
      setSettled(v);
      const pct = zoomPct(v.k);
      if (said.current !== null && said.current !== pct) setAnnounce(`확대 ${pct}%`);
      said.current = pct;
    }, SETTLE_MS);
  }, []);

  const tick = useCallback((now: number) => {
    frame.current = 0;
    const a = anim.current;
    if (a) {
      const t = Math.min(1, (now - a.t0) / ANIM_MS);
      view.current = t >= 1 ? a.to : lerpView(a.from, a.to, ease(t));
      if (t >= 1) anim.current = null;
      else frame.current = requestAnimationFrame(tick);
    }
    paint(view.current);
    settle();
  }, [paint, settle]);

  /** how: now = 바로(첫 배치), frame = 다음 그림 때, animate = 부드럽게(줄인 움직임 설정이면 바로) */
  const set = useCallback((v: View, how: 'now' | 'frame' | 'animate' = 'frame') => {
    const next = opts.current.bound ? opts.current.bound(v) : v;
    if (how === 'animate' && !reduced()) {
      anim.current = { from: view.current, to: next, t0: performance.now() };
    } else if (how === 'frame' && anim.current) {
      // 부드럽게 옮기는 중에 키를 더 누르면 목적지만 바꿔 이어서 간다
      anim.current = { ...anim.current, to: next };
    } else {
      anim.current = null;
      view.current = next;
    }
    if (how === 'now') {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      paint(next);
      setSettled(next);
      said.current = zoomPct(next.k);
      return;
    }
    if (!frame.current) frame.current = requestAnimationFrame(tick);
  }, [paint, tick]);

  const center = (): Pt => {
    const el = stage.current;
    return el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : { x: 0, y: 0 };
  };
  /** 움직이는 중이면 그 목적지, 아니면 지금 보기. 연달아 누른 확대·이동이 서로 지우지 않게 여기서 시작한다 */
  const target = () => anim.current?.to ?? view.current;
  const zoomBy = useCallback((f: number, at?: Pt) => set(zoomAt(target(), f, at ?? center()), 'animate'), [set]); // eslint-disable-line react-hooks/exhaustive-deps
  const fit = useCallback((how: 'now' | 'animate' = 'animate') => set(opts.current.fit(), how), [set]);

  // 휠은 칸 안에서만 가로챈다(passive 가 아니어야 막을 수 있다). ctrl 휠 = 트랙패드 핀치.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.(IGNORE)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      anim.current = null;
      set(zoomAt(view.current, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), { x: e.clientX - r.left, y: e.clientY - r.top }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [stage, set]);

  useLayoutEffect(() => () => { cancelAnimationFrame(frame.current); clearTimeout(settleTimer.current); }, []);

  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture>({ mode: 'idle', id: null, start: { x: 0, y: 0 }, view: IDENTITY, moved: false, dist: 0, mid: { x: 0, y: 0 } });
  const lastTap = useRef<{ id: string | null; t: number }>({ id: null, t: 0 });

  const local = (e: PointerEvent): Pt => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const capture = (id: number) => { try { stage.current?.setPointerCapture?.(id); } catch { /* 이미 뗀 포인터 */ } };
  const pair = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  const endDrag = (g: Gesture) => {
    if (g.mode === 'node' && g.moved && g.id) { opts.current.onDrag?.(g.id, dragDelta(g), 'end'); setDragging(null); }
  };
  const dragDelta = (g: Gesture): Pt => {
    const p = [...pointers.current.values()][0] ?? g.start;
    return { x: (p.x - g.start.x) / g.view.k, y: (p.y - g.start.y) / g.view.k };
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if ((e.target as Element).closest(IGNORE)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // 마우스는 하나뿐이다. 칸 밖에서 뗀 지난 누름이 남아 핀치로 잘못 읽히지 않게 비운다
    if (e.pointerType === 'mouse') pointers.current.clear();
    pointers.current.set(e.pointerId, local(e));
    anim.current = null;
    const g = gesture.current;
    if (pointers.current.size === 2) {
      endDrag(g);
      for (const pid of pointers.current.keys()) capture(pid);
      const { dist, mid } = pair();
      gesture.current = { mode: 'pinch', id: null, start: mid, view: view.current, moved: true, dist, mid };
      return;
    }
    if (pointers.current.size > 2) return;
    const hit = opts.current.hit?.(e.target as Element) ?? null;
    gesture.current = { mode: hit?.drag ? 'node' : 'pan', id: hit?.id ?? null, start: local(e), view: view.current, moved: false, dist: 0, mid: { x: 0, y: 0 } };
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (g.mode === 'pinch' && pointers.current.size >= 2) {
      const { dist, mid } = pair();
      set(zoomAt(panBy(g.view, mid.x - g.mid.x, mid.y - g.mid.y), dist / g.dist, mid));
      return;
    }
    const p = local(e);
    if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) < (g.id ? CLICK_SLOP_PX : MOVE_PX)) return;
    // 끌기가 시작될 때만 잡는다. 그냥 누르면 노드가 평소처럼 포커스를 받는다
    if (!g.moved) capture(e.pointerId);
    if (g.mode === 'pan') {
      g.moved = true;
      g.id = null;
      set(panBy(g.view, p.x - g.start.x, p.y - g.start.y));
    } else if (g.mode === 'node' && g.id) {
      if (!g.moved) { g.moved = true; setDragging(g.id); opts.current.onDrag?.(g.id, dragDelta(g), 'start'); }
      opts.current.onDrag?.(g.id, dragDelta(g), 'move');
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    if (g.mode === 'node' || g.mode === 'pan') {
      if (g.moved) endDrag(g);
      else if (e.type === 'pointerup') {
        const now = performance.now();
        const second = lastTap.current.id === g.id && now - lastTap.current.t < DOUBLE_MS;
        lastTap.current = second ? { id: null, t: 0 } : { id: g.id, t: now };
        opts.current.onTap?.(g.id, second ? 2 : 1);
      }
    }
    pointers.current.delete(e.pointerId);
    // 잡은 포인터를 바로 놓는다. 다음 누름이 노드·이름표로 곧장 가게
    try { if (stage.current?.hasPointerCapture?.(e.pointerId)) stage.current.releasePointerCapture(e.pointerId); } catch { /* 이미 풀림 */ }
    // 핀치 중 손가락 하나를 떼면 남은 손가락으로 이어서 이동한다
    if (pointers.current.size === 1 && g.mode === 'pinch') {
      const [p] = [...pointers.current.values()];
      gesture.current = { mode: 'pan', id: null, start: p, view: view.current, moved: true, dist: 0, mid: p };
    } else if (pointers.current.size === 0) gesture.current = { ...g, mode: 'idle' };
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey || (e.target as Element).closest('input,textarea,select')) return;
    const step = e.shiftKey ? 120 : 40;
    const keys: Record<string, () => void> = {
      '+': () => zoomBy(ZOOM.step), '=': () => zoomBy(ZOOM.step), '-': () => zoomBy(1 / ZOOM.step), '_': () => zoomBy(1 / ZOOM.step), '0': () => fit(),
      ArrowLeft: () => set(panBy(target(), step, 0)), ArrowRight: () => set(panBy(target(), -step, 0)),
      ArrowUp: () => set(panBy(target(), 0, step)), ArrowDown: () => set(panBy(target(), 0, -step))
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  return {
    /** 지금 보기(움직이는 중에도 최신) */
    view: () => view.current,
    /** 멈춘 뒤의 보기 */
    settled,
    dragging,
    announce,
    set, zoomBy, fit,
    toWorld: (p: Pt) => toWorld(view.current, p),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onKeyDown }
  };
}
