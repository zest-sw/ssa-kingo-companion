import type { FieldGroup, RecordItem } from '../types';
import { josaRo } from '../text';
import { FIELD_GROUP, GROUP_LABEL } from '../vocab';
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

/**
 * 처음 보여 줄 구간: 첫 기록 학기부터 끝까지. 첫 기록 앞의 빈 학기가 그래프를 차지하지 않게 하고, 넓히고 싶으면 슬라이더로 당긴다.
 * 기록이 하나도 없으면 축 전체.
 */
export function defaultRange(rows: FlowRow[]): FlowRange {
  const last = Math.max(0, rows.length - 1);
  const first = rows.findIndex(r => r.total > 0);
  return [first < 0 ? 0 : first, last];
}

/** 슬라이더 하나를 옮긴다. 반대쪽 끝이 밀려나서 구간이 뒤집히지 않는다. */
export function moveRange(range: FlowRange, which: 'from' | 'to', value: number, last: number): FlowRange {
  return clampRange(which === 'from' ? [value, Math.max(value, range[1])] : [Math.min(range[0], value), value], last);
}

/** 범례에 올릴 분야: 어느 학기에든 기록이 있는 묶음만, 고정 순서로 */
export const legendGroups = (rows: FlowRow[]): FieldGroup[] => TREE_GROUPS.filter(g => rows.some(r => r.segments.some(s => s.group === g)));

const yearOf = (semester: string) => semester.split('-')[0];
const ro = (w: string) => `${w}${josaRo(w)}`;

/**
 * 학기마다 가장 많이 한 분야. 기록이 없는 학기는 null.
 * 같은 수로 겹치면 앞 학기의 분야를 이어 간다(길이 쓸데없이 흔들리지 않게). 그것도 아니면 분야 고정 순서로.
 */
export function topGroups(rows: FlowRow[]): (FieldGroup | null)[] {
  let prev: FieldGroup | null = null;
  return rows.map(r => {
    if (r.total === 0) return null;
    const max = Math.max(...r.segments.map(s => s.count));
    const tied = r.segments.filter(s => s.count === max).map(s => s.group);
    prev = prev && tied.includes(prev) ? prev : tied[0];
    return prev;
  });
}

export type FlowStep = { years: string; group: FieldGroup; text: string };

/**
 * 학기 돌아보기 이야기: 해마다 가장 많이 한 분야를 묶어 많아야 3단('2024년 개발로 시작', …, '2026년 창업·기획에 모임' 순서).
 * 이웃한 해가 같은 분야면 한 단으로 합친다. 4단 이상이면 처음·끝과, 가운데서 기록이 가장 많은 단만 남긴다.
 * 활동이 없는 해는 건너뛴다(경고하지 않는다).
 */
export function flowStory(rows: FlowRow[]): FlowStep[] {
  const years = [...new Set(rows.filter(r => r.total > 0).map(r => yearOf(r.semester)))];
  type Chapter = { from: string; to: string; group: FieldGroup; total: number };
  const chapters: Chapter[] = [];
  for (const y of years) {
    const part = rows.filter(r => yearOf(r.semester) === y);
    const sum = summarizeFlow(part, 0, part.length - 1);
    const max = Math.max(...sum.segments.map(s => s.count));
    const tied = sum.segments.filter(s => s.count === max).map(s => s.group);
    const before = chapters.at(-1)?.group;
    const group = before && tied.includes(before) ? before : tied[0];
    if (before === group) { const c = chapters[chapters.length - 1]; c.to = y; c.total += sum.total; }
    else chapters.push({ from: y, to: y, group, total: sum.total });
  }
  let kept = chapters;
  if (chapters.length > 3) {
    const mid = chapters.slice(1, -1).reduce((a, b) => (b.total > a.total ? b : a));
    kept = [chapters[0], mid, chapters[chapters.length - 1]];
  }
  return kept.map((c, i) => {
    const name = GROUP_LABEL[c.group];
    const text = i === 0 ? `${ro(name)} 시작` : i === kept.length - 1 ? `${name}에 모임` : `${ro(name)} 넓힘`;
    return { years: c.from === c.to ? `${c.from}년` : `${c.from}~${c.to}년`, group: c.group, text };
  });
}

/** 한 학기의 대표 활동: 가장 많이 한 분야에서 에너지가 올라간 기록, 없으면 회고 한 줄이 있는 기록, 없으면 그 분야 첫 기록 */
export function semesterPick(row: FlowRow, top: FieldGroup | null, records: RecordItem[]): RecordItem | undefined {
  const seg = row.segments.find(s => s.group === top) ?? row.segments[0];
  if (!seg) return undefined;
  const own = seg.recordIds.map(id => records.find(r => r.id === id)).filter((r): r is RecordItem => !!r);
  return own.find(r => r.energy === 'up') ?? own.find(r => r.quote) ?? own[0];
}
