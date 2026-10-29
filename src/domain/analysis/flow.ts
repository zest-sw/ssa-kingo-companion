import type { FieldGroup, RecordItem } from '../types';
import { FIELD_GROUP } from '../vocab';
import { TREE_GROUPS } from './techtree';

/** share: 0~1 */
export type FlowSegment = { group: FieldGroup; count: number; share: number; recordIds: string[] };
export type FlowRow = { semester: string; total: number; segments: FlowSegment[] };

/** 학기 목록의 각 학기에서 분야 묶음별 기록 비율. 기록이 없는 학기는 total 0, segments [] 로 비워 둔다. */
export function buildFlow(records: RecordItem[], semesters: string[]): FlowRow[] {
  return semesters.map(semester => {
    const here = records.filter(r => r.semester === semester);
    const segments = TREE_GROUPS.map(group => {
      const own = here.filter(r => FIELD_GROUP[r.field] === group);
      return { group, count: own.length, share: here.length ? own.length / here.length : 0, recordIds: own.map(r => r.id) };
    }).filter(s => s.count > 0);
    return { semester, total: here.length, segments };
  });
}

/** 고른 구간(양끝 포함)의 합친 비율 */
export function summarizeFlow(rows: FlowRow[], from: number, to: number): { total: number; segments: FlowSegment[] } {
  const part = rows.slice(Math.min(from, to), Math.max(from, to) + 1);
  const total = part.reduce((n, r) => n + r.total, 0);
  const segments = TREE_GROUPS.map(group => {
    const own = part.flatMap(r => r.segments.filter(s => s.group === group));
    const count = own.reduce((n, s) => n + s.count, 0);
    return { group, count, share: total ? count / total : 0, recordIds: own.flatMap(s => s.recordIds) };
  }).filter(s => s.count > 0);
  return { total, segments };
}
