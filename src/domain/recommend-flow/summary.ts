import { ddayText } from '../text';
import type { Activity, FieldGroup, Funnel } from '../types';
import { FIELD_LABEL, FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { prepareHref } from './flow';
import { whenOffset, type UpcomingItem, type UpcomingTarget } from './upcoming';

// 홈·추천 요약 문장. 학생의 실제 상태에서 계산하고, 화면은 이 결과를 그대로 보여 준다.

export type TodayTarget = { kind: 'activity'; id: string } | { path: string };
/**
 * title = 활동 이름, what = 무슨 일인지 한두 낱말(회고·신청 마감·모임), day = 오늘로부터 며칠 뒤(0 = 오늘), at = 시각('18:00')이 있으면.
 * 미니 타임라인이 day·at 순으로 줄 세우고 title·what 만 보여 준다. text 는 문장형(접근성 이름 등)이다.
 */
export type TodayTask = { id: string; kind: 'review' | 'deadline' | 'today'; text: string; title: string; what: string; day: number; at?: string; badge?: string; urgent?: boolean; target: TodayTarget };

const clock = (s?: string) => /(\d{1,2}:\d{2})/.exec(s ?? '')?.[1];

export const MAX_TODAY_TASKS = 3;
/** 마감이 이 날 안이면 오늘 할 일로 올린다. */
const DUE_SOON_DAYS = 7;

/**
 * 오늘 할 일 최대 3개. 순서: 회고 대기 → 마감 임박 준비(빠른 순) → 오늘 있는 활동.
 * ponytail: 오늘 활동은 일정 글이 '10.14(수) 18:30' 꼴일 때만 읽는다. 일정이 날짜 필드가 되면 바꾼다.
 */
export function todayTasks(activities: Activity[], week: number): TodayTask[] {
  const reviews: TodayTask[] = activities
    .filter(a => a.status === 'ended')
    .map(a => ({ id: `review:${a.id}`, kind: 'review', text: `${a.title} 회고 쓰기`, title: a.title, what: '회고', day: 0, badge: '회고 대기', target: { path: `activities/records/interview/${a.id}` } }));
  const deadlines: TodayTask[] = activities
    .filter(a => a.status === 'preparing' && a.due !== undefined && a.due.dday <= DUE_SOON_DAYS)
    .sort((a, b) => a.due!.dday - b.due!.dday)
    .map(a => ({
      id: `due:${a.id}`, kind: 'deadline', text: `${a.title}, ${a.due!.label}`, title: a.title, what: '신청 마감', day: a.due!.dday, at: clock(a.due!.label), badge: ddayText(a.due!.dday), urgent: a.due!.dday <= 1,
      target: a.programId ? { path: prepareHref(a.programId) } : { kind: 'activity', id: a.id }
    }));
  const today: TodayTask[] = activities
    .filter(a => (a.status === 'applied' || a.status === 'ongoing') && whenOffset(a.schedule, week) === 0)
    .map(a => ({ id: `today:${a.id}`, kind: 'today', text: `${a.title}, ${a.schedule}`, title: a.title, what: '모임', day: 0, at: clock(a.schedule), badge: '오늘', target: { kind: 'activity', id: a.id } }));
  return [...reviews, ...deadlines, ...today].slice(0, MAX_TODAY_TASKS);
}

/** 미니 타임라인 순서: 가까운 날부터, 같은 날이면 시각이 이른 것부터(시각이 없으면 그 날의 맨 앞). */
export const timelineOrder = (tasks: TodayTask[]): TodayTask[] =>
  [...tasks].sort((a, b) => a.day - b.day || (a.at ?? '').localeCompare(b.at ?? ''));

/** 이번 학기 활동 = 하는 중 + 끝난 것(회고 대기·기록됨). 신청 준비·결과 대기·떨어진 신청은 세지 않는다. */
export const isSemesterActivity = (a: Activity) => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded';

/** 이번 학기 한 줄: 활동 수와 가장 많이 한 분야. */
export function semesterLine(activities: Activity[]): string {
  const mine = activities.filter(isSemesterActivity);
  if (mine.length === 0) return '이번 학기 활동이 아직 없어요. 추천에서 하나 골라 보세요.';
  // 화면의 분야 색·라벨과 맞추려고 세부 분야가 아니라 분야 묶음으로 센다.
  const counts = new Map<string, number>();
  for (const a of mine) { const g = GROUP_LABEL[FIELD_GROUP[a.field]]; counts.set(g, (counts.get(g) ?? 0) + 1); }
  const [field, n] = [...counts.entries()].reduce((best, e) => (e[1] > best[1] ? e : best));
  if (mine.length === 1) return `이번 학기 활동 1개, ${field} 분야예요.`;
  return n === 1 ? `이번 학기 활동 ${mine.length}개, 분야가 모두 달라요.` : `이번 학기 활동 ${mine.length}개, ${field} 분야가 가장 많아요.`;
}

export type SemesterBar = { group: FieldGroup; label: string; count: number };

/** 이번 학기 활동을 분야 묶음별로 센 막대. 많은 분야부터, 같으면 묶음 순서대로. 활동이 없으면 빈 목록. */
export function semesterBars(activities: Activity[]): SemesterBar[] {
  const counts = new Map<FieldGroup, number>();
  for (const a of activities.filter(isSemesterActivity)) { const g = FIELD_GROUP[a.field]; counts.set(g, (counts.get(g) ?? 0) + 1); }
  const order: FieldGroup[] = ['dev', 'ai', 'plan', 'mentor', 'global', 'other'];
  return order.filter(g => counts.has(g)).map(g => ({ group: g, label: GROUP_LABEL[g], count: counts.get(g)! })).sort((a, b) => b.count - a.count);
}

/** 이번 학기 막대 머리말(15자 안팎): '활동 4개 · AI·데이터 중심' */
export function semesterTag(bars: SemesterBar[]): string {
  const total = bars.reduce((n, b) => n + b.count, 0);
  if (total === 0) return '아직 활동이 없어요';
  return bars.length > 1 && bars[0].count === 1 ? `활동 ${total}개 · 고르게` : `활동 ${total}개 · ${bars[0].label} 중심`;
}

/** 추천을 어떻게 골랐는지 한 줄. 누르면 깔때기 그림이 서랍으로 열린다. */
export const pickingLine = (f: Funnel): string =>
  f.pool === 0 ? '이번 주에 모집 중인 활동이 아직 없어요.' : `후보 ${f.pool}개 중 마감·대상·시간을 맞춘 ${f.fit}개예요.`;

const sameTarget = (a: TodayTarget, b: UpcomingTarget) => ('path' in a ? 'path' in b && a.path === b.path : !('path' in b) && a.kind === b.kind && a.id === b.id);

/** 오늘 할 일에 이미 있는 일은 타임라인에서 뺀다. 같은 일로 가는 길을 한 화면에 둘 두지 않는다. */
export const withoutTasks = (items: UpcomingItem[], tasks: TodayTask[]): UpcomingItem[] =>
  items.filter(i => !tasks.some(t => sameTarget(t.target, i.target)));
