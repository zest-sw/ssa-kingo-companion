import type { DateRange, GanttRow, GanttState } from '../../components';
import { COLUMN_OF } from '../../domain/activities';
import type { Activity, ActivityStatus } from '../../domain/types';
import { FIELD_GROUP } from '../../domain/vocab';

// ponytail: '오늘'과 학기 범위는 예시 데이터 기준 값이다(추천 흐름의 기준일 10월 13일과 같다). 실제 날짜·학사 일정이 붙으면 거기서 받는다.
export const TODAY = '2026-10-13';
export const SEMESTER: DateRange = { start: '2026-09-01', end: '2026-12-20' };
const YEAR = 2026;

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
export function timelineOf(activities: Activity[], today: string = TODAY): Timeline {
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
