import { describe, expect, it } from 'vitest';
import { EXAMPLE_EDGE_ANSWERS, SEED_RECORDS } from '../../data/seed';
import { buildGraph } from '../../domain/analysis/graph';
import { GRAPH_METRICS as M, layoutGraph } from '../../domain/analysis/graphLayout';
import { fitView, layoutBounds, nodeInv } from '../../domain/analysis/graphView';
import { fitLayout } from './mapFit';

const g = buildGraph(SEED_RECORDS, EXAMPLE_EDGE_ANSWERS);
const PAD = 12;

/** 화면에 그려지는 역량 원(1/k 로 키운 크기)끼리 가장 많이 겹친 양(px, 화면 기준) */
function worstHubOverlap(W: number, H: number, layout = fitLayout(g, W, H, PAD)) {
  const k = fitView(layoutBounds(layout), { x: 0, y: 0, w: W, h: H }, PAD, 1).k;
  const r = M.axisR * nodeInv(k);
  const hubs = g.nodes.filter(n => n.kind === 'axis').map(n => layout.pos[n.id]);
  let worst = 0;
  for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j++) {
    const d = Math.hypot(hubs[i].x - hubs[j].x, hubs[i].y - hubs[j].y);
    worst = Math.max(worst, (2 * r - d) * k);
  }
  return worst;
}

describe('fitLayout', () => {
  it('낮은 칸(1280×640 지도 칸)에서도 역량 원이 서로 닿지 않는다', () => {
    expect(worstHubOverlap(634, 443)).toBeLessThanOrEqual(0);
    expect(worstHubOverlap(634, 443, layoutGraph(g, 634, 443))).toBeGreaterThan(0);
    expect(worstHubOverlap(720, 453)).toBeLessThanOrEqual(0);
  });
  it('넉넉한 칸에서는 원래 배치와 같다', () => {
    expect(fitLayout(g, 1226, 703, PAD)).toEqual(layoutGraph(g, 1226, 703));
  });
});
