import type { Activity, FieldGroup } from '../../domain/types';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { FIELD_GROUP } from '../../domain/vocab';
import { addDays, parseSchedule, SEMESTER } from './timeline';

// 내 활동 한눈에의 주인공 '이번 주' 그림이 그릴 값. 계산만 하고 그리지 않는다.

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const weekdayOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

/** 마감이 이만큼 가까우면(D-3 이하) 주황으로 표시한다. 나머지 마감은 먹색이다. */
export const NEAR_DDAY = 3;

export type WeekDay = { iso: string; name: string; date: number; today: boolean };

/** 마감 줄: 오늘부터 마감일까지 가는 선 + 마감 ◆. day 는 이번 주 안의 칸(0 = 월). */
export type WeekDue = { kind: 'due'; id: string; title: string; tone: FieldGroup; day: number; from: number; dday: number; label: string; near: boolean };
/** 하는 중 줄: 이번 주 안에 걸친 기간 막대 + 모이는 요일 점. */
export type WeekOngoing = { kind: 'ongoing'; id: string; title: string; tone: FieldGroup; from: number; to: number; meets: number[]; every?: '매주' | '격주'; meetName?: string };
export type WeekRow = WeekDue | WeekOngoing;

export type Week = { days: WeekDay[]; todayIndex: number; rows: WeekRow[]; dues: number; ongoing: number; laterDues: number };

/** 오늘이 속한 주의 월요일 */
export function mondayOf(today: string): string {
  return addDays(today, -((weekdayOf(today) + 6) % 7));
}

/** '매주 화', '격주 화' 를 읽는다. 요일 하나만 읽는다. */
export function meetingOf(schedule: string): { every: '매주' | '격주'; weekday: number } | undefined {
  const hit = /(매주|격주)\s*([일월화수목금토])(?![가-힣])/.exec(schedule);
  return hit ? { every: hit[1] as '매주' | '격주', weekday: WEEKDAY.indexOf(hit[2]) } : undefined;
}

const isTodo = (a: Activity) => a.status === 'preparing' || a.status === 'applied';

/**
 * 이번 주(월~일) 그림. 마감이 이번 주에 있는 할 것(가까운 순) 다음에 하는 중인 활동을 놓는다.
 * 격주 모임은 어느 주인지 알 수 없어 점 대신 이름만 '격주 화'로 둔다(점은 확실한 날에만 찍는다).
 */
export function weekOf(activities: Activity[], today: string = PROTOTYPE_TODAY): Week {
  const monday = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(monday, i);
    return { iso, name: WEEKDAY[weekdayOf(iso)], date: Number(iso.slice(8)), today: iso === today };
  });
  const todayIndex = days.findIndex(d => d.today);
  const sunday = days[6].iso;
  const indexOf = (iso: string) => days.findIndex(d => d.iso === iso);

  const dueRows: WeekDue[] = [];
  let laterDues = 0;
  for (const a of activities) {
    if (!isTodo(a) || !a.due || a.due.dday < 0) continue;
    const date = addDays(today, a.due.dday);
    if (date > sunday) { laterDues += 1; continue; }
    dueRows.push({ kind: 'due', id: a.id, title: a.title, tone: FIELD_GROUP[a.field], day: indexOf(date), from: todayIndex, dday: a.due.dday, label: a.due.label, near: a.due.dday <= NEAR_DDAY });
  }
  dueRows.sort((x, y) => x.dday - y.dday);

  const ongoing: WeekOngoing[] = [];
  for (const a of activities) {
    if (a.status !== 'ongoing') continue;
    const d = parseSchedule(a.schedule);
    const start = d.start ?? monday;
    const end = d.end ?? SEMESTER.end;
    if (end < monday || start > sunday) continue;
    const from = start < monday ? 0 : indexOf(start);
    const to = end > sunday ? 6 : indexOf(end);
    const meet = meetingOf(a.schedule);
    const meetDay = meet ? days.findIndex(x => weekdayOf(x.iso) === meet.weekday) : -1;
    const meets = meet?.every === '매주' && meetDay >= from && meetDay <= to ? [meetDay] : [];
    ongoing.push({ kind: 'ongoing', id: a.id, title: a.title, tone: FIELD_GROUP[a.field], from, to, meets, every: meet?.every, meetName: meet ? WEEKDAY[meet.weekday] : undefined });
  }

  return { days, todayIndex, rows: [...dueRows, ...ongoing], dues: dueRows.length, ongoing: ongoing.length, laterDues };
}

/** 이번 주 카드 제목(결론 한 문장). 오늘 마감이 있으면 그것부터 말한다. */
export function weekTitle(w: Week): string {
  const today = w.rows.filter(r => r.kind === 'due' && r.dday === 0).length;
  if (today) return `오늘 마감 ${today}개${w.dues > today ? `, 이번 주 마감 ${w.dues}개` : ''}`;
  if (w.dues && w.ongoing) return `이번 주 마감 ${w.dues}개, 하는 중 ${w.ongoing}개`;
  if (w.dues) return `이번 주 마감 ${w.dues}개`;
  if (w.ongoing) return `이번 주 마감은 없고, 하는 중 ${w.ongoing}개`;
  return '이번 주는 마감도, 하는 활동도 없어요';
}

/** 줄 아래 작은 글: 마감 '오늘 마감'·'신청 마감 D-5', 하는 중 '매주 화' */
export function rowNote(r: WeekRow): string {
  if (r.kind === 'due') return r.dday === 0 ? `오늘 ${r.label}` : `${r.label} D-${r.dday}`;
  return r.every && r.meetName ? `${r.every} ${r.meetName}` : '하는 중';
}

/** 끝난 날. 회고를 가장 오래 기다린 활동을 고를 때 쓴다. 날짜를 못 읽으면 맨 뒤로. */
const endedOn = (a: Activity) => parseSchedule(a.schedule).end ?? '9999-12-31';

/** 회고 대기: 가장 오래 기다린(먼저 끝난) 순서 */
export function retroQueue(activities: Activity[]): Activity[] {
  return activities.filter(a => a.status === 'ended').sort((x, y) => endedOn(x).localeCompare(endedOn(y)));
}

/** '10월 8일에 끝났어요' */
export function endedText(a: Activity): string {
  const end = parseSchedule(a.schedule).end;
  if (!end) return '끝났어요';
  const [, m, d] = end.split('-').map(Number);
  return `${m}월 ${d}일에 끝났어요`;
}
