import { describe, expect, it } from 'vitest';
import { EXAMPLE_EDGE_ANSWERS, SEED_RECORDS } from '../../data/seed';
import { buildGraph } from './graph';
import { layoutGraph } from './graphLayout';
import {
  boundsOf, centerOn, clampK, clusterBounds, dotInv, findNodes, fitView, keepInView, layoutBounds, lerpView, nodeBrief, nodeInv, pinLayout, scaleBoxes,
  textInv, toScreen, toWorld, zoomAt, zoomDetail, ZOOM
} from './graphView';

const frame = { x: 0, y: 0, w: 800, h: 400 };

describe('보기 계산(확대·이동)', () => {
  it('커서 기준 확대: 커서 아래 그림 점이 그대로 있다', () => {
    const v = { k: 1, x: 30, y: -20 };
    const at = { x: 200, y: 150 };
    const before = toWorld(v, at);
    const z = zoomAt(v, 1.5, at);
    expect(z.k).toBeCloseTo(1.5);
    const after = toScreen(z, before);
    expect(after.x).toBeCloseTo(at.x);
    expect(after.y).toBeCloseTo(at.y);
  });

  it('확대 범위는 0.5×~3×, 끝에서는 더 안 움직인다', () => {
    expect(clampK(10)).toBe(ZOOM.max);
    expect(clampK(0.1)).toBe(ZOOM.min);
    const v = { k: 3, x: 0, y: 0 };
    expect(zoomAt(v, 2, { x: 100, y: 100 })).toEqual(v);
  });

  it('화면에 맞춤: 상자가 틀 가운데에 들어가고, maxK 보다 키우지 않는다', () => {
    const b = { x: 100, y: 50, w: 400, h: 400 };
    const v = fitView(b, frame, 16, 1);
    expect(v.k).toBeCloseTo((400 - 32) / 400);
    const c = toScreen(v, { x: 300, y: 250 });
    expect(c.x).toBeCloseTo(400);
    expect(c.y).toBeCloseTo(200);
    expect(fitView({ x: 0, y: 0, w: 10, h: 10 }, frame, 16, 2).k).toBe(2);
    expect(fitView({ x: 0, y: 0, w: 100000, h: 10 }, frame).k).toBe(ZOOM.min);
  });

  it('가운데로 옮기기와 길 잃지 않기', () => {
    const v = centerOn({ k: 1, x: 0, y: 0 }, { x: 50, y: 60 }, frame, 2);
    expect(toScreen(v, { x: 50, y: 60 })).toEqual({ x: 400, y: 200 });
    const b = { x: 0, y: 0, w: 100, h: 100 };
    const lost = keepInView({ k: 1, x: -1000, y: 5000 }, b, frame, 48);
    expect(lost.x + 100).toBe(48);
    expect(lost.y).toBe(400 - 48);
    const fine = { k: 1, x: 10, y: 10 };
    expect(keepInView(fine, b, frame)).toBe(fine);
  });

  it('부드러운 이동은 양 끝이 정확하다', () => {
    const a = { k: 0.5, x: 0, y: 0 }, b = { k: 2, x: 100, y: -40 };
    expect(lerpView(a, b, 0).k).toBeCloseTo(0.5);
    const end = lerpView(a, b, 1);
    expect(end.k).toBeCloseTo(2);
    expect([end.x, end.y]).toEqual([100, -40]);
    expect(lerpView(a, b, 0.5).k).toBeCloseTo(1);
  });

  it('의미 기반 확대 단계와 글자 보정: 화면 글자는 12px 아래로 안 내려간다', () => {
    expect(zoomDetail(0.6)).toBe('far');
    expect(zoomDetail(1)).toBe('mid');
    expect(zoomDetail(2)).toBe('near');
    for (const k of [0.5, 0.75, 1, 1.2, 2, 3]) {
      const px = 12 * k * textInv(k);
      expect(px).toBeGreaterThanOrEqual(12 - 1e-9);
      expect(px).toBeLessThanOrEqual(15 + 1e-9);
    }
    expect(nodeInv(0.5)).toBe(2);
    expect(nodeInv(1.2)).toBe(1);
    // 확대해도 허브·점은 화면에서 1.5배까지만 커진다
    expect(3 * nodeInv(3)).toBeCloseTo(1.5);
    expect(dotInv(0.5)).toBe(1);
    expect(3 * dotInv(3)).toBeCloseTo(1.5);
  });

  it('상자 합치기', () => {
    expect(boundsOf([{ x: 0, y: 0, w: 10, h: 10 }], [{ x: -5, y: 20 }])).toEqual({ x: -5, y: 0, w: 15, h: 20 });
    expect(boundsOf([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});

describe('그래프 위 계산(끌기·찾기·요약)', () => {
  const g = buildGraph(SEED_RECORDS, EXAMPLE_EDGE_ANSWERS);
  const l = layoutGraph(g, 900, 560);

  it('그래프 전체·묶음 상자는 배치 안에 있다', () => {
    const b = layoutBounds(l);
    expect(b.w).toBeGreaterThan(0);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(l.width);
    const c = clusterBounds(l, g.clusters[0].id)!;
    expect(c.w).toBeLessThan(b.w);
    expect(clusterBounds(l, 'none')).toBeNull();
  });

  it('끌어 옮긴 노드는 자리·상자가 따라가고, 그 묶음 영역만 다시 감싼다', () => {
    expect(pinLayout(l, g, {})).toBe(l);
    const c = g.clusters[0];
    const id = c.recordIds[0];
    const to = { x: l.pos[id].x + 300, y: l.pos[id].y + 200 };
    const p = pinLayout(l, g, { [id]: to });
    expect(p.pos[id]).toEqual(to);
    expect(p.boxes[id].x - l.boxes[id].x).toBeCloseTo(300);
    expect(p.hulls[c.id]).not.toEqual(l.hulls[c.id]);
    expect(Math.max(...p.hulls[c.id].map(q => q.x))).toBeGreaterThan(to.x);
    for (const other of g.clusters.slice(1)) expect(p.hulls[other.id]).toBe(l.hulls[other.id]);
    expect(l.pos[id]).not.toEqual(to);
  });

  it('상자 줄이기: 제 자리 기준으로 줄고, 1배면 그대로', () => {
    const id = g.clusters[0].recordIds[0];
    const s = scaleBoxes(l, () => 0.5);
    expect(s.boxes[id].w).toBeCloseTo(l.boxes[id].w / 2);
    expect(s.boxes[id].x + s.boxes[id].w / 2).toBeCloseTo(l.pos[id].x + (l.boxes[id].x + l.boxes[id].w / 2 - l.pos[id].x) / 2);
    expect(scaleBoxes(l, () => 1).boxes[id]).toBe(l.boxes[id]);
  });

  it('찾기: 이름 일부, 띄어쓰기·대소문자 무시, 활동이 역량보다 먼저', () => {
    const rec = g.nodes.find(n => n.kind === 'record')!;
    const part = rec.label.replace(/\s/g, '').slice(1, 3);
    const hits = findNodes(g, part.split('').join(' '));
    expect(hits.some(n => n.id === rec.id)).toBe(true);
    expect(findNodes(g, '')).toEqual([]);
    expect(findNodes(g, 'zzzz없는이름')).toEqual([]);
    expect(findNodes(g, '소통')[0]?.kind).toBeDefined();
    const kinds = findNodes(g, '소통', 10).map(n => n.kind);
    expect(kinds.indexOf('axis')).toBe(kinds.lastIndexOf('axis'));
    if (kinds.includes('record')) expect(kinds.indexOf('record')).toBeLessThan(kinds.indexOf('axis'));
    expect(findNodes(g, rec.label.slice(0, 1), 3).length).toBeLessThanOrEqual(3);
  });

  it('노드 요약: 확인·추정 수와 이어진 활동 수를 센다', () => {
    const ax = nodeBrief(g, 'ax:communication')!;
    const ev = g.edges.filter(e => e.kind === 'evidence' && e.to === 'ax:communication');
    expect(ax.kind).toBe('axis');
    expect(ax.confirmed + ax.estimated).toBe(ev.length);
    expect(ax.linked).toBe(new Set(ev.map(e => e.from)).size);
    expect(ax.items[0].confirmed || ax.confirmed === 0).toBe(true);

    const follow = g.edges.find(e => e.kind === 'follow')!;
    const r = nodeBrief(g, follow.from)!;
    expect(r.kind).toBe('record');
    expect(r.linked).toBeGreaterThanOrEqual(1);
    expect(r.where).toBe(g.clusters.find(c => c.recordIds.includes(follow.from))!.name);
    expect(r.items.every(i => i.label.length > 0)).toBe(true);
    expect(nodeBrief(g, 'none')).toBeNull();
  });
});
