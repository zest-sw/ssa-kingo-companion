import type { KnowledgeGraph } from '../../domain/analysis/graph';
import { GRAPH_METRICS, layoutGraph, type GraphLayout, type GraphMetrics } from '../../domain/analysis/graphLayout';
import { fitView, layoutBounds } from '../../domain/analysis/graphView';

/**
 * 칸에 맞춘 배치. 낮은 칸(1280×640)에서는 배치가 칸보다 커져 맞춤 배율 k 가 1 아래로 내려가는데,
 * 역량 원과 묶음 이름은 화면에서 같은 크기로 보이게 1/k 배로 다시 키워 그린다. 배치는 원래 크기로 자리를 잡았으니 서로 닿는다.
 * 그래서 맞춤 배율을 미리 재고, 그만큼 큰 원·이름 칸으로 다시 배치한다(배율이 더 내려가면 몇 번 더).
 * 활동 이름은 이 배율(먼 보기)에서 숨으므로 그대로 둔다.
 */
export function fitLayout(g: KnowledgeGraph, W: number, H: number, pad: number, m: GraphMetrics = GRAPH_METRICS): GraphLayout {
  let metrics = m;
  let out = layoutGraph(g, W, H, metrics);
  for (let i = 0; i < 4; i++) {
    const k = fitView(layoutBounds(out), { x: 0, y: 0, w: W, h: H }, pad, 1).k;
    const grow = 1 / k;
    if (m.axisR * grow <= metrics.axisR + 0.5) break;
    metrics = { ...m, axisR: m.axisR * grow, nameH: m.nameH * grow, nameCharW: m.nameCharW * grow };
    out = layoutGraph(g, W, H, metrics);
  }
  return out;
}
