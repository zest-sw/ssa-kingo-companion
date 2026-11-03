import { ddayText } from '../text';
import type { Activity, Field, Funnel } from '../types';
import { FIELD_LABEL } from '../vocab';
import { prepareHref } from './flow';
import { whenOffset, type UpcomingItem, type UpcomingTarget } from './upcoming';

// 홈·추천 요약 문장. 학생의 실제 상태에서 계산하고, 화면은 이 결과를 그대로 보여 준다.

export type TodayTarget = { kind: 'activity'; id: string } | { path: string };
export type TodayTask = { id: string; kind: 'review' | 'deadline' | 'today'; text: string; badge?: string; urgent?: boolean; target: TodayTarget };

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
    .map(a => ({ id: `review:${a.id}`, kind: 'review', text: `${a.title} 회고 쓰기`, badge: '회고 대기', target: { path: `activities/records/interview/${a.id}` } }));
  const deadlines: TodayTask[] = activities
    .filter(a => a.status === 'preparing' && a.due !== undefined && a.due.dday <= DUE_SOON_DAYS)
    .sort((a, b) => a.due!.dday - b.due!.dday)
    .map(a => ({
      id: `due:${a.id}`, kind: 'deadline', text: `${a.title}, ${a.due!.label}`, badge: ddayText(a.due!.dday), urgent: a.due!.dday <= 1,
      target: a.programId ? { path: prepareHref(a.programId) } : { kind: 'activity', id: a.id }
    }));
  const today: TodayTask[] = activities
    .filter(a => (a.status === 'applied' || a.status === 'ongoing') && whenOffset(a.schedule, week) === 0)
    .map(a => ({ id: `today:${a.id}`, kind: 'today', text: `${a.title}, ${a.schedule}`, badge: '오늘', target: { kind: 'activity', id: a.id } }));
  return [...reviews, ...deadlines, ...today].slice(0, MAX_TODAY_TASKS);
}

/** 이번 학기 활동 = 하는 중 + 끝난 것(회고 대기·기록됨). 신청 준비·결과 대기·떨어진 신청은 세지 않는다. */
export const isSemesterActivity = (a: Activity) => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded';

/** 이번 학기 한 줄: 활동 수와 가장 많이 한 분야. */
export function semesterLine(activities: Activity[]): string {
  const mine = activities.filter(isSemesterActivity);
  if (mine.length === 0) return '이번 학기 활동이 아직 없어요. 추천에서 하나 골라 보세요.';
  const counts = new Map<Field, number>();
  for (const a of mine) counts.set(a.field, (counts.get(a.field) ?? 0) + 1);
  const [field, n] = [...counts.entries()].reduce((best, e) => (e[1] > best[1] ? e : best));
  if (mine.length === 1) return `이번 학기 활동 1개, ${FIELD_LABEL[field]} 분야예요.`;
  return n === 1 ? `이번 학기 활동 ${mine.length}개, 분야가 모두 달라요.` : `이번 학기 활동 ${mine.length}개, ${FIELD_LABEL[field]} 분야가 가장 많아요.`;
}

/** 추천을 어떻게 골랐는지 한 줄. 누르면 깔때기 그림이 서랍으로 열린다. */
export const pickingLine = (f: Funnel): string =>
  f.pool === 0 ? '이번 주에 모집 중인 활동이 아직 없어요.' : `후보 ${f.pool}개 중 마감·대상·시간을 맞춘 ${f.fit}개예요.`;

const sameTarget = (a: TodayTarget, b: UpcomingTarget) => ('path' in a ? 'path' in b && a.path === b.path : !('path' in b) && a.kind === b.kind && a.id === b.id);

/** 오늘 할 일에 이미 있는 일은 타임라인에서 뺀다. 같은 일로 가는 길을 한 화면에 둘 두지 않는다. */
export const withoutTasks = (items: UpcomingItem[], tasks: TodayTask[]): UpcomingItem[] =>
  items.filter(i => !tasks.some(t => sameTarget(t.target, i.target)));
