import type { Activity, Did, Field, FieldGroup, Program, RecordItem } from '../types';
import { FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { sortRecords } from './semester';

// ponytail: 분야 줄과 활동 유형 기준은 기준 문서에서 미정이다. 임시로 '한 일(did)'을 유형 칸에 접는다. 기준이 정해지면 이 표만 고친다.
export const TREE_COLUMNS = ['들어 보기', '해 보기', '만들기', '나누기'] as const;
export const COLUMN_OF_DID: Record<Did, number> = { listen: 0, ask: 0, organize: 1, idea: 1, make: 2, present: 3 };
export const TREE_GROUPS: FieldGroup[] = ['ai', 'dev', 'plan', 'mentor', 'global', 'other'];

export type TreeCell = {
  id: string;
  /** done 채운 칸, ongoing 하는 중, candidate 지금 신청할 수 있는 추천 후보(테두리만) */
  kind: 'done' | 'ongoing' | 'candidate';
  label: string;
  field: Field;
  group: FieldGroup;
  col: number;
  did?: Did;
  recordId?: string;
  activityId?: string;
  programId?: string;
  /** 후보의 마감까지 남은 날 */
  dday?: number;
};
/** unknown: 아직 안 해 본 분야 */
export type TreeRow = { group: FieldGroup; label: string; cells: TreeCell[]; folds: TreeFold[]; unknown: boolean };
/** 한 단계에 다 그리지 못해 '+n' 노드로 접힌 노드들 */
export type TreeFold = { col: number; cells: TreeCell[] };
/** cross: 다른 줄로 건너가는 경로 */
export type TreeLink = { from: string; to: string; cross: boolean };
/** candidates: 칸 수 제한 없이 지금 신청할 수 있는 후보 전부(목록 보기용) */
export type TechTree = { rows: TreeRow[]; links: TreeLink[]; candidates: TreeCell[] };
/** 한 단계에 그리는 후보는 이만큼까지. 나머지는 '+n' 노드로 접는다. */
export const CANDIDATES_PER_CELL = 2;
/** 한 단계에 쌓는 자리 수('+n' 노드 포함). 낮은 노트북 화면(1280×640)에서도 트리가 한 화면에 들어오게 한다. */
export const NODES_PER_STAGE = 4;
export type CandidateRef = { program: Program; dday: number };

/** 남길 순서가 앞인 것부터: 추천(마감 가까운 것) → 하는 중 → 한 활동(최근 것). */
const keepRank = (c: TreeCell, i: number) => (c.kind === 'candidate' ? [0, c.dday ?? 999] : c.kind === 'ongoing' ? [1, -i] : [2, -i]);

/**
 * 한 단계의 노드를 자리 수에 맞춰 그릴 것과 접을 것으로 나눈다. 그릴 노드는 원래 순서(시간순)를 지킨다.
 * 접는 순서: 한 활동(오래된 것부터) → 하는 중 → 추천(마감 먼 것부터). 마감이 걸린 추천을 가장 늦게 접는다.
 */
export function foldStage(cells: TreeCell[]): { visible: TreeCell[]; folded: TreeCell[] } {
  const order = cells.map((c, i) => ({ c, i, r: keepRank(c, i) })).sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1]);
  const extraCands = new Set(order.filter(o => o.c.kind === 'candidate').slice(CANDIDATES_PER_CELL).map(o => o.c.id));
  const pool = order.filter(o => !extraCands.has(o.c.id));
  const fits = pool.length <= NODES_PER_STAGE && !extraCands.size;
  const keep = new Set((fits ? pool : pool.slice(0, NODES_PER_STAGE - 1)).map(o => o.c.id));
  return { visible: cells.filter(c => keep.has(c.id)), folded: cells.filter(c => !keep.has(c.id)) };
}

export function buildTechTree(input: { records: RecordItem[]; activities: Activity[]; candidates: CandidateRef[] }): TechTree {
  const sorted = sortRecords(input.records);
  const cells: TreeCell[] = sorted.map(r => ({
    id: `r:${r.id}`, kind: 'done', label: r.title, field: r.field, group: FIELD_GROUP[r.field], col: COLUMN_OF_DID[r.did], did: r.did, recordId: r.id
  }));

  // 기록으로 옮겨진 활동은 기록 칸이 대신한다. 신청 전·결과 대기·떨어진 신청은 아직 한 활동이 아니라서 뺀다.
  for (const a of input.activities) {
    if (a.status !== 'ongoing' && a.status !== 'ended' && a.status !== 'recorded') continue;
    if (recordOfActivity(input.records, a)) continue;
    cells.push({ id: `a:${a.id}`, kind: a.status === 'ongoing' ? 'ongoing' : 'done', label: a.title, field: a.field, group: FIELD_GROUP[a.field], col: 1, activityId: a.id });
  }
  const candidateCells: TreeCell[] = [];
  for (const c of input.candidates) {
    candidateCells.push({
      id: `p:${c.program.id}`, kind: 'candidate', label: c.program.title, field: c.program.field, group: FIELD_GROUP[c.program.field],
      col: COLUMN_OF_DID[c.program.did[0] ?? 'listen'], programId: c.program.id, dday: c.dday
    });
  }
  const all = [...cells, ...candidateCells];

  const rows: TreeRow[] = TREE_GROUPS.map(group => {
    const own = all.filter(c => c.group === group);
    const shown: TreeCell[] = [];
    const folds: TreeFold[] = [];
    for (const col of TREE_COLUMNS.keys()) {
      const { visible, folded } = foldStage(own.filter(c => c.col === col));
      shown.push(...visible);
      if (folded.length) folds.push({ col, cells: folded });
    }
    return { group, label: GROUP_LABEL[group], cells: shown, folds, unknown: !own.some(c => c.kind !== 'candidate') };
  });

  const links: TreeLink[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      const before = row.cells.filter(c => c.col < cell.col).map(c => c.col);
      if (!before.length) continue;
      // 앞 칸이 여럿이어도 한 줄만 잇는다. 같은 순서의 칸끼리 이어 선이 엉키지 않게 한다.
      const prevCol = row.cells.filter(c => c.col === Math.max(...before));
      const same = row.cells.filter(c => c.col === cell.col);
      links.push({ from: prevCol[Math.min(same.indexOf(cell), prevCol.length - 1)].id, to: cell.id, cross: false });
    }
  }
  // 분야마다 한 줄: 그 분야의 첫 기록을, 그 앞에 같은 일을 다른 분야에서 한 가장 최근 기록과 점선으로 잇는다('이 일로 새 분야에 건너왔다').
  // 기록이 쌓여도 분야 수만큼만 생겨 선이 엉키지 않는다. 앞에 같은 일이 없으면 잇지 않는다.
  const lastByDid = new Map<Did, TreeCell>();
  const entered = new Set<FieldGroup>();
  for (const cell of cells.filter(c => c.recordId && c.did)) {
    if (!entered.has(cell.group)) {
      entered.add(cell.group);
      const prev = lastByDid.get(cell.did!);
      if (prev && prev.group !== cell.group) links.push({ from: prev.id, to: cell.id, cross: true });
    }
    lastByDid.set(cell.did!, cell);
  }
  return { rows, links, candidates: candidateCells };
}

/** 칸 서랍에서 같은 분야의 다른 기록 */
export const relatedRecords = (records: RecordItem[], record: RecordItem, limit = 3) =>
  records.filter(r => r.id !== record.id && r.field === record.field).slice(0, limit);

/** 활동에 이어진 기록(있으면). 회고를 썼는지의 근거다. */
export const recordOfActivity = (records: RecordItem[], a: Activity) =>
  records.find(r => (a.recordId && r.id === a.recordId) || (a.programId && r.programId === a.programId));

/** 분야 가지의 시작점에서 바로 뻗는 노드: 그 분야에서 가장 앞 단계에 놓인 노드들 */
export function rootTargets(row: TreeRow): string[] {
  if (!row.cells.length) return [];
  const first = Math.min(...row.cells.map(c => c.col));
  return row.cells.filter(c => c.col === first).map(c => c.id);
}

/** 가지로 그릴 분야(노드가 하나라도 있음)와, 한 줄로 모을 안 해 본 분야(노드도 후보도 없음) */
export function splitTreeRows(rows: TreeRow[]): { drawn: TreeRow[]; untried: TreeRow[] } {
  return { drawn: rows.filter(r => r.cells.length), untried: rows.filter(r => !r.cells.length) };
}
