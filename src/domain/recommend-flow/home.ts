import type { Activity, Axis, DiscState, Discovery, FieldGroup, RecordItem } from '../types';
import { AXES, FIELD_GROUP } from '../vocab';

// 홈 숫자와 그래프에 쓰는 계산. 전역 상태에서 바로 뽑는다.

export type HomeCounts = { semesterActivities: number; reviewWaiting: number; newRecommend: number; toConfirm: number };

/** 이번 학기 활동 = 하는 중 + 끝난 것(회고 대기·기록됨). 신청 준비·결과 대기·떨어진 신청은 세지 않는다. */
export function homeCounts(activities: Activity[], newRecommend: number, discoveries: Discovery[], stateOf: (d: Discovery) => DiscState): HomeCounts {
  return {
    semesterActivities: activities.filter(a => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded').length,
    reviewWaiting: activities.filter(a => a.status === 'ended').length,
    newRecommend,
    toConfirm: discoveries.filter(d => stateOf(d) === 'none' || stateOf(d) === 'changed').length
  };
}

export type Dot = { recordId: string; state: 'confirmed' | 'estimated' };
export type AxisRow = { axis: Axis; label: string; dots: Dot[] };

/**
 * 역량 근거 점 행: 기록 하나가 점 하나. 학교가 확인했거나 학생이 맞다고 한 발견의 근거면 채운 점, 아니면 AI 추정(점선).
 * 점수로 바꾸지 않는다. 근거가 없으면 dots 가 비어 있다.
 */
export function evidenceRows(records: RecordItem[], discoveries: Discovery[], stateOf: (d: Discovery) => DiscState): AxisRow[] {
  const confirmedIds = new Set(discoveries.filter(d => stateOf(d) === 'yes').flatMap(d => d.evidence.map(r => r.id)));
  return AXES.map(a => ({
    axis: a.id,
    label: a.label,
    dots: records
      .filter(r => r.axes.includes(a.id))
      .map(r => ({ recordId: r.id, state: r.verification === 'school' || confirmedIds.has(r.id) ? ('confirmed' as const) : ('estimated' as const) }))
  }));
}

export type FlowRow = { semester: string; label: string; total: number; groups: { group: FieldGroup; count: number }[] };

const semesterOrder = (s: string) => {
  const [y, t] = s.split('-');
  return Number(y) * 10 + (t === '1' ? 1 : t === '여름' ? 2 : t === '2' ? 3 : t === '겨울' ? 4 : 5);
};
/** '2026-1' → '26-1', '2026-여름' → '26 여름' */
export const semesterLabel = (s: string) => {
  const [y, t] = s.split('-');
  return /^\d$/.test(t) ? `${y.slice(2)}-${t}` : `${y.slice(2)} ${t}`;
};

/** 학기별 분야 묶음 비율(관심 흐름). 활동 횟수일 뿐 점수가 아니다. */
export function interestFlow(records: RecordItem[]): FlowRow[] {
  const bySem = new Map<string, Map<FieldGroup, number>>();
  for (const r of records) {
    const m = bySem.get(r.semester) ?? new Map<FieldGroup, number>();
    const g = FIELD_GROUP[r.field];
    m.set(g, (m.get(g) ?? 0) + 1);
    bySem.set(r.semester, m);
  }
  return [...bySem.entries()]
    .sort(([a], [b]) => semesterOrder(a) - semesterOrder(b))
    .map(([semester, m]) => ({
      semester,
      label: semesterLabel(semester),
      total: [...m.values()].reduce((s, n) => s + n, 0),
      groups: [...m.entries()].map(([group, count]) => ({ group, count }))
    }));
}

/** 발견 질문. 진술 끝에 물음표만 붙인다. */
export const discoveryQuestion = (d: Discovery) => `${d.statement}?`;

/** '오늘' 칩에 쓸 활동: 마감이 오늘인 준비 중 활동 하나 */
export const dueToday = (activities: Activity[]) => activities.find(a => a.status === 'preparing' && a.due?.dday === 0);
