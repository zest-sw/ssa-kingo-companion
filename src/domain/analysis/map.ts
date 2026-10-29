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
