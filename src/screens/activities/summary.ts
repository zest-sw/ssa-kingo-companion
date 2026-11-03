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

/** '할 것 3개 중 2개가 이번 주 마감이에요'. 이번 주 = 오늘부터 7일 안. */
export function todoSentence(activities: Activity[]): string {
  const todo = activities.filter(isTodo);
  if (todo.length === 0) return '지금 할 것이 없어요';
  const week = todo.filter(a => a.due && a.due.dday <= 6).length;
  if (week === 0) return `할 것 ${todo.length}개, 이번 주 마감은 없어요`;
  if (week === todo.length) return todo.length === 1 ? '할 것 1개가 이번 주 마감이에요' : `할 것 ${todo.length}개가 모두 이번 주 마감이에요`;
  return `할 것 ${todo.length}개 중 ${week}개가 이번 주 마감이에요`;
}

export const ongoingTitles = (activities: Activity[]) => activities.filter(a => a.status === 'ongoing').map(a => a.title);

export const pendingRetros = (activities: Activity[]) => activities.filter(ENDED);

/** 일정 카드: 상태별 개수를 말로. 0개는 뺀다. */
export function scheduleSentence(activities: Activity[]): string {
  if (activities.length === 0) return '추천에서 신청 준비를 누르면 활동이 생겨요';
  const count = (f: (a: Activity) => boolean) => activities.filter(f).length;
  const parts = [
    [count(a => a.status === 'ongoing'), '진행 중'],
    [count(a => a.status === 'preparing'), '신청 준비'],
    [count(a => a.status === 'applied'), '결과 기다림']
  ].filter(([n]) => n).map(([n, l]) => `${l} ${n}개`);
  return parts.length ? parts.join(', ') : '지금 하는 활동이 없어요';
}

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

/** 기록 카드: '기록 6개, 이번 학기 3개. 가장 최근은 ○○' */
export function recordSentence(records: RecordItem[], currentTerm: string): string {
  const latest = latestRecord(records);
  if (!latest) return '끝난 활동의 회고를 쓰면 기록이 생겨요';
  const term = records.filter(r => r.semester === currentTerm).length;
  return `기록 ${records.length}개, 이번 학기 ${term}개. 가장 최근은 ${latest.title}`;
}

/** 기록 화면 머리 한 줄: 가장 많은 분야 묶음. 같은 수면 앞선 묶음. */
export function recordHeadline(records: RecordItem[]): string {
  if (records.length === 0) return '아직 기록이 없어요';
  const tally = new Map<string, number>();
  for (const r of records) { const g = GROUP_LABEL[FIELD_GROUP[r.field]]; tally.set(g, (tally.get(g) ?? 0) + 1); }
  const [label, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return `기록 ${records.length}개 중 ${n}개가 ${label}${josa(label, '이에요', '예요')}`;
}
