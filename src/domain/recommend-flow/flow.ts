import { ddayOf } from '../recommend';
import type { Activity, Funnel, Program } from '../types';

// 추천 화면의 흐름: 어느 단계인지, 신청 준비 체크리스트가 어떻게 바뀌는지. 순수 함수만 둔다.

export type RecommendView = { view: 'top' } | { view: 'compare' } | { view: 'prepare'; programId: string };

/** '#/recommend/prepare/p-chatbot' 의 sub('prepare/p-chatbot')를 단계로. 모르는 값은 가장 추천 보기. */
export function parseRecommendSub(sub?: string): RecommendView {
  const [head, id] = (sub ?? '').split('/');
  if (head === 'compare') return { view: 'compare' };
  if (head === 'prepare' && id) return { view: 'prepare', programId: id };
  return { view: 'top' };
}

export const prepareHref = (programId: string) => `recommend/prepare/${programId}`;

export type PrepItem = {
  id: string;
  label: string;
  /** 누가 하나. 에이전트가 한 건 처음부터 done 이다 */
  by: 'agent' | 'me';
  done: boolean;
  /** 마감까지 남은 날. 에이전트가 끝낸 건 없다 */
  dday?: number;
  /** 항목 아래 한 줄 안내 */
  hint?: string;
  /** 누르면 가는 곳 */
  link?: { label: string; path: string };
};

// ponytail: 팀 활동 여부를 이름으로 짐작한다. 기회 데이터에 팀 구성 필드가 생기면 그걸 쓴다.
const TEAM_WORDS = ['해커톤', '아이디어톤', '공모전', '경진대회', '프로젝트', '피칭'];
export const needsTeam = (p: Program) => TEAM_WORDS.some(w => p.title.includes(w));

// ponytail: 시간표 연동이 없어 준비·신청 중인 활동과 일정이 같은지만 본다. 시간표 데이터가 생기면 바꾼다.
export const overlapsSchedule = (p: Program, activities: Activity[]) =>
  activities.some(a => a.programId !== p.id && (a.status === 'preparing' || a.status === 'applied') && a.schedule === p.when);

/** 신청 준비를 시작할 때의 체크리스트. 에이전트가 한 것은 끝난 채로 시작한다. */
export function prepItemsFor(p: Program, week: number): PrepItem[] {
  const due = Math.max(0, ddayOf(p, week));
  const items: PrepItem[] = [
    { id: 'target', label: '신청 대상 확인', by: 'agent', done: true },
    { id: 'calendar', label: '일정 캘린더 등록', by: 'agent', done: true }
  ];
  if (needsTeam(p)) items.push({ id: 'team', label: '팀 구성', by: 'me', done: false, dday: Math.max(0, due - 1), link: { label: '팀원 모집 글 올리기', path: 'friends/recruit' } });
  items.push({ id: 'draft', label: '신청서 초안 확인', by: 'me', done: false, dday: Math.max(0, due - 1), hint: '에이전트가 써 뒀어요' });
  if (p.level >= 2) items.push({ id: 'survey', label: '사전 설문 답하기', by: 'me', done: false, dday: due, hint: '로그인이 필요해서 직접 해야 해요' });
  return items;
}

/** 내가 할 항목만 눌러서 바꾼다. 에이전트가 한 건 그대로 둔다. */
export const toggleItem = (items: PrepItem[], id: string): PrepItem[] =>
  items.map(i => (i.id === id && i.by === 'me' ? { ...i, done: !i.done } : i));

export const remainingItems = (items: PrepItem[]) => items.filter(i => !i.done);
export const prepProgress = (items: PrepItem[]) => ({ done: items.filter(i => i.done).length, total: items.length });

/** 남은 것 중 마감이 가장 빠른 것. */
export const mostUrgent = (items: PrepItem[]): PrepItem | undefined =>
  [...remainingItems(items)].sort((a, b) => (a.dday ?? 99) - (b.dday ?? 99))[0];

/** '이대로 신청'을 못 누르는 이유 한 줄. 누를 수 있으면 undefined. */
export function submitBlockReason(items: PrepItem[], draftReady: boolean): string | undefined {
  if (!draftReady) return '신청서 초안을 쓰는 중이에요';
  const left = remainingItems(items).length;
  return left > 0 ? `남은 준비 ${left}개를 끝내면 누를 수 있어요` : undefined;
}

// ponytail: 오늘을 10월 13일(1주차 첫날)로 고정한 예시다. 실제 날짜를 쓰게 되면 지운다.
const BASE = { month: 10, day: 13 };
/** 남은 날을 '10월 15일'로. */
export function dateLabel(dday: number, week = 1): string {
  const d = new Date(2026, BASE.month - 1, BASE.day + dday + 7 * (week - 1));
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 나중에 보기에서 고르는 날 */
export const LATER_CHOICES = [{ days: 1, label: '내일' }, { days: 3, label: '3일 뒤' }, { days: 7, label: '다음 주' }] as const;

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
