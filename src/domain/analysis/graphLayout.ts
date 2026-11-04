import { clusterLabel, type GraphEdge, type KnowledgeGraph } from './graph';
import { wrapWords } from './wrap';

// 경험 지도 그래프 배치. 같은 기록이면 늘 같은 그림이 나오도록 난수 없이 힘 기반으로 계산한다.
// 묶음은 바깥 타원 위 자기 자리로 끌리고(묶음끼리 떨어짐), 묶음 안 활동은 서로 모인다. 역량 허브는 가운데에서 근거 선에 끌린다.
// 마지막에 노드·이름 상자끼리 겹침을 밀어내 푼다. 다 못 풀면 높이를 늘려 다시 계산한다(그 칸 안에서 스크롤).

export type GraphMetrics = {
  axisR: number; recR: number;
  /** 활동 이름: 한 줄 글자 수, 줄 높이, 점과 이름 사이, 글자 하나 폭(한글 기준) */
  perLine: number; lineH: number; labelGap: number; charW: number;
  /** 묶음 이름 상자 높이와 글자 폭 */
  nameH: number; nameCharW: number;
  /** 묶음 이름 아래 맞은 키워드 줄 높이 */
  kwH: number;
  /** 상자 사이 최소 틈, 가장자리 여백(묶음 영역의 둥근 테두리가 칸 끝에서 잘리지 않을 만큼) */
  gap: number; pad: number;
};

export const GRAPH_METRICS: GraphMetrics = { axisR: 28, recR: 8, perLine: 9, lineH: 15, labelGap: 5, charW: 12, nameH: 20, nameCharW: 13, kwH: 15, gap: 6, pad: 14 };

export type Pt = { x: number; y: number };
/** 상자: 왼쪽 위와 크기 */
export type Rect = { x: number; y: number; w: number; h: number };
export type GraphLayout = {
  width: number; height: number;
  pos: Record<string, Pt>;
  /** 노드·이름이 차지하는 상자(겹침 검사·선 이름표 자리 찾기에 쓴다) */
  boxes: Record<string, Rect>;
  /** 활동 이름 줄 */
  lines: Record<string, string[]>;
  /** 묶음 이름 자리(가운데)와 그 묶음을 감싸는 옅은 영역(볼록 껍질) */
  names: Record<string, Pt>;
  hulls: Record<string, Pt[]>;
  overlaps: number;
};

/** 글자 폭 어림: 한글·한자는 1em, 영문·숫자 0.62em, 공백·가운뎃점 0.32em */
export function textWidth(s: string, em: number): number {
  let w = 0;
  for (const ch of Array.from(s)) w += /[\s·.,]/.test(ch) ? 0.32 : /[ㄱ-힣一-鿿]/.test(ch) ? 1 : 0.62;
  return Math.ceil(w * em);
}

type Item = { id: string; kind: 'axis' | 'record' | 'name'; cluster: string; w: number; h: number; top: number; x: number; y: number };

/** '멘토링 · 멘토' 처럼 가운뎃점 앞 공백을 없애 가운뎃점이 줄 머리에 오지 않게 한다 */
export const joinDots = (s: string) => s.replace(/\s+·\s*/g, '· ');

const nameId = (c: string) => `name:${c}`;
/** 묶음 이름 아래 키워드 줄: '인터뷰·설문·사용자'. 없으면 빈 문자열 */
export const keywordLine = (kw: string[]) => kw.slice(0, 3).join('·');
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function makeItems(g: KnowledgeGraph, m: GraphMetrics, lines: Record<string, string[]>): Item[] {
  const items: Item[] = [];
  for (const n of g.nodes) {
    if (n.kind === 'axis') items.push({ id: n.id, kind: 'axis', cluster: '', w: m.axisR * 2, h: m.axisR * 2, top: -m.axisR, x: 0, y: 0 });
    else {
      const ls = wrapWords(joinDots(n.label), m.perLine);
      lines[n.id] = ls;
      const w = Math.max(m.recR * 2, ...ls.map(l => textWidth(l, m.charW)));
      items.push({ id: n.id, kind: 'record', cluster: n.cluster, w, h: m.recR * 2 + m.labelGap + ls.length * m.lineH, top: -m.recR, x: 0, y: 0 });
    }
  }
  // 사전에 맞은 묶음은 이름 아래에 맞은 키워드를 작은 글씨로 한 줄 둔다(이름이 왜 붙었는지)
  for (const c of g.clusters) {
    const kw = keywordLine(c.keywords);
    const w = Math.max(textWidth(clusterLabel(c), m.nameCharW) + 12, kw ? textWidth(kw, m.charW) : 0);
    items.push({ id: nameId(c.id), kind: 'name', cluster: c.id, w, h: m.nameH + (kw ? m.kwH : 0), top: -m.nameH / 2, x: 0, y: 0 });
  }
  return items;
}

const rectOf = (it: Item): Rect => ({ x: it.x - it.w / 2, y: it.y + it.top, w: it.w, h: it.h });

/** 겹친 상자 쌍을 한 번 밀어낸다. 허브는 덜 움직인다. 겹친 쌍 수를 돌려준다. */
function separate(items: Item[], gap: number): number {
  let n = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const ax = a.x, ay = a.y + a.top + a.h / 2, bx = b.x, by = b.y + b.top + b.h / 2;
      const ox = (a.w + b.w) / 2 + gap - Math.abs(bx - ax);
      const oy = (a.h + b.h) / 2 + gap - Math.abs(by - ay);
      if (ox <= 0 || oy <= 0) continue;
      n++;
      const wa = a.kind === 'axis' && b.kind !== 'axis' ? 0.25 : b.kind === 'axis' && a.kind !== 'axis' ? 0.75 : 0.5;
      if (ox < oy) {
        const s = bx === ax ? (i % 2 ? 1 : -1) : Math.sign(bx - ax);
        a.x -= s * ox * wa; b.x += s * ox * (1 - wa);
      } else {
        const s = by === ay ? (j % 2 ? 1 : -1) : Math.sign(by - ay);
        a.y -= s * oy * wa; b.y += s * oy * (1 - wa);
      }
    }
  }
  return n;
}

function clamp(items: Item[], W: number, H: number, pad: number) {
  for (const it of items) {
    it.x = Math.min(Math.max(it.x, it.w / 2 + pad), W - it.w / 2 - pad);
    it.y = Math.min(Math.max(it.y, pad - it.top), H - pad - it.h - it.top);
  }
}

function run(g: KnowledgeGraph, W: number, H: number, m: GraphMetrics): GraphLayout {
  const lines: Record<string, string[]> = {};
  const items = makeItems(g, m, lines);
  const byId = new Map(items.map(i => [i.id, i]));
  const k = g.clusters.length;
  const cx = W / 2, cy = H / 2;
  const rx = Math.max(0, W / 2 - 120), ry = Math.max(0, H / 2 - 80);
  const start = -Math.PI / 2 + (k > 1 ? Math.PI / k : 0);
  const anchor: Record<string, Pt> = {};
  g.clusters.forEach((c, i) => {
    const t = start + (2 * Math.PI * i) / Math.max(1, k);
    anchor[c.id] = k === 1 ? { x: cx - rx / 2, y: cy } : { x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) };
  });

  // 처음 자리: 활동은 묶음 자리 둘레 해바라기 무늬, 역량은 근거를 준 묶음 쪽 안쪽 타원 위.
  const members: Record<string, Item[]> = {};
  for (const it of items) if (it.kind === 'record') (members[it.cluster] ??= []).push(it);
  for (const [c, list] of Object.entries(members)) {
    list.forEach((it, i) => {
      const r = 34 * Math.sqrt(i + 0.5);
      it.x = anchor[c].x + r * Math.cos(i * GOLDEN);
      it.y = anchor[c].y + r * Math.sin(i * GOLDEN);
    });
  }
  const recCluster = new Map(items.filter(i => i.kind === 'record').map(i => [i.id, i.cluster]));
  const axes = items.filter(i => i.kind === 'axis');
  axes.forEach((it, i) => {
    let vx = 0, vy = 0;
    for (const e of g.edges) if (e.to === it.id) { const a = anchor[recCluster.get(e.from) ?? '']; if (a) { vx += a.x - cx; vy += a.y - cy; } }
    const t = vx === 0 && vy === 0 ? (2 * Math.PI * i) / axes.length : Math.atan2(vy / (ry || 1), vx / (rx || 1));
    it.x = cx + rx * 0.35 * Math.cos(t);
    it.y = cy + ry * 0.35 * Math.sin(t);
  });
  for (const c of g.clusters) { const it = byId.get(nameId(c.id))!; it.x = anchor[c.id].x; it.y = anchor[c.id].y - 60; }

  const kk = Math.sqrt((W * H) / Math.max(1, items.length)) * 0.6;
  const T = 260;
  const fx = new Float64Array(items.length), fy = new Float64Array(items.length);
  const index = new Map(items.map((it, i) => [it.id, i]));
  for (let t = 0; t < T; t++) {
    const alpha = 1 - t / T;
    fx.fill(0); fy.fill(0);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d = Math.hypot(dx, dy);
        if (d < 1) { dx = i % 2 ? 1 : -1; dy = 0.5; d = 1; }
        const apart = a.cluster !== b.cluster ? 1.6 : 1;
        const f = ((kk * kk) / d) * apart;
        fx[i] += (dx / d) * f; fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f; fy[j] -= (dy / d) * f;
      }
    }
    const pull = (e: GraphEdge, w: number) => {
      const i = index.get(e.from), j = index.get(e.to);
      if (i === undefined || j === undefined) return;
      const a = items[i], b = items[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.hypot(dx, dy));
      const f = ((d * d) / kk) * w;
      fx[i] += (dx / d) * f; fy[i] += (dy / d) * f;
      fx[j] -= (dx / d) * f; fy[j] -= (dy / d) * f;
    };
    for (const e of g.edges) pull(e, e.kind === 'follow' ? 0.6 : 0.12);
    // 묶음 안은 모으고, 묶음 가운데는 제 자리로
    for (const [c, list] of Object.entries(members)) {
      const mx = list.reduce((s, it) => s + it.x, 0) / list.length;
      const my = list.reduce((s, it) => s + it.y, 0) / list.length;
      for (const it of list) {
        const i = index.get(it.id)!;
        const dx = mx - it.x, dy = my - it.y, d = Math.max(1, Math.hypot(dx, dy));
        const f = ((d * d) / kk) * 1.4;
        fx[i] += (dx / d) * f + (anchor[c].x - mx) * 0.6; fy[i] += (dy / d) * f + (anchor[c].y - my) * 0.6;
      }
    }
    for (const it of axes) { const i = index.get(it.id)!; fx[i] += (cx - it.x) * 0.15; fy[i] += (cy - it.y) * 0.15; }
    const temp = (Math.min(W, H) / 8) * alpha + 1;
    items.forEach((it, i) => {
      if (it.kind === 'name') return;
      const d = Math.hypot(fx[i], fy[i]);
      if (d > 0) { const s = Math.min(d, temp) / d; it.x += fx[i] * s; it.y += fy[i] * s; }
    });
    placeNames(g, members, byId);
    for (let p = 0; p < 2; p++) separate(items, m.gap);
    clamp(items, W, H, m.pad);
  }
  let overlaps = 0;
  for (let p = 0; p < 300; p++) {
    placeNamesSoft(g, members, byId);
    overlaps = separate(items, m.gap);
    clamp(items, W, H, m.pad);
    if (overlaps === 0 && separate(items, m.gap) === 0) break;
  }
  overlaps = countOverlaps(items);

  const pos: Record<string, Pt> = {};
  const boxes: Record<string, Rect> = {};
  for (const it of items) { pos[it.id] = { x: round(it.x), y: round(it.y) }; boxes[it.id] = rectOf(it); }
  const names: Record<string, Pt> = {};
  const hulls: Record<string, Pt[]> = {};
  for (const c of g.clusters) {
    names[c.id] = pos[nameId(c.id)];
    hulls[c.id] = hullAround([...(members[c.id] ?? []), byId.get(nameId(c.id))!].map(rectOf)).map(p => ({ x: round(Math.min(Math.max(p.x, 2), W - 2)), y: round(Math.min(Math.max(p.y, 2), H - 2)) }));
  }
  return { width: W, height: H, pos, boxes, lines, names, hulls, overlaps };
}

/** 묶음 이름은 그 묶음 활동들 바로 위 가운데에 둔다 */
function nameTarget(list: Item[]): Pt {
  const mx = list.reduce((s, it) => s + it.x, 0) / list.length;
  const top = Math.min(...list.map(it => it.y + it.top));
  return { x: mx, y: top - 14 };
}
function placeNames(g: KnowledgeGraph, members: Record<string, Item[]>, byId: Map<string, Item>) {
  for (const c of g.clusters) { const it = byId.get(nameId(c.id))!; const p = nameTarget(members[c.id] ?? [it]); it.x = p.x; it.y = p.y; }
}
/** 마지막 겹침 풀기 동안에는 이름을 조금씩만 끌어 겹침 풀기와 다투지 않게 한다 */
function placeNamesSoft(g: KnowledgeGraph, members: Record<string, Item[]>, byId: Map<string, Item>) {
  for (const c of g.clusters) { const it = byId.get(nameId(c.id))!; const p = nameTarget(members[c.id] ?? [it]); it.x += (p.x - it.x) * 0.1; it.y += (p.y - it.y) * 0.1; }
}

function countOverlaps(items: Item[]): number {
  let n = 0;
  const rs = items.map(rectOf);
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (rectsOverlap(rs[i], rs[j], 0)) n++;
  return n;
}

export const rectsOverlap = (a: Rect, b: Rect, gap: number) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

const round = (v: number) => Math.round(v * 10) / 10;
const corners = (r: Rect, p: number): Pt[] => [
  { x: r.x - p, y: r.y - p }, { x: r.x + r.w + p, y: r.y - p }, { x: r.x + r.w + p, y: r.y + r.h + p }, { x: r.x - p, y: r.y + r.h + p }
];

/** 상자들을 p 만큼 띄워 감싸는 볼록 껍질. 묶음 영역에 쓴다(노드를 끌어 옮긴 뒤에도 다시 쓴다). */
export const hullAround = (rects: Rect[], p = 8): Pt[] => convexHull(rects.flatMap(r => corners(r, p)));

/** 볼록 껍질(단조 사슬). 점 순서와 상관없이 같은 껍질이 나온다. */
export function convexHull(points: Pt[]): Pt[] {
  const ps = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (ps.length < 3) return ps;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of ps) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper: Pt[] = [];
  for (const p of [...ps].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * 그래프 배치. 칸 너비 W, 높이 H 에 맞춘다. 겹침이 남으면 높이를 15%씩 늘려 다시 한다(최대 5번).
 * 기록이 없으면 빈 배치를 돌려준다.
 */
export function layoutGraph(g: KnowledgeGraph, W: number, H: number, m: GraphMetrics = GRAPH_METRICS): GraphLayout {
  let out = run(g, W, H, m);
  for (let i = 1; i <= 5 && out.overlaps > 0; i++) out = run(g, W, Math.round(H * 1.15 ** i), m);
  return out;
}

/** 선 양 끝을 원 가장자리까지 줄인다(화살표 머리가 원에 묻히지 않게) */
export function trimSegment(a: Pt, ra: number, b: Pt, rb: number): { a: Pt; b: Pt } {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
  return { a: { x: a.x + (dx / d) * ra, y: a.y + (dy / d) * ra }, b: { x: b.x - (dx / d) * rb, y: b.y - (dy / d) * rb } };
}

/** 원 반지름: 역량 허브는 크고 활동은 작다 */
export const radiusOf = (id: string, m: GraphMetrics = GRAPH_METRICS) => (id.startsWith('ax:') ? m.axisR : m.recR);

/**
 * 강조한 선의 관계 이름(근거·이어짐) 자리. 선 가운데부터 앞뒤로 옮겨 가며 노드·다른 이름표와 안 겹치는 첫 자리를 쓴다.
 * 자리가 없으면 그 선은 이름을 생략한다(겹쳐 그리지 않는다).
 */
export function placeEdgeLabels(edges: { id: string; from: string; to: string; label: string }[], layout: GraphLayout, m: GraphMetrics = GRAPH_METRICS, fontPx = 12): Record<string, Pt> {
  const taken: Rect[] = Object.values(layout.boxes);
  const out: Record<string, Pt> = {};
  for (const e of edges) {
    const a = layout.pos[e.from], b = layout.pos[e.to];
    if (!a || !b) continue;
    const w = textWidth(e.label, fontPx) + 6, h = fontPx + 4;
    for (const t of [0.5, 0.42, 0.58, 0.34, 0.66]) {
      const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const r = { x: p.x - w / 2, y: p.y - h / 2, w, h };
      if (r.x < m.pad || r.y < m.pad || r.x + r.w > layout.width - m.pad || r.y + r.h > layout.height - m.pad) continue;
      if (taken.some(o => rectsOverlap(r, o, 1))) continue;
      taken.push(r);
      out[e.id] = { x: round(p.x), y: round(p.y) };
      break;
    }
  }
  return out;
}


/**
 * 허브 옆 이름표('근거 4') 자리. 아래 → 위 → 오른쪽 → 왼쪽 순서로 노드·다른 이름표와 안 겹치는 첫 자리. 없으면 생략한다.
 * 돌려주는 점은 이름표 가운데다.
 */
export function placeHubTags(tags: { id: string; text: string }[], layout: GraphLayout, m: GraphMetrics = GRAPH_METRICS, fontPx = 12): Record<string, Pt> {
  const taken: Rect[] = Object.values(layout.boxes);
  const out: Record<string, Pt> = {};
  for (const t of tags) {
    const c = layout.pos[t.id];
    if (!c) continue;
    const w = textWidth(t.text, fontPx) + 12, h = fontPx + 8, R = m.axisR + 4;
    const spots = [{ x: c.x, y: c.y + R + h / 2 }, { x: c.x, y: c.y - R - h / 2 }, { x: c.x + R + w / 2, y: c.y }, { x: c.x - R - w / 2, y: c.y }];
    for (const p of spots) {
      const r = { x: p.x - w / 2, y: p.y - h / 2, w, h };
      if (r.x < m.pad || r.y < m.pad || r.x + r.w > layout.width - m.pad || r.y + r.h > layout.height - m.pad) continue;
      if (taken.some(o => rectsOverlap(r, o, 1))) continue;
      taken.push(r);
      out[t.id] = { x: round(p.x), y: round(p.y) };
      break;
    }
  }
  return out;
}

/** 묶음 영역 가장자리에서 그 역량 허브에 가장 가까운 점. 묶음 → 역량 요약 선이 묶음 안 활동 위를 지나지 않게 여기서 출발한다. */
export function hullExit(hull: Pt[], to: Pt): Pt | undefined {
  return hull.reduce<Pt | undefined>((best, p) => (!best || Math.hypot(p.x - to.x, p.y - to.y) < Math.hypot(best.x - to.x, best.y - to.y) ? p : best), undefined);
}
