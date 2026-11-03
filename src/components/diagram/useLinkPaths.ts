import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/** 이을 두 노드(id 는 nodeRef 로 등록한 이름)와 선의 클래스 */
export type LinkSpec = { key: string; from: string; to: string; className: string };
export type LinkPath = { key: string; d: string; className: string };

/** 선이 휘는 구간의 가로 길이(px) */
const FAN = 56;

/** 두 상자를 잇는 선. 곧게 뻗다가 도착 노드 앞에서만 휜다(노선도처럼). 위아래로 겹치면 오른쪽 바깥으로 돌아간다. */
export function linkPath(a: { right: number; top: number; height: number }, b: { left: number; right: number; top: number; height: number }) {
  const x1 = a.right;
  const y1 = a.top + a.height / 2;
  const y2 = b.top + b.height / 2;
  if (b.left - a.right > 8) {
    const x2 = b.left;
    const fan = Math.min(x2 - x1, FAN);
    const xs = x2 - fan;
    return `M${x1} ${y1} L${xs} ${y1} C${xs + fan / 2} ${y1} ${x2 - fan / 2} ${y2} ${x2} ${y2}`;
  }
  const x2 = b.right;
  const out = Math.max(x1, x2) + 14;
  return `M${x1} ${y1} C${out} ${y1} ${out} ${y2} ${x2} ${y2}`;
}

/**
 * 그림 안 노드 위치를 재서 선을 잇는다. 감싼 칸이 커지거나 글꼴이 늦게 와도 다시 잰다.
 * 반환: 감싼 칸 ref, 노드 등록 함수, 그릴 선. 선은 감싼 칸 기준 좌표다.
 */
export function useLinkPaths<T extends HTMLElement>(links: LinkSpec[]) {
  const wrap = useRef<T>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<LinkPath[]>([]);

  const measure = useCallback(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const rel = (r: DOMRect) => ({ left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, height: r.height });
    const next: LinkPath[] = [];
    for (const l of links) {
      const a = nodes.current.get(l.from)?.getBoundingClientRect();
      const b = nodes.current.get(l.to)?.getBoundingClientRect();
      if (a && b) next.push({ key: l.key, d: linkPath(rel(a), rel(b)), className: l.className });
    }
    setPaths(next);
  }, [links]);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const nodeRef = useCallback((id: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id); }, []);
  return { wrap, nodeRef, paths };
}
