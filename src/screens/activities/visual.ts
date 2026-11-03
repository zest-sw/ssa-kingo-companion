import type { GanttRow } from '../../components';
import { semesterAxis, semesterLabel } from '../../domain/analysis/semester';
import { semesterShort } from '../../domain/analysis/visual';
import type { Activity, FieldGroup, RecordItem } from '../../domain/types';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { SEMESTER_NOW } from '../../data/analysis';
import { nextDues, pendingRetros } from './summary';
import { addDays, columnCounts, SEMESTER, timelineOf } from './timeline';

// 내 활동 요약 그림이 그릴 모양과 머리말. 계산만 하고 그리지 않는다.

const DAY_MS = 86_400_000;
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const dayIndex = (iso: string) => Math.round(Date.parse(iso) / DAY_MS);

export type StatusBar = { id: 'todo' | 'doing' | 'done'; label: string; count: number };

/** 할 것·하는 중·끝난 것 개수. 막대 길이는 가장 큰 칸을 기준으로 맞춘다(퍼센트가 아니라 개수). */
export function statusBars(activities: Activity[]): StatusBar[] {
  const c = columnCounts(activities);
  return [{ id: 'todo', label: '할 것', count: c.todo }, { id: 'doing', label: '하는 중', count: c.doing }, { id: 'done', label: '끝난 것', count: c.done }];
}

export type WeekDay = { offset: number; label: string; today: boolean };
export type WeekDue = { id: string; title: string; dday: number };
export type Week = { days: WeekDay[]; dues: WeekDue[]; farther: number };

/** 이번 주(오늘부터 7일) 미니 타임라인. 다음 마감 n개 중 이번 주 안에 드는 것만 점으로 찍고, 밖에 있는 건 개수로만 센다. */
export function weekOf(activities: Activity[], today: string = PROTOTYPE_TODAY, n = 2): Week {
  const days = Array.from({ length: 7 }, (_, offset) => ({
    offset, label: offset === 0 ? '오늘' : WEEKDAY[new Date(`${addDays(today, offset)}T00:00:00Z`).getUTCDay()], today: offset === 0
  }));
  const next = nextDues(activities, n);
  const dues = next.filter(d => d.dday <= 6);
  return { days, dues, farther: next.length - dues.length };
}

/** 이번 주 마감 키워드: '이번 주 마감 2'. 없으면 없다고 말한다. */
export const weekHeadline = (w: Week) => (w.dues.length ? `이번 주 마감 ${w.dues.length}` : '이번 주 마감 없음');

/** 회고 쓸 활동 수(끝났는데 기록으로 옮기지 않은 활동) */
export const retroCount = (activities: Activity[]) => pendingRetros(activities).length;

export type MiniBar = { id: string; label: string; left: number; width: number; state: GanttRow['state']; tone: FieldGroup | undefined };
export type MiniGantt = { bars: MiniBar[]; today: number };

const span = () => dayIndex(SEMESTER.end) - dayIndex(SEMESTER.start);
const frac = (iso: string) => Math.min(1, Math.max(0, (dayIndex(iso) - dayIndex(SEMESTER.start)) / span()));

/** 일정 카드의 축소 간트: 진행 중 → 준비·대기 → 끝 순으로 n줄. left·width·today 는 학기 전체 길이에 대한 0~1 비율이다. */
export function miniGantt(activities: Activity[], today: string = PROTOTYPE_TODAY, n = 3): MiniGantt {
  const order = { active: 0, prep: 1, done: 2 } as const;
  const rows = timelineOf(activities, today).rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => order[a.r.state] - order[b.r.state] || a.i - b.i)
    .slice(0, n)
    .map(x => x.r);
  const bars = rows.map(r => {
    const left = frac(r.start);
    return { id: r.id, label: r.label, left, width: Math.max(0.02, frac(r.end) - left), state: r.state, tone: r.tone as FieldGroup | undefined };
  });
  return { bars, today: frac(today) };
}

/** 일정 카드 키워드: '진행 중 2 · 신청 준비·대기 3' (0은 뺀다) */
export function scheduleKeyword(activities: Activity[]): string {
  const count = (f: (a: Activity) => boolean) => activities.filter(f).length;
  const parts = [
    [count(a => a.status === 'ongoing'), '진행 중'],
    [count(a => a.status === 'preparing' || a.status === 'applied'), '신청 준비·대기']
  ].filter(([n]) => n).map(([n, l]) => `${l} ${n}`);
  return parts.length ? parts.join(' · ') : '지금 하는 활동 없음';
}

export type RecordGrid = { semesters: { id: string; label: string }[]; rows: { group: FieldGroup; label: string; counts: number[] }[]; total: number };
const GROUP_ORDER: FieldGroup[] = ['ai', 'dev', 'plan', 'mentor', 'global', 'other'];

/** 기록 카드의 학기(열) × 분야(행) 점 격자. 기록이 없는 학기도 열로 둔다(쉬어 간 학기). */
export function recordGrid(records: RecordItem[]): RecordGrid {
  const axis = semesterAxis(records, SEMESTER_NOW, SEMESTER_NOW);
  const used = new Set(records.map(r => FIELD_GROUP[r.field]));
  const rows = GROUP_ORDER.filter(g => used.has(g)).map(group => ({
    group, label: GROUP_LABEL[group], counts: axis.map(s => records.filter(r => r.semester === s && FIELD_GROUP[r.field] === group).length)
  }));
  return { semesters: axis.map(s => ({ id: s, label: semesterShort(s) })), rows, total: records.length };
}

/** 기록 카드 키워드: '2026-2학기 3개' */
export function recordKeyword(records: RecordItem[], term: string): string {
  if (records.length === 0) return '회고를 쓰면 쌓여요';
  return `${semesterLabel(term)} ${records.filter(r => r.semester === term).length}개`;
}
