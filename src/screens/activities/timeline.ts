import type { DateRange, GanttRow, GanttState, LegendItem } from '../../components';
import { COLUMN_OF } from '../../domain/activities';
import type { Activity, ActivityStatus } from '../../domain/types';
import { PROTOTYPE_TODAY, TODAY_YEAR } from '../../domain/today';
import { FIELD_GROUP } from '../../domain/vocab';

// ponytail: 학기 범위는 예시 데이터 기준 값이다. 실제 학사 일정이 붙으면 거기서 받는다.
export const SEMESTER: DateRange = { start: '2026-09-01', end: '2026-12-20' };
const YEAR = TODAY_YEAR;

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (m: number, d: number) => `${YEAR}-${pad(m)}-${pad(d)}`;
const lastDayOf = (m: number) => new Date(Date.UTC(YEAR, m, 0)).getUTCDate();

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

export type ScheduleDates = { start?: string; end?: string; result?: string };

/**
 * 일정 글('9월 4일 ~ 12월 10일 · 매주 목')에서 날짜를 읽는다. 읽히는 말만 읽고 나머지는 버린다.
 * 다른 해가 적힌 말('연수 2027년 1월부터')은 이 학기 밖이라 읽지 않는다.
 */
export function parseSchedule(schedule: string): ScheduleDates {
  let text = schedule.replace(/(\d{4})년\s*\d{1,2}월(\s*\d{1,2}일)?/g, (all, y: string) => (Number(y) === YEAR ? all : ''));
  const out: ScheduleDates = {};

  text = text.replace(/결과 발표\s*(\d{1,2})월\s*(\d{1,2})일/, (_, m: string, d: string) => { out.result = iso(+m, +d); return ''; });

  // 카탈로그 일정 '10.14(수) 18:30', '10.20(화)부터 4주'. 신청한 활동이 간트 막대가 되려면 읽혀야 한다.
  const dotted = /^(\d{1,2})\.(\d{1,2})\([^)]*\)(부터\s*(\d+)주)?/.exec(text.trim());
  if (dotted) {
    const start = iso(+dotted[1], +dotted[2]);
    return { ...out, start, end: dotted[4] ? addDays(start, 7 * +dotted[4] - 1) : start };
  }

  let hit = /(\d{1,2})월\s*(\d{1,2})일\s*~\s*(\d{1,2})월\s*(\d{1,2})일/.exec(text);
  if (hit) return { ...out, start: iso(+hit[1], +hit[2]), end: iso(+hit[3], +hit[4]) };
  hit = /(\d{1,2})월\s*~\s*(\d{1,2})월/.exec(text);
  if (hit) return { ...out, start: iso(+hit[1], 1), end: iso(+hit[2], lastDayOf(+hit[2])) };
  hit = /(\d{1,2})월\s*(\d{1,2})일\s*끝남/.exec(text);
  if (hit) return { ...out, start: iso(+hit[1], +hit[2]), end: iso(+hit[1], +hit[2]) };
  hit = /(\d{1,2})월부터/.exec(text);
  if (hit) return { ...out, start: iso(+hit[1], 1) };
  return out;
}

const STATE: Record<ActivityStatus, GanttState> = { preparing: 'prep', applied: 'prep', ongoing: 'active', ended: 'done', recorded: 'done', declined: 'done' };

/** 활동 하나의 막대 기간. 기간을 알 수 없으면 undefined(날짜 미정 줄로 간다). */
function periodOf(a: Activity, today: string, dates: ScheduleDates, deadline: string | undefined): { start: string; end: string } | undefined {
  if (a.status === 'preparing' || a.status === 'applied') {
    // 아직 시작 전: 오늘부터 다음 날짜(신청 마감·결과 발표)까지가 기다리는 기간이다.
    const next = [deadline, dates.result].filter((x): x is string => !!x).sort().at(-1);
    if (next) return { start: next < today ? next : today, end: next };
  }
  if (dates.start && dates.end) return { start: dates.start, end: dates.end };
  if (dates.start && a.status === 'ongoing') return { start: dates.start, end: SEMESTER.end };
  return undefined;
}

export type Timeline = { rows: GanttRow[]; undated: Activity[] };

/** 활동 → 학기 간트 행. 빠뜨리지 않는다: 기간이 없는 활동은 undated 로 돌려준다. */
export function timelineOf(activities: Activity[], today: string = PROTOTYPE_TODAY): Timeline {
  const rows: GanttRow[] = [];
  const undated: Activity[] = [];
  for (const a of activities) {
    const dates = parseSchedule(a.schedule);
    const deadline = a.due ? addDays(today, a.due.dday) : undefined;
    const period = periodOf(a, today, dates, deadline);
    if (!period) { undated.push(a); continue; }
    rows.push({ id: a.id, label: a.title, ...period, state: STATE[a.status], tone: FIELD_GROUP[a.field], deadline, result: dates.result });
  }
  rows.sort((x, y) => x.start.localeCompare(y.start) || x.end.localeCompare(y.end));
  return { rows, undated };
}

/** 세 칸 요약 막대에 쓸 개수 */
export function columnCounts(activities: Activity[]): Record<'todo' | 'doing' | 'done', number> {
  const out = { todo: 0, doing: 0, done: 0 };
  for (const a of activities) out[COLUMN_OF[a.status]] += 1;
  return out;
}

/** 오늘이 속한 달 전체. 일정의 첫 화면은 이 범위만 그린다. */
export function monthRange(today: string = PROTOTYPE_TODAY): DateRange {
  const [y, m] = today.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}` };
}

export type Clipped = { rows: GanttRow[]; hidden: number };

/**
 * 범위와 겹치는 행만 남기고 막대를 범위 안으로 자른다(범위 밖 마감·발표 표시는 뺀다).
 * 한 번에 limit 줄까지만 보여 준다. 넘치면 남길 순서: 범위 안에 마감·발표가 있는 준비·대기(가까운 날 먼저) → 진행 중 → 끝난 것.
 * 진행 중이 있으면 준비·대기는 limit - 2 줄까지만 먼저 남겨, 두 종류가 함께 보이게 한다. 그린 순서는 원래 순서를 지킨다.
 */
export function clipRows(rows: GanttRow[], range: DateRange, limit = 5): Clipped {
  const inside = (d?: string) => (d && d >= range.start && d <= range.end ? d : undefined);
  const hit = rows
    .filter(r => r.end >= range.start && r.start <= range.end)
    .map(r => ({ ...r, start: r.start < range.start ? range.start : r.start, end: r.end > range.end ? range.end : r.end, deadline: inside(r.deadline), result: inside(r.result) }));
  if (hit.length <= limit) return { rows: hit, hidden: 0 };
  const idx = hit.map((r, i) => ({ r, i }));
  const mark = (r: GanttRow) => r.deadline ?? r.result;
  const dated = idx.filter(x => x.r.state === 'prep' && mark(x.r)).sort((a, b) => mark(a.r)!.localeCompare(mark(b.r)!) || a.i - b.i);
  const active = idx.filter(x => x.r.state === 'active');
  const cap = active.length ? Math.max(1, limit - 2) : limit;
  const order = [...dated.slice(0, cap), ...active, ...dated.slice(cap), ...idx.filter(x => !dated.includes(x) && !active.includes(x))];
  const keep = new Set(order.slice(0, limit).map(x => x.i));
  return { rows: hit.filter((_, i) => keep.has(i)), hidden: hit.length - limit };
}

const GANTT_KEYS: { label: string; mark: LegendItem['mark']; tone?: LegendItem['tone']; shown: (rows: GanttRow[], inside: (d?: string) => boolean) => boolean }[] = [
  { label: '준비·대기', mark: 'hatch', tone: 'ink', shown: rows => rows.some(r => r.state === 'prep') },
  { label: '하는 중', mark: 'fill', tone: 'ink', shown: rows => rows.some(r => r.state === 'active') },
  { label: '끝', mark: 'faded', tone: 'ink', shown: rows => rows.some(r => r.state === 'done') },
  { label: '마감', mark: 'diamond', tone: 'ink', shown: (rows, inside) => rows.some(r => inside(r.deadline)) },
  { label: '결과 발표', mark: 'circle', tone: 'ink', shown: (rows, inside) => rows.some(r => inside(r.result)) }
];

/**
 * 일정표 범례: 지금 그린 범위에 실제로 보이는 기호만. 기호를 다 늘어놓으면 읽을 것이 늘어난다.
 * 오늘 선은 그림에 '오늘' 글자가 붙어 있어 범례에 넣지 않는다.
 */
export function ganttLegend(rows: GanttRow[], range: DateRange): LegendItem[] {
  const inside = (d?: string) => !!d && d >= range.start && d <= range.end;
  const seen = rows.filter(r => r.end >= range.start && r.start <= range.end);
  return GANTT_KEYS.filter(k => k.shown(seen, inside)).map(({ label, mark, tone }) => ({ label, mark, tone }));
}
