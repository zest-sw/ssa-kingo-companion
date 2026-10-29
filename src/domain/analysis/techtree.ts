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
export type TreeRow = { group: FieldGroup; label: string; cells: TreeCell[]; unknown: boolean };
/** cross: 다른 줄로 건너가는 경로 */
export type TreeLink = { from: string; to: string; cross: boolean };
/** candidates: 칸 수 제한 없이 지금 신청할 수 있는 후보 전부(목록 보기용) */
export type TechTree = { rows: TreeRow[]; links: TreeLink[]; candidates: TreeCell[] };
/** 한 칸에 쌓는 후보는 이만큼까지만 그린다. 나머지는 목록 보기에 있다. */
export const CANDIDATES_PER_CELL = 2;
export type CandidateRef = { program: Program; dday: number };

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
  const shown = new Map<string, number>();
  for (const c of candidateCells) {
    const k = `${c.group}:${c.col}`;
    const n = shown.get(k) ?? 0;
    shown.set(k, n + 1);
    if (n < CANDIDATES_PER_CELL) cells.push(c);
  }

  const rows: TreeRow[] = TREE_GROUPS.map(group => {
    const own = cells.filter(c => c.group === group).sort((a, b) => a.col - b.col);
    return { group, label: GROUP_LABEL[group], cells: own, unknown: !own.some(c => c.kind !== 'candidate') };
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
  // 같은 일을 다른 분야에서 이어 한 기록끼리, 시간 순서대로 점선으로 잇는다.
  const lastByDid = new Map<Did, TreeCell>();
  for (const cell of cells.filter(c => c.recordId && c.did)) {
    const prev = lastByDid.get(cell.did!);
    if (prev && prev.group !== cell.group) links.push({ from: prev.id, to: cell.id, cross: true });
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
