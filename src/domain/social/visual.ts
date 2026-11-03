import type { FieldGroup, Field } from '../types';
import { FIELD_GROUP } from '../vocab';
import type { RecruitPost } from './index';
import type { FeedKind } from './summary';

// 프로필 요약의 소셜 카드 그림이 그릴 모양과 키워드. 순위·점수는 만들지 않는다.

/** 친구 카드 키워드: '친구 2 · 요청 1' */
export const friendsKeyword = (friends: number, requests: number) =>
  friends === 0 && requests === 0 ? '친구를 찾아 보세요' : `친구 ${friends}${requests ? ` · 요청 ${requests}` : ''}`;

export type RecruitBar = { kind: string; count: number };

/** 모집 글을 기회 종류(대회·해커톤·공모전)별로 센 막대. 글이 없는 종류도 0으로 둔다(어디에 글이 몰렸는지 보이게). */
export function recruitBars(posts: RecruitPost[], kindOf: (opportunityId: string) => string | undefined, kinds: readonly string[] = ['대회', '해커톤', '공모전']): RecruitBar[] {
  return kinds.map(kind => ({ kind, count: posts.filter(p => kindOf(p.opportunityId) === kind).length }));
}

/** 팀원 모집 카드 키워드: '모집 글 3' 또는 '내 글 1 · 전체 3' */
export function recruitKeyword(posts: RecruitPost[]): string {
  if (posts.length === 0) return '첫 모집 글을 올려 보세요';
  const mine = posts.filter(p => p.mine).length;
  return mine ? `내 글 ${mine} · 전체 ${posts.length}` : `모집 글 ${posts.length}`;
}

export type HallRoute = { who: string; steps: FieldGroup[] };

/** 명예의 전당 경로 그림: 내가 가장 많이 한 분야와 같은 길을 먼저, 없으면 첫 길. 단계마다 분야 묶음 하나(점선으로 잇는다). */
export function hallRoute(entries: { name: string; group: FieldGroup; path: { field: Field }[] }[], mine?: FieldGroup): HallRoute | undefined {
  const e = entries.find(x => x.group === mine) ?? entries[0];
  return e ? { who: e.name, steps: e.path.map(p => FIELD_GROUP[p.field]) } : undefined;
}

/** 전당 카드 키워드: '걸어온 길 3' */
export const hallKeyword = (entries: unknown[]) => (entries.length ? `걸어온 길 ${entries.length}` : '아직 올라온 길이 없어요');

/** 친구 소식의 짧은 라벨(15자 안팎). 문장 대신 과제·활동 이름과 한 단어 */
export function feedTag(kind: FeedKind, subject?: string): string {
  if (kind === 'achieved') return `${subject ?? ''} 달성`;
  if (kind === 'hidden') return '숨은 과제 발견';
  if (kind === 'applied') return `${subject ?? ''} 신청`;
  return `${subject ?? ''} 회고 공개`;
}
