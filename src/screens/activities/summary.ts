import { semesterKey } from '../../domain/interview/archive';
import { josa } from '../../domain/text';
import { PROTOTYPE_TODAY } from '../../domain/today';
import type { Activity, RecordItem } from '../../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { addDays } from './timeline';

/** 내 활동 요약 화면이 보여 줄 문장과 값. 계산만 하고 그리지 않는다. */

const isTodo = (a: Activity) => a.status === 'preparing' || a.status === 'applied';
const ENDED = (a: Activity) => a.status === 'ended';

export type NextDue = { id: string; title: string; dday: number };

/** 할 것 중 마감이 가까운 순 n개. 오늘 마감이 맨 앞이다. */
export function nextDues(activities: Activity[], n = 2): NextDue[] {
  return activities
    .filter(a => isTodo(a) && a.due)
    .map(a => ({ id: a.id, title: a.title, dday: a.due!.dday }))
    .sort((x, y) => x.dday - y.dday)
    .slice(0, n);
}

export const ongoingTitles = (activities: Activity[]) => activities.filter(a => a.status === 'ongoing').map(a => a.title);

export const pendingRetros = (activities: Activity[]) => activities.filter(ENDED);

/** 일정 화면 머리 한 줄: '이번 달 마감 2개, 진행 중 2개'. 이번 달 = 오늘이 속한 달. */
export function scheduleHeadline(activities: Activity[], today: string = PROTOTYPE_TODAY): string {
  const month = today.slice(0, 7);
  const due = activities.filter(a => isTodo(a) && a.due && addDays(today, a.due.dday).startsWith(month)).length;
  const going = ongoingTitles(activities).length;
  if (!due && !going) return '이번 달 마감도, 진행 중인 활동도 없어요';
  if (!due) return `이번 달 마감은 없고, 진행 중 ${going}개예요`;
  if (!going) return `이번 달 마감 ${due}개, 진행 중인 활동은 없어요`;
  return `이번 달 마감 ${due}개, 진행 중 ${going}개`;
}

/** 가장 최근 기록. 학기 → 월 순, 같으면 나중에 추가한 쪽. */
export function latestRecord(records: RecordItem[]): RecordItem | undefined {
  const month = (r: RecordItem) => Number(/(\d{1,2})월/.exec(r.date)?.[1] ?? 0);
  let best: RecordItem | undefined;
  for (const r of records) {
    if (!best || semesterKey(r.semester) > semesterKey(best.semester) || (r.semester === best.semester && month(r) >= month(best))) best = r;
  }
  return best;
}

/** 기록 화면 머리 한 줄: 가장 많은 분야 묶음. 같은 수면 앞선 묶음. */
export function recordHeadline(records: RecordItem[]): string {
  if (records.length === 0) return '아직 기록이 없어요';
  const tally = new Map<string, number>();
  for (const r of records) { const g = GROUP_LABEL[FIELD_GROUP[r.field]]; tally.set(g, (tally.get(g) ?? 0) + 1); }
  const [label, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return `기록 ${records.length}개 중 ${n}개가 ${label}${josa(label, '이에요', '예요')}`;
}
