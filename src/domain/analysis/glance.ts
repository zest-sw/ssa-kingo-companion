import { discState } from '../discoveries';
import type { Confirm, Discovery, FieldGroup } from '../types';
import type { FlowRow } from './flow';
import { TREE_COLUMNS, type TechTree } from './techtree';

// 분석 L1 의 작은 그림이 쓰는 요약. 그림은 여기서 나온 모양을 그대로 그린다.

/** 아직 답하지 않았거나 근거가 바뀌어 다시 물어야 하는 발견 수 */
export const pendingCount = (discoveries: Discovery[], confirm: Record<string, Confirm>) =>
  discoveries.filter(d => { const s = discState(d, confirm); return s === 'none' || s === 'changed'; }).length;

export type GlanceKind = 'done' | 'ongoing' | 'candidate';
export type TreeGlanceRow = { group: FieldGroup; label: string; cells: (GlanceKind | null)[] };
const RANK: Record<GlanceKind, number> = { done: 3, ongoing: 2, candidate: 1 };

/** 테크 트리를 분야 줄 × 유형 칸의 점 격자로 줄인다. 한 칸에 여럿이면 가장 센 것(한 활동 > 하는 중 > 후보) 하나. */
export function treeGlance(tree: TechTree): { rows: TreeGlanceRow[]; filled: number; blankRows: number } {
  const rows = tree.rows.map(r => ({
    group: r.group,
    label: r.label,
    cells: TREE_COLUMNS.map((_, col): GlanceKind | null =>
      r.cells.filter(c => c.col === col).map(c => c.kind).sort((a, b) => RANK[b] - RANK[a])[0] ?? null)
  }));
  const filled = rows.reduce((n, r) => n + r.cells.filter(c => c === 'done' || c === 'ongoing').length, 0);
  return { rows, filled, blankRows: tree.rows.filter(r => r.unknown).length };
}

/** 가장 최근에 기록이 있는 학기부터 거꾸로 n개를 오래된 순서로. 기록이 없는 학기는 건너뛴다. */
export const recentFlow = (rows: FlowRow[], n: number): FlowRow[] => rows.filter(r => r.total > 0).slice(-n);
