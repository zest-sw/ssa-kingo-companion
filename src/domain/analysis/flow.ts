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

export type FlowRange = [from: number, to: number];

/** 학기 수가 바뀌어도 구간이 축 밖으로 나가지 않게, 시작이 끝을 넘지 않게 */
export function clampRange([from, to]: FlowRange, last: number): FlowRange {
  const hi = Math.max(0, Math.min(to, last));
  return [Math.max(0, Math.min(from, hi)), hi];
}

/** 슬라이더 하나를 옮긴다. 반대쪽 끝이 밀려나서 구간이 뒤집히지 않는다. */
export function moveRange(range: FlowRange, which: 'from' | 'to', value: number, last: number): FlowRange {
  return clampRange(which === 'from' ? [value, Math.max(value, range[1])] : [Math.min(range[0], value), value], last);
}

/** 범례에 올릴 분야: 어느 학기에든 기록이 있는 묶음만, 고정 순서로 */
export const legendGroups = (rows: FlowRow[]): FieldGroup[] => TREE_GROUPS.filter(g => rows.some(r => r.segments.some(s => s.group === g)));
