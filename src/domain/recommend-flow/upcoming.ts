import type { Activity, Program, Scored } from '../types';
import { ddayOf } from '../recommend';
import { TODAY_YEAR, todayUtc } from '../today';

// 홈 '곧 있어요' 14일 타임라인에 올릴 점. 기준일은 today.ts 의 PROTOTYPE_TODAY(1주차 첫날).
// 오늘·내일 일은 '오늘 할 일'이 맡고, 타임라인은 모레부터 14일을 맡는다. 같은 일이 홈에 두 번 나오지 않는다.

export const UPCOMING_DAYS = 14;
/** 타임라인이 시작하는 날(오늘로부터). 그 앞(오늘·내일)은 오늘 할 일 칸이다 */
export const UPCOMING_FROM = 2;
export type UpcomingKind = 'deadline' | 'activity';
export type UpcomingTarget = { kind: 'opportunity' | 'activity'; id: string } | { path: string };
/** label 은 접근성·툴팁용 문장, short 는 점 옆에 붙일 이름(활동 이름만. 마감은 ◆ 모양이 말한다) */
export type UpcomingItem = { id: string; date: string; label: string; short: string; kind: UpcomingKind; target: UpcomingTarget };

const pad = (n: number) => String(n).padStart(2, '0');
const isoAt = (offset: number, week: number) => {
  const d = new Date(todayUtc(7 * (week - 1) + offset));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
export const todayIso = (week: number) => isoAt(0, week);
/** 모레부터 14일 */
export const upcomingRange = (week: number) => ({ start: isoAt(UPCOMING_FROM, week), end: isoAt(UPCOMING_FROM + UPCOMING_DAYS, week) });

/** '10.14(수) 18:30' → 오늘로부터 며칠 뒤. 날짜를 못 읽으면 undefined. 같은 해(2026)로 본다. */
export function whenOffset(when: string, week: number): number | undefined {
  const m = /^(\d{1,2})\.(\d{1,2})/.exec(when);
  if (!m) return undefined;
  const day = Date.UTC(TODAY_YEAR, Number(m[1]) - 1, Number(m[2]));
  return Math.round((day - todayUtc(7 * (week - 1))) / 86_400_000);
}

const within = (n: number | undefined): n is number => n !== undefined && n >= UPCOMING_FROM && n <= UPCOMING_FROM + UPCOMING_DAYS;

/**
 * 곧 있는 일(모레부터 14일): 준비 중 활동의 신청 마감 ◆, 추천 후보의 마감 ◆과 활동 날짜 ●. 회고 대기는 오늘 일이라 오늘 할 일에만 있다.
 * 이미 활동이 된 후보는 활동 쪽 마감만 쓴다.
 * ponytail: 하는 중인 활동의 모임 날짜는 일정이 글(문자열)이라 올리지 않는다. 일정이 날짜 필드가 되면 올린다.
 */
export function upcomingItems(activities: Activity[], picks: Scored[], week: number): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  const taken = new Set(activities.map(a => a.programId).filter((x): x is string => !!x));
  for (const a of activities) {
    const dday = a.due?.dday;
    if (a.status === 'preparing' && within(dday)) items.push({ id: `due:${a.id}`, date: isoAt(dday, week), label: `${a.title} 마감`, short: a.title, kind: 'deadline', target: { kind: 'activity', id: a.id } });
  }
  for (const { p } of picks) {
    if (!taken.has(p.id)) items.push(...programItems(p, week));
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function programItems(p: Program, week: number): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  const d = ddayOf(p, week);
  if (within(d)) out.push({ id: `due:${p.id}`, date: isoAt(d, week), label: `${p.title} 마감`, short: p.title, kind: 'deadline', target: { kind: 'opportunity', id: p.id } });
  const at = whenOffset(p.when, week);
  if (within(at)) out.push({ id: `on:${p.id}`, date: isoAt(at, week), label: p.title, short: p.title, kind: 'activity', target: { kind: 'opportunity', id: p.id } });
  return out;
}
