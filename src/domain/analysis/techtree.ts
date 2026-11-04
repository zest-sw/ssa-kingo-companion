import { josa } from '../text';
import type { Activity, Did, Field, FieldGroup, Program, RecordItem } from '../types';
import { FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { LEVEL_NAME, levelOf, type Level } from './level';
import { sortRecords } from './semester';

// 테크 트리: 가로줄은 분야, 왼쪽에서 오른쪽은 활동의 심화 수준(입문 → 중급 → 심화).
// 내가 한 활동만 분야색, 내가 넘어선 단계인데 한 활동이 없으면 회색(건너뜀), 지금 할 수 있는 활동은 회색 점선.

/** 단계 이름. 칸 번호(col) = 난이도 - 1 */
export const TREE_COLUMNS = [LEVEL_NAME[1], LEVEL_NAME[2], LEVEL_NAME[3]] as const;
export const TREE_GROUPS: FieldGroup[] = ['ai', 'dev', 'plan', 'mentor', 'global', 'other'];
const levelAt = (col: number) => (col + 1) as Level;

export type TreeCell = {
  id: string;
  /** done 한 활동, ongoing 하는 중, skipped 건너뛴 단계(회색), candidate 지금 할 수 있는 활동(회색 점선) */
  kind: 'done' | 'ongoing' | 'skipped' | 'candidate';
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
  /** 건너뛴 단계: 그 단계에서 지금 열린 기회(마감 가까운 순) */
  open?: TreeCell[];
  /** 건너뛴 단계: 그 분야·단계의 다른 기회(지금은 안 열림) */
  examples?: Program[];
};
/** unknown: 아직 한 활동이 없는 분야. top: 그 분야에서 내가 한 가장 높은 단계(없으면 -1) */
export type TreeRow = { group: FieldGroup; label: string; cells: TreeCell[]; folds: TreeFold[]; unknown: boolean; top: number };
/** 한 단계에 다 그리지 못해 '+n' 노드로 접힌 노드들 */
export type TreeFold = { col: number; cells: TreeCell[] };
/** cross: 다른 줄로 건너가는 경로 */
export type TreeLink = { from: string; to: string; cross: boolean };
/** candidates: 칸 수 제한 없이 지금 신청할 수 있는 후보 전부(목록 보기용) */
export type TechTree = { rows: TreeRow[]; links: TreeLink[]; candidates: TreeCell[] };
/** 한 단계에 그리는 후보는 이만큼까지(그 단계에 내가 한 활동이 있으면 1개). 나머지는 '+n' 노드로 접는다. */
export const CANDIDATES_PER_CELL = 2;
/** 한 단계에 쌓는 자리 수('+n' 노드 포함). 1440×900 에서 트리가 칸 안 스크롤 없이 들어오게 한다. */
export const NODES_PER_STAGE = 3;
/** 내가 한 활동이 없는(후보만 있는) 줄은 낮게: 한 단계에 이만큼만. */
export const CANDIDATE_ROW_SLOTS = 2;
export type CandidateRef = { program: Program; dday: number };

/** 남길 순서가 앞인 것부터: 건너뜀 → 추천(마감 가까운 것) → 하는 중 → 한 활동(최근 것). */
const keepRank = (c: TreeCell, i: number) =>
  (c.kind === 'skipped' ? [-1, 0] : c.kind === 'candidate' ? [0, c.dday ?? 999] : c.kind === 'ongoing' ? [1, -i] : [2, -i]);

/**
 * 한 단계의 노드를 자리 수에 맞춰 그릴 것과 접을 것으로 나눈다. 그릴 노드는 원래 순서(시간순)를 지킨다.
 * 접는 순서: 한 활동(오래된 것부터) → 하는 중 → 추천(마감 먼 것부터). 마감이 걸린 추천을 가장 늦게 접는다.
 * 그 단계에 내가 한 활동이 있으면 추천은 하나만 남긴다. 자리가 셋뿐이라, 추천 둘이 내 활동을 모두 '+n' 안으로 밀어 그 단계를 안 한 것처럼 보이게 하지 않으려고.
 */
export function foldStage(cells: TreeCell[], slots = NODES_PER_STAGE): { visible: TreeCell[]; folded: TreeCell[] } {
  const order = cells.map((c, i) => ({ c, i, r: keepRank(c, i) })).sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1]);
  const candCap = cells.some(c => c.kind === 'done' || c.kind === 'ongoing') ? 1 : CANDIDATES_PER_CELL;
  const extraCands = new Set(order.filter(o => o.c.kind === 'candidate').slice(candCap).map(o => o.c.id));
  const pool = order.filter(o => !extraCands.has(o.c.id));
  const fits = pool.length <= slots && !extraCands.size;
  const keep = new Set((fits ? pool : pool.slice(0, slots - 1)).map(o => o.c.id));
  return { visible: cells.filter(c => keep.has(c.id)), folded: cells.filter(c => !keep.has(c.id)) };
}

/** 내가 한 활동 노드: 기록 + 기록으로 옮기지 않은 하는 중·끝난 활동 */
function ownCells(records: RecordItem[], activities: Activity[], programs: Record<string, Program>): TreeCell[] {
  const cells: TreeCell[] = sortRecords(records).map(r => ({
    id: `r:${r.id}`, kind: 'done', label: r.title, field: r.field, group: FIELD_GROUP[r.field], col: levelOf(r, programs) - 1, did: r.did, recordId: r.id
  }));
  // 기록으로 옮겨진 활동은 기록 칸이 대신한다. 신청 전·결과 대기·떨어진 신청은 아직 한 활동이 아니라서 뺀다.
  for (const a of activities) {
    if (a.status !== 'ongoing' && a.status !== 'ended' && a.status !== 'recorded') continue;
    if (recordOfActivity(records, a)) continue;
    cells.push({
      id: `a:${a.id}`, kind: a.status === 'ongoing' ? 'ongoing' : 'done', label: a.title, field: a.field, group: FIELD_GROUP[a.field],
      col: levelOf(a, programs) - 1, activityId: a.id
    });
  }
  return cells;
}

/**
 * 건너뛴 단계 노드. 이름은 그 단계에서 지금 열린 기회 → 카탈로그의 같은 분야·단계 기회 → '중급 활동' 순서.
 * 회색 실선 노드라서 '추천'으로 읽히지 않게 마감 표시는 서랍에만 둔다.
 */
function skippedCell(group: FieldGroup, col: number, open: TreeCell[], programs: Program[], fallbackField: Field): TreeCell {
  const examples = programs.filter(p => FIELD_GROUP[p.field] === group && p.level === levelAt(col) && !open.some(o => o.programId === p.id));
  const label = open[0]?.label ?? examples[0]?.title ?? `${TREE_COLUMNS[col]} 활동`;
  return { id: `s:${group}:${col}`, kind: 'skipped', label, field: open[0]?.field ?? examples[0]?.field ?? fallbackField, group, col, open, examples };
}

export function buildTechTree(input: { records: RecordItem[]; activities: Activity[]; candidates: CandidateRef[]; programs?: Program[] }): TechTree {
  const catalog = input.programs ?? input.candidates.map(c => c.program);
  const byId = Object.fromEntries(catalog.map(p => [p.id, p])) as Record<string, Program>;
  const cells = ownCells(input.records, input.activities, byId);
  const candidateCells: TreeCell[] = input.candidates.map(c => ({
    id: `p:${c.program.id}`, kind: 'candidate', label: c.program.title, field: c.program.field, group: FIELD_GROUP[c.program.field],
    col: c.program.level - 1, programId: c.program.id, dday: c.dday
  }));

  const rows: TreeRow[] = TREE_GROUPS.map(group => {
    const own = cells.filter(c => c.group === group);
    const cands = candidateCells.filter(c => c.group === group).sort((a, b) => (a.dday ?? 999) - (b.dday ?? 999));
    const top = own.length ? Math.max(...own.map(c => c.col)) : -1;
    const shown: TreeCell[] = [];
    const folds: TreeFold[] = [];
    for (const col of TREE_COLUMNS.keys()) {
      const mine = own.filter(c => c.col === col);
      const here = cands.filter(c => c.col === col);
      let stage: TreeCell[];
      if (!mine.length && col < top) stage = [skippedCell(group, col, here, catalog, own[0].field)];
      // 지금 할 수 있는 활동은 내가 한 가장 높은 단계와 그 위에만 놓는다(이미 넘어선 아래 단계는 목록 보기에서).
      else stage = [...mine, ...(col >= top ? here : [])];
      const { visible, folded } = foldStage(stage, own.length ? NODES_PER_STAGE : CANDIDATE_ROW_SLOTS);
      shown.push(...visible);
      if (folded.length) folds.push({ col, cells: folded });
    }
    return { group, label: GROUP_LABEL[group], cells: shown, folds, unknown: !own.length, top };
  });

  const links: TreeLink[] = [];
  for (const row of rows) {
    for (const cell of row.cells) {
      const before = row.cells.filter(c => c.col < cell.col).map(c => c.col);
      if (!before.length) continue;
      // 앞 단계가 여럿이어도 한 줄만 잇는다. 같은 순서의 노드끼리 이어 선이 엉키지 않게 한다.
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

/** 그 분야에서 건너뛴 단계 이름들 */
export const skippedStages = (row: TreeRow) => row.cells.filter(c => c.kind === 'skipped').map(c => TREE_COLUMNS[c.col]);

/**
 * 머리 키워드 한 줄: '창업·기획 심화까지 · 글로벌은 중급을 건너뜀'.
 * 가장 높은 단계까지 간 분야(같으면 활동이 많은 분야), 그다음 건너뛴 단계가 있는 분야, 없으면 안 해 본 분야.
 */
export function treeHeadline(tree: TechTree): string {
  const rows = tree.rows.filter(r => r.group !== 'other');
  // '+n' 으로 접힌 노드도 센다. 많이 한 분야일수록 많이 접혀서, 보이는 노드만 세면 순서가 뒤집힌다.
  const own = (r: TreeRow) => [...r.cells, ...r.folds.flatMap(f => f.cells)].filter(c => c.kind === 'done' || c.kind === 'ongoing').length;
  const lead = rows.filter(r => r.top >= 0).sort((a, b) => b.top - a.top || own(b) - own(a))[0];
  if (!lead) return '회고를 쓰면 가지가 자라요';
  const head = `${lead.label} ${TREE_COLUMNS[lead.top]}까지`;
  const skip = rows.find(r => skippedStages(r).length);
  if (skip) {
    const stage = skippedStages(skip).join('·');
    return `${head} · ${skip.label}${josa(skip.label, '은', '는')} ${stage}${josa(stage, '을', '를')} 건너뜀`;
  }
  const blank = rows.find(r => r.unknown);
  return blank ? `${head} · ${blank.label} 미경험` : head;
}

export function treeValue(tree: TechTree): string | undefined {
  const blank = tree.rows.filter(r => r.unknown && r.group !== 'other').length;
  return blank ? `안 해 본 분야 ${blank}곳` : undefined;
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
