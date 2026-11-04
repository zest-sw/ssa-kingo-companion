import { ddayText } from '../text';
import type { Activity, FieldGroup, Funnel, RecordItem } from '../types';
import { FIELD_GROUP, GROUP_LABEL, GROUP_ORDER } from '../vocab';
import { prepareHref } from './flow';
import { whenOffset } from './upcoming';

// 홈·추천 요약 문장. 학생의 실제 상태에서 계산하고, 화면은 이 결과를 그대로 보여 준다.

export type TodayTarget = { kind: 'activity'; id: string } | { path: string };
/**
 * title = 활동 이름, what = 무슨 일인지 한두 낱말(회고·신청 마감·모임), day = 오늘로부터 며칠 뒤(0 = 오늘), at = 시각('18:00')이 있으면.
 * 미니 타임라인이 day·at 순으로 줄 세우고 title·what 만 보여 준다. text 는 문장형(접근성 이름 등)이다.
 */
export type TodayTask = { id: string; kind: 'review' | 'deadline' | 'today'; text: string; title: string; what: string; day: number; at?: string; badge?: string; urgent?: boolean; target: TodayTarget };

const clock = (s?: string) => /(\d{1,2}:\d{2})/.exec(s ?? '')?.[1];

export const MAX_TODAY_TASKS = 3;
/** 오늘 할 일은 오늘·내일(0~1일) 일이다. 그 뒤는 '곧 있어요' 타임라인이 맡는다(upcoming.ts UPCOMING_FROM). */
const DUE_SOON_DAYS = 1;

/**
 * 오늘·내일 할 일 전부. 순서(급한 순): 마감 임박 준비(빠른 순) → 회고 대기 → 오늘·내일 있는 활동. 화면은 앞의 MAX_TODAY_TASKS 개를 골라 시간순으로 그리고 나머지는 개수로 센다.
 * 회고는 오늘 안 써도 되지만 마감은 지나면 끝이라, 회고가 여럿 쌓여도 마감이 '외 n개'로 밀리지 않게 마감을 앞에 둔다.
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
    .map(a => ({ a, day: whenOffset(a.schedule, week) }))
    .filter((x): x is { a: Activity; day: number } => (x.a.status === 'applied' || x.a.status === 'ongoing') && x.day !== undefined && x.day >= 0 && x.day <= DUE_SOON_DAYS)
    .map(({ a, day }) => ({ id: `today:${a.id}`, kind: 'today', text: `${a.title}, ${a.schedule}`, title: a.title, what: '모임', day, at: clock(a.schedule), badge: day === 0 ? '오늘' : '내일', target: { kind: 'activity', id: a.id } }));
  return [...deadlines, ...reviews, ...today];
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
  return GROUP_ORDER.filter(g => counts.has(g)).map(g => ({ group: g, label: GROUP_LABEL[g], count: counts.get(g)! })).sort((a, b) => b.count - a.count);
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

/**
 * 홈 '에이전트가 해 둔 일' 한 줄. 학생이 묻기 전에 에이전트가 모집글을 읽고 걸러 둔 결과와, 준비 중인 활동에서 대신 해 둔 일(대상 확인·일정 등록)을 센다.
 * 읽은 모집글이 없으면 보여 줄 게 없어 undefined.
 */
export function agentLine(f: Funnel, activities: Activity[]): string | undefined {
  if (f.pool === 0) return undefined;
  const picked = `모집글 ${f.pool}개를 읽고 ${f.fit}개를 골라 뒀어요`;
  const prepped = activities.filter(a => a.status === 'preparing' && a.prepItems?.some(i => i.by === 'agent' && i.done)).length;
  return prepped > 0 ? `${picked} · 신청 준비 ${prepped}개 챙기는 중` : picked;
}

/**
 * 회고를 거친 기록인지. 회고 인터뷰로 쓴 기록은 학생이 답한 칸(역할·한 일·결과·배운 점·다음)이 하나라도 있으면 그렇다.
 * 칸 없이 메모·한마디로만 된 기록(예시 데이터, 옛 직접 입력)은 이미 회고한 것으로 본다. 회고를 건너뛰고 사실만 남긴 기록(skippedRecord)은 아니다.
 */
export function hasRetro(r: RecordItem): boolean {
  if (!r.card) return !!(r.note.trim() || r.quote.trim());
  return (['role', 'action', 'result', 'learned', 'next'] as const).some(k => !!r.card?.[k]?.trim());
}

/**
 * 쌓이는 숫자 한 줄(연속 기록 대신, 줄어들지 않는다): '이번 학기 활동 8개 · 회고 3개'. 활동이 없으면 undefined.
 * 회고는 이번 학기(semester) 기록 가운데 회고를 거친 것을 센다. 활동과 이어지지 않은 직접 기록도 이번 학기 것이면 센다.
 */
export function semesterTally(activities: Activity[], records: RecordItem[], semester: string): string | undefined {
  const n = activities.filter(isSemesterActivity).length;
  if (n === 0) return undefined;
  const retro = records.filter(r => r.semester === semester && hasRetro(r)).length;
  return `이번 학기 활동 ${n}개 · 회고 ${retro}개`;
}
