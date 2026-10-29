import { ddayOf } from '../recommend';
import type { Activity, ActivityStatus, CandidateChoice, Funnel, Interest, PrepItem, Program } from '../types';

export type { PrepItem } from '../types';

// 추천 화면의 흐름: 어느 단계인지, 신청 준비 체크리스트가 어떻게 바뀌는지. 순수 함수만 둔다.

export type RecommendView = { view: 'top'; programId?: string } | { view: 'compare' } | { view: 'prepare'; programId: string };

/** '#/recommend/prepare/p-chatbot' 의 sub('prepare/p-chatbot')를 단계로. 'p-chatbot' 만 있으면 그 후보를 연 가장 추천 보기. */
export function parseRecommendSub(sub?: string): RecommendView {
  const [head, id] = (sub ?? '').split('/');
  if (head === 'compare') return { view: 'compare' };
  if (head === 'prepare' && id) return { view: 'prepare', programId: id };
  if (head && head !== 'prepare') return { view: 'top', programId: head };
  return { view: 'top' };
}

export const prepareHref = (programId: string) => `recommend/prepare/${programId}`;
export const candidateHref = (programId: string) => `recommend/${programId}`;

/** 마감이 이 날 안이면 '임박'으로 보여 준다(주황). */
export const NEAR_DEADLINE_DAYS = 3;
export const isNearDeadline = (dday: number) => dday <= NEAR_DEADLINE_DAYS;

/** 가입 인터뷰·조건 서랍이 함께 쓰는 관심 분야 규칙: 최대 3개, '아직 모르겠어요'는 다른 것과 같이 못 고른다. */
export const MAX_INTERESTS = 3;
export function toggleInterest(interests: Interest[], id: Interest): Interest[] {
  if (id === 'unknown') return interests.includes('unknown') ? [] : ['unknown'];
  const base = interests.filter(x => x !== 'unknown');
  if (base.includes(id)) return base.filter(x => x !== id);
  return base.length >= MAX_INTERESTS ? base : [...base, id];
}

// ponytail: 팀 활동 여부를 이름으로 짐작한다. 기회 데이터에 팀 구성 필드가 생기면 그걸 쓴다.
const TEAM_WORDS = ['해커톤', '아이디어톤', '공모전', '경진대회', '프로젝트', '피칭'];
export const needsTeam = (p: Program) => TEAM_WORDS.some(w => p.title.includes(w));

// ponytail: 시간표 연동이 없어 준비·신청 중인 활동과 일정이 같은지만 본다. 신청해도 일정 문자열은 그대로 둔다. 시간표 데이터가 생기면 바꾼다.
export const overlapsSchedule = (p: Program, activities: Activity[]) =>
  activities.some(a => a.programId !== p.id && (a.status === 'preparing' || a.status === 'applied') && a.schedule === p.when);

export type Checks = { eligible: boolean; overlap: boolean; team: boolean };
/** 후보 카드·비교표가 함께 쓰는 확인 결과 */
export const checksOf = (p: Program, activities: Activity[]): Checks => ({ eligible: p.eligible, overlap: overlapsSchedule(p, activities), team: needsTeam(p) });

/** 신청 준비를 시작할 때의 체크리스트. 에이전트가 한 것은 끝난 채로 시작한다. now 는 시작한 시각('21:38'). */
export function prepItemsFor(p: Program, week: number, now: string): PrepItem[] {
  const due = Math.max(0, ddayOf(p, week));
  const items: PrepItem[] = [
    { id: 'target', label: '신청 대상 확인', by: 'agent', done: true, at: now },
    { id: 'calendar', label: '일정 캘린더 등록', by: 'agent', done: true, at: now }
  ];
  if (needsTeam(p)) items.push({ id: 'team', label: '팀 구성', by: 'me', done: false, dday: Math.max(0, due - 1), link: { label: '팀원 모집 글 올리기', path: 'friends/recruit' } });
  items.push({ id: 'draft', label: '신청서 초안 확인', by: 'me', done: false, dday: Math.max(0, due - 1), hint: '에이전트가 써 뒀어요' });
  if (p.level >= 2) items.push({ id: 'survey', label: '사전 설문 답하기', by: 'me', done: false, dday: due, hint: '로그인이 필요해서 직접 해야 해요' });
  return items;
}

/** 내가 할 항목만 눌러서 바꾼다. 에이전트가 한 건 그대로 둔다. 끝낸 시각을 남긴다. */
export const toggleItem = (items: PrepItem[], id: string, now: string): PrepItem[] =>
  items.map(i => (i.id === id && i.by === 'me' ? { ...i, done: !i.done, at: i.done ? undefined : now } : i));

export const remainingItems = (items: PrepItem[]) => items.filter(i => !i.done);
export const prepProgress = (items: PrepItem[]) => ({ done: items.filter(i => i.done).length, total: items.length });

/** 남은 것 중 마감이 가장 빠른 것. */
export const mostUrgent = (items: PrepItem[]): PrepItem | undefined =>
  [...remainingItems(items)].sort((a, b) => (a.dday ?? 99) - (b.dday ?? 99))[0];

/**
 * '이대로 신청'을 못 누르는 이유 한 줄. 누를 수 있으면 undefined.
 * status 는 이 기회의 활동 상태다. 주소로 바로 열어도 '신청 준비'를 거친 활동이 아니면 신청이 나가지 않는다.
 */
export function submitBlockReason(items: PrepItem[], draftReady: boolean, status: ActivityStatus | undefined): string | undefined {
  if (status === undefined) return '먼저 ‘신청 준비’를 눌러 활동으로 만들어 주세요';
  if (status !== 'preparing') return '이미 신청했어요';
  if (!draftReady) return '신청서 초안을 쓰는 중이에요';
  const left = remainingItems(items).length;
  return left > 0 ? `남은 준비 ${left}개를 끝내면 누를 수 있어요` : undefined;
}

/** 신청하면 활동이 어떻게 바뀌나. 일정 문자열은 그대로 둬서 겹침 판정이 계속 원래 기간을 쓴다. */
export function submitPatch(p: Program, items: PrepItem[]): { status: 'applied'; patch: Partial<Omit<Activity, 'id'>> } {
  return { status: 'applied', patch: { prep: prepProgress(items), due: undefined, schedule: p.when } };
}

// ponytail: 오늘을 10월 13일(1주차 첫날)로 고정한 예시다. 실제 날짜를 쓰게 되면 지운다.
const BASE = { month: 10, day: 13 };
/** 남은 날을 '10월 15일'로. dday 는 week 주차의 오늘 기준이다. */
export function dateLabel(dday: number, week = 1): string {
  const d = new Date(2026, BASE.month - 1, BASE.day + dday + 7 * (week - 1));
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 시각 표시 '21:40' */
export const clockLabel = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 나중에 보기에서 고르는 날 */
export const LATER_CHOICES = [{ days: 1, label: '내일' }, { days: 3, label: '3일 뒤' }, { days: 7, label: '다음 주' }] as const;

/** 1주차 첫날부터 센 날 번호. 나중에 보기의 '다시 볼 날'을 이 값으로 저장한다. */
export const laterUntilDay = (week: number, days: number) => 7 * (week - 1) + days;
export const laterDateLabel = (untilDay: number) => dateLabel(untilDay, 1);

/**
 * 나중에 보기로 미룬 것 중 고른 날이 된 것은 다시 후보로 돌려보낸다. 날짜를 안 골랐으면 계속 숨긴다.
 * 오늘이 고른 날이면 다시 보인다.
 */
export function effectiveChoices(choices: Record<string, CandidateChoice>, untilDays: Readonly<Record<string, number>>, week: number): Record<string, CandidateChoice> {
  const today = 7 * (week - 1);
  const out: Record<string, CandidateChoice> = {};
  for (const [id, c] of Object.entries(choices)) {
    const until = untilDays[id];
    if (c === 'later' && until !== undefined && until <= today) continue;
    out[id] = c;
  }
  return out;
}

/** '고른 방법' 서랍의 단계별 개수 */
export function funnelSteps(f: Funnel): { label: string; count: number }[] {
  return [
    { label: '이번 주 모집 중', count: f.pool },
    { label: '마감 안 지남', count: f.open },
    { label: '신청 대상', count: f.eligible },
    { label: '내 시간·방식에 맞음', count: f.fit },
    { label: '아직 고르지 않음', count: f.fresh }
  ];
}

/** 맞는 후보가 없을 때 왜 그런지 한 줄. 거르기 단계 중 처음 0이 되는 곳을 짚는다. */
export function emptyReason(f: Funnel): string {
  if (f.pool === 0) return '이번 주에 모집 중인 활동이 없어요.';
  if (f.open === 0 || f.eligible === 0) return '신청할 수 있는 활동이 없어요.';
  if (f.fit === 0) return '내 시간·방식에 맞는 활동이 없어요. 시간이나 방식을 바꾸면 더 보여요.';
  return '맞는 활동을 모두 골랐어요. 나중에 보기에 둔 활동을 다시 볼 수 있어요.';
}

/** 예시 데이터 문구의 ' (예시)' 꼬리표를 화면에 내지 않는다. 예시 안내는 프로토타입 정보 한 곳에서만 한다. */
export const plainText = (s: string) => s.replace(/\s*\(예시\)/g, '').trim();

/** 방식 칸: 온라인이면 장소를 또 적지 않는다. */
export const formatText = (p: Program): { main: string; sub?: string } =>
  p.format === 'online' ? { main: '온라인' } : { main: '직접 만나서', sub: plainText(p.place) };
