import type { Activity, Program } from '../types';
import { overlapsSchedule } from './flow';
import { whenOffset } from './upcoming';

// 부담 표시(와우 퀘스트 로그처럼): 다른 학생과 비교하지 않고, 이번 주 '내' 일정에 비춰 여유/빠듯 글자로만 알린다.

/** 오늘부터 7일 */
const WEEK_DAYS = 7;
/** ponytail: 이번 주 내 일정이 이 개수 이상이면 빠듯으로 본다. 예시값이다. 학생 피드백을 받으면 조정한다 */
export const TIGHT_AT = 3;

export type WeekLoad = { tight: boolean; label: '여유' | '빠듯'; why: string };

const inWeek = (n: number | undefined): n is number => n !== undefined && n >= 0 && n < WEEK_DAYS;

/** 이번 주(오늘부터 7일) 내 일정 수: 신청했거나 하는 활동의 모임 날짜 + 준비 중 활동의 신청 마감. */
export function myWeekCount(activities: Activity[], week: number): number {
  return activities.filter(a =>
    ((a.status === 'applied' || a.status === 'ongoing') && inWeek(whenOffset(a.schedule, week)))
    || (a.status === 'preparing' && inWeek(a.due?.dday))
  ).length;
}

/** 이 후보를 더하면 이번 주가 어떤지. 일정이 겹치면 개수와 상관없이 빠듯이다. */
export function weekLoad(p: Program, activities: Activity[], week: number): WeekLoad {
  const n = myWeekCount(activities.filter(a => a.programId !== p.id), week);
  const overlap = overlapsSchedule(p, activities);
  const tight = overlap || n >= TIGHT_AT;
  const why = overlap ? '내 일정과 시간이 겹쳐요' : n === 0 ? '이번 주 내 일정이 없어요' : `이번 주 내 일정 ${n}개`;
  return { tight, label: tight ? '빠듯' : '여유', why };
}
