import type { FieldGroup, RecordItem } from '../types';
import { FIELD_GROUP } from '../vocab';
import { semesterKey, sortRecords } from './semester';
import { TREE_GROUPS } from './techtree';

/** slot: 같은 칸에 겹친 순서 */
export type MapNode = { id: string; record: RecordItem; col: number; row: number; slot: number };
export type EdgeReason = 'did' | 'field';
export type MapEdge = { id: string; a: string; b: string; reasons: EdgeReason[] };
export type ExperienceMap = { nodes: MapNode[]; edges: MapEdge[]; semesters: string[]; groups: FieldGroup[] };
/** 학생의 답. 답이 없으면 AI 추정(점선)이다. */
export type EdgeAnswers = Record<string, 'yes' | 'no'>;
export type EdgeState = 'estimated' | 'confirmed' | 'rejected';

/** 같은 일을 한 기록, 같은 분야 기록을 시간 순서로 이웃끼리 잇는다(모두를 서로 잇지 않는다). */
export function buildMap(records: RecordItem[]): ExperienceMap {
  const sorted = sortRecords(records);
  const semesters = [...new Set(sorted.map(r => r.semester))].filter(s => !Number.isNaN(semesterKey(s)));
  const groups = TREE_GROUPS.filter(g => sorted.some(r => FIELD_GROUP[r.field] === g));
  const seen = new Map<string, number>();
  const nodes: MapNode[] = sorted.map(r => {
    const col = Math.max(0, semesters.indexOf(r.semester));
    const row = groups.indexOf(FIELD_GROUP[r.field]);
    const k = `${col}:${row}`;
    const slot = seen.get(k) ?? 0;
    seen.set(k, slot + 1);
    return { id: r.id, record: r, col, row, slot };
  });

  const byPair = new Map<string, MapEdge>();
  const chain = (key: (r: RecordItem) => string, reason: EdgeReason) => {
    const last = new Map<string, RecordItem>();
    for (const r of sorted) {
      const k = key(r);
      const prev = last.get(k);
      if (prev) {
        const id = `${prev.id}~${r.id}`;
        const e = byPair.get(id) ?? { id, a: prev.id, b: r.id, reasons: [] };
        e.reasons.push(reason);
        byPair.set(id, e);
      }
      last.set(k, r);
    }
  };
  chain(r => r.did, 'did');
  chain(r => FIELD_GROUP[r.field], 'field');
  return { nodes, edges: [...byPair.values()], semesters, groups };
}

export const edgeState = (e: MapEdge, answers: EdgeAnswers): EdgeState =>
  answers[e.id] === 'yes' ? 'confirmed' : answers[e.id] === 'no' ? 'rejected' : 'estimated';

/** 같은 답을 다시 누르면 답을 거둔다(발견 확인과 같은 방식). */
export function answerEdge(answers: EdgeAnswers, id: string, answer: 'yes' | 'no'): EdgeAnswers {
  const next = { ...answers };
  if (next[id] === answer) delete next[id];
  else next[id] = answer;
  return next;
}

/** 이 기록에 닿아 있는 연결(거절한 것 제외) */
export const edgesOf = (map: ExperienceMap, recordId: string, answers: EdgeAnswers) =>
  map.edges.filter(e => (e.a === recordId || e.b === recordId) && edgeState(e, answers) !== 'rejected');

export type MapLayout = { pos: Record<string, { x: number; y: number }>; width: number; height: number; colX: number[]; rowY: number[] };
export type LayoutSize = { padLeft: number; padTop: number; colW: number; rowH: number; slotH: number; padRight: number; padBottom: number };

/** 학기는 왼쪽에서 오른쪽, 분야는 위에서 아래. 같은 칸에 겹친 기록은 아래로 쌓는다. */
export function layoutMap(map: ExperienceMap, s: LayoutSize): MapLayout {
  const maxSlot = map.groups.map((_, row) => Math.max(0, ...map.nodes.filter(n => n.row === row).map(n => n.slot)));
  const rowY: number[] = [];
  let y = s.padTop;
  maxSlot.forEach((m, i) => { rowY[i] = y; y += s.rowH + m * s.slotH; });
  const colX = map.semesters.map((_, i) => s.padLeft + s.colW * i + s.colW / 2);
  const pos = Object.fromEntries(map.nodes.map(n => [n.id, { x: colX[n.col], y: rowY[n.row] + n.slot * s.slotH }]));
  return { pos, width: s.padLeft + s.colW * map.semesters.length + s.padRight, height: y + s.padBottom, colX, rowY };
}

/** 지도에 그릴 연결: 아니라고 한 연결은 뺀다 */
export const visibleEdges = (map: ExperienceMap, answers: EdgeAnswers) => map.edges.filter(e => edgeState(e, answers) !== 'rejected');

/** '아니에요'만 지워서 숨긴 연결을 다시 보이게 한다. 맞아요는 그대로 둔다. */
export const clearRejected = (answers: EdgeAnswers): EdgeAnswers => Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== 'no'));

/** 지워진 기록을 가리키는 답을 버린다(연결 id 는 '기록~기록'). 바뀐 게 없으면 같은 객체를 돌려준다. */
export function pruneAnswers(answers: EdgeAnswers, recordIds: string[]): EdgeAnswers {
  const alive = new Set(recordIds);
  const kept = Object.entries(answers).filter(([id]) => id.split('~').every(r => alive.has(r)));
  return kept.length === Object.keys(answers).length ? answers : Object.fromEntries(kept);
}

/** 저장소에서 읽은 값이 EdgeAnswers 모양일 때만 쓴다 */
export function parseAnswers(raw: unknown): EdgeAnswers | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const entries = Object.entries(raw).filter(([, v]) => v === 'yes' || v === 'no') as [string, 'yes' | 'no'][];
  return Object.fromEntries(entries);
}
