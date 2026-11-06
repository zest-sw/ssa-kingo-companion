import type { Axis } from '../types';
import { AXES } from '../vocab';
import type { Cluster, GraphNode, KnowledgeGraph, RecordNode } from './graph';
import { hullAround, type GraphLayout, type Pt, type Rect } from './graphLayout';

// 경험 지도를 직접 만지는 데 쓰는 순수 계산: 확대 배율·이동(보기), 화면에 맞춤, 커서 기준 확대, 끌어 옮긴 노드, 찾기, 툴팁 요약.
// 화면 좌표 = 그림 좌표 × k + (x, y).

export type View = { k: number; x: number; y: number };
export const ZOOM = { min: 0.5, max: 3, step: 1.25 } as const;
export const IDENTITY: View = { k: 1, x: 0, y: 0 };

export const clampK = (k: number, min: number = ZOOM.min, max: number = ZOOM.max) => Math.min(max, Math.max(min, k));
export const toWorld = (v: View, p: Pt): Pt => ({ x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k });
export const toScreen = (v: View, p: Pt): Pt => ({ x: p.x * v.k + v.x, y: p.y * v.k + v.y });
export const panBy = (v: View, dx: number, dy: number): View => ({ k: v.k, x: v.x + dx, y: v.y + dy });
export const zoomPct = (k: number) => Math.round(k * 100);

/** 커서(화면 점 at) 아래 그림 점이 그대로 있게 factor 배 확대한다. 범위 끝이면 그만큼만. */
export function zoomAt(v: View, factor: number, at: Pt): View {
  const k = clampK(v.k * factor);
  const r = k / v.k;
  return { k, x: at.x - (at.x - v.x) * r, y: at.y - (at.y - v.y) * r };
}

/** 그림 상자 b 를 화면 틀 frame 안 가운데에 pad 만큼 띄워 맞춘다. maxK 보다 크게는 키우지 않는다. */
export function fitView(b: Rect, frame: Rect, pad = 16, maxK = 1): View {
  const fw = Math.max(1, frame.w - 2 * pad), fh = Math.max(1, frame.h - 2 * pad);
  const k = clampK(Math.min(b.w > 0 ? fw / b.w : maxK, b.h > 0 ? fh / b.h : maxK), ZOOM.min, maxK);
  return { k, x: frame.x + frame.w / 2 - (b.x + b.w / 2) * k, y: frame.y + frame.h / 2 - (b.y + b.h / 2) * k };
}

/** 그림 점 p 를 틀 가운데로. 배율 k 를 주면 그 배율로. */
export function centerOn(v: View, p: Pt, frame: Rect, k = v.k): View {
  const kk = clampK(k);
  return { k: kk, x: frame.x + frame.w / 2 - p.x * kk, y: frame.y + frame.h / 2 - p.y * kk };
}

/** 그림이 화면 밖으로 다 빠져나가 길을 잃지 않게, 그림 상자가 틀 안에 margin 만큼은 남도록 이동을 막는다. */
export function keepInView(v: View, b: Rect, frame: Rect, margin = 48): View {
  const left = b.x * v.k + v.x, top = b.y * v.k + v.y;
  const right = left + b.w * v.k, bottom = top + b.h * v.k;
  let dx = 0, dy = 0;
  if (right < frame.x + margin) dx = frame.x + margin - right;
  else if (left > frame.x + frame.w - margin) dx = frame.x + frame.w - margin - left;
  if (bottom < frame.y + margin) dy = frame.y + margin - bottom;
  else if (top > frame.y + frame.h - margin) dy = frame.y + frame.h - margin - top;
  return dx || dy ? panBy(v, dx, dy) : v;
}

/** 두 보기 사이(부드러운 이동). t 는 0~1. 배율은 로그 공간에서 섞어 확대 속도가 고르게 보인다. */
export function lerpView(a: View, b: View, t: number): View {
  const k = Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t);
  return { k, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** 점과 상자를 모두 감싸는 상자 */
export function boundsOf(rects: Rect[], pts: Pt[] = []): Rect {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rects) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return x0 === Infinity ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** 그래프 전체가 차지하는 상자(노드·이름 상자와 묶음 영역) */
export const layoutBounds = (l: GraphLayout): Rect => boundsOf(Object.values(l.boxes), Object.values(l.hulls).flat());

/** 묶음 하나가 차지하는 상자(영역과 이름). 그 묶음으로 확대해 맞출 때 쓴다. */
export function clusterBounds(l: GraphLayout, clusterId: string, withIds: string[] = []): Rect | null {
  const hull = l.hulls[clusterId];
  const name = l.boxes[`name:${clusterId}`];
  if (!hull?.length && !name) return null;
  // 함께 넣을 노드(그 묶음이 근거가 된 역량 등)까지 감싸야 묶음을 골랐을 때 이어진 역량이 화면 밖으로 안 나간다
  const extra = withIds.map(id => l.boxes[id]).filter((b): b is Rect => !!b);
  return boundsOf([...(name ? [name] : []), ...extra], hull ?? []);
}

/**
 * 끌어 옮긴 노드(pins: 그림 좌표)를 배치에 덧입힌다. 옮긴 노드의 자리·상자를 바꾸고,
 * 그 노드가 든 묶음의 영역만 다시 감싼다. 핀이 없으면 원래 배치를 그대로 돌려준다.
 */
export function pinLayout(l: GraphLayout, g: KnowledgeGraph, pins: Record<string, Pt>): GraphLayout {
  const ids = Object.keys(pins).filter(id => l.pos[id]);
  if (ids.length === 0) return l;
  const pos = { ...l.pos };
  const boxes = { ...l.boxes };
  for (const id of ids) {
    const p = pins[id], o = l.pos[id], b = l.boxes[id];
    pos[id] = p;
    if (b) boxes[id] = { ...b, x: b.x + p.x - o.x, y: b.y + p.y - o.y };
  }
  const moved = new Set(ids);
  const hulls = { ...l.hulls };
  for (const c of g.clusters) {
    if (!c.recordIds.some(id => moved.has(id))) continue;
    const rects = [...c.recordIds.map(id => boxes[id]), boxes[`name:${c.id}`]].filter((r): r is Rect => !!r);
    hulls[c.id] = hullAround(rects);
  }
  return { ...l, pos, boxes, hulls };
}

/**
 * 노드·이름 상자를 제 자리(점·이름 가운데) 기준으로 scaleOf(id) 배 줄이거나 키운다.
 * 확대하면 글자·점이 거꾸로 보정돼 작게 그려지므로, 관계 이름 자리를 찾을 때 실제 크기의 상자로 본다.
 */
export function scaleBoxes(l: GraphLayout, scaleOf: (id: string) => number): GraphLayout {
  const boxes: GraphLayout['boxes'] = {};
  for (const [id, b] of Object.entries(l.boxes)) {
    const s = scaleOf(id), c = l.pos[id];
    boxes[id] = s === 1 || !c ? b : { x: c.x + (b.x - c.x) * s, y: c.y + (b.y - c.y) * s, w: b.w * s, h: b.h * s };
  }
  return { ...l, boxes };
}

/** 의미 기반 확대 단계. far: 묶음·역량만, mid: 활동 이름까지(처음 배치 그대로), near: 활동마다의 근거 선과 관계 이름까지 */
export type ZoomDetail = 'far' | 'mid' | 'near';
export const DETAIL_AT = { mid: 0.9, near: 1.6 } as const;
export const zoomDetail = (k: number): ZoomDetail => (k < DETAIL_AT.mid ? 'far' : k < DETAIL_AT.near ? 'mid' : 'near');
/** 노드가 확대로 커지는 상한(화면 크기 기준 1.5배). 확대해도 원이 화면을 덮지 않고 선·이름이 들어갈 틈이 생긴다 */
export const NODE_GROW = 1.5;
/** 역량 허브를 거꾸로 보정하는 배율: 축소해도 화면 크기 그대로, 확대하면 1.5배까지만 */
export const nodeInv = (k: number) => (k < 1 ? 1 / k : k > NODE_GROW ? NODE_GROW / k : 1);
/** 활동 점 보정: 축소하면 같이 작아지고(묶음만 보이게), 확대하면 1.5배까지만 */
export const dotInv = (k: number) => (k > NODE_GROW ? NODE_GROW / k : 1);
/** 글자를 거꾸로 보정하는 배율. 화면 글자 = 12px × k × textInv: 축소하면 12px 그대로, 확대하면 15px 까지만 커진다 */
export const TEXT_GROW = 1.25;
export const textInv = (k: number) => (k < 1 ? 1 / k : k > TEXT_GROW ? TEXT_GROW / k : 1);

const norm = (s: string) => s.toLowerCase().replace(/[\s·.,()-]/g, '');

/**
 * 찾기: 활동(과 역량) 이름에 q 가 들어 있는 노드. 이름이 q 로 시작하는 것, 앞쪽에서 맞는 것, 짧은 이름 순. 최대 n 개.
 * 띄어쓰기·가운뎃점·대소문자는 무시한다. q 가 비면 빈 목록.
 */
export function findNodes(g: KnowledgeGraph, q: string, n = 5): GraphNode[] {
  const key = norm(q);
  if (!key) return [];
  return g.nodes
    .map((node, i) => ({ node, i, at: norm(node.label).indexOf(key) }))
    .filter(x => x.at >= 0)
    .sort((a, b) => Number(a.node.kind === 'axis') - Number(b.node.kind === 'axis') || a.at - b.at || a.node.label.length - b.node.label.length || a.i - b.i)
    .slice(0, n)
    .map(x => x.node);
}

/** 툴팁·옆 칸에 쓰는 노드 요약. 활동이면 근거가 된 역량, 역량이면 근거 활동. 점수 없이 개수만. */
export type NodeBrief = {
  id: string; kind: 'record' | 'axis'; name: string;
  /** 활동이면 묶음 이름, 역량이면 '역량' */
  where: string;
  confirmed: number; estimated: number;
  /** 이어진 활동 수: 활동이면 이어짐 선으로 닿은 활동, 역량이면 근거 활동 */
  linked: number;
  /** 활동이면 근거 역량, 역량이면 근거 활동. 확인한 것 먼저 */
  items: { id: string; label: string; confirmed: boolean }[];
};

export function nodeBrief(g: KnowledgeGraph, id: string): NodeBrief | null {
  const node = g.nodes.find(n => n.id === id);
  if (!node) return null;
  const byConfirmed = <T extends { confirmed: boolean }>(xs: T[]) => [...xs].sort((a, b) => Number(b.confirmed) - Number(a.confirmed));
  if (node.kind === 'axis') {
    const ev = g.edges.filter(e => e.kind === 'evidence' && e.to === id);
    const label = (rid: string) => (g.nodes.find(n => n.id === rid) as RecordNode | undefined)?.label ?? '';
    return {
      id, kind: 'axis', name: node.label, where: '역량',
      confirmed: ev.filter(e => e.confirmed).length, estimated: ev.filter(e => !e.confirmed).length,
      linked: new Set(ev.map(e => e.from)).size,
      items: byConfirmed(ev.map(e => ({ id: e.from, label: label(e.from), confirmed: e.confirmed })))
    };
  }
  const ev = g.edges.filter(e => e.kind === 'evidence' && e.from === id);
  const follows = g.edges.filter(e => e.kind === 'follow' && (e.from === id || e.to === id));
  const cluster: Cluster | undefined = g.clusters.find(c => c.id === node.cluster);
  const axisLabel = (to: string) => AXES.find(a => `ax:${a.id}` === to)?.label ?? '';
  return {
    id, kind: 'record', name: node.label, where: cluster?.name ?? '',
    confirmed: ev.filter(e => e.confirmed).length, estimated: ev.filter(e => !e.confirmed).length,
    linked: new Set(follows.map(e => (e.from === id ? e.to : e.from))).size,
    items: byConfirmed(ev.map(e => ({ id: e.to.slice(3) as Axis, label: axisLabel(e.to), confirmed: e.confirmed })))
  };
}
