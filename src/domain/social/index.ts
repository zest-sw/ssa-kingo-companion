import type { Activity, RecordItem, Visibility } from '../types';

/** 소셜 기능(친구 찾기, 팀원 모집, 명예의 전당)은 프로필을 공개한 학생만 쓴다. */
export const canUseSocial = (v: Visibility) => v.profilePublic;

// ponytail: 민감한 활동을 이름 키워드로 거른다. 활동에 민감 표시가 생기면 그 값을 쓴다.
const SENSITIVE = /종교|선교|교회|성당|불교|정치|정당/;
export const isSensitive = (a: Pick<Activity, 'title'>) => SENSITIVE.test(a.title);

/** 친구에게 보이는 한 활동 목록. 하기로 한 것(신청 준비·결과 대기)과 떨어진 것은 뺀다. 민감한 활동은 기본으로 빠진다. */
export function publicActivities(activities: Activity[], v: Visibility): Activity[] {
  if (!v.profilePublic) return [];
  return activities.filter(a => (a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded') && !isSensitive(a) && !v.hiddenActivityIds.includes(a.id));
}

/** 고른 회고만. 공개 범위 설정에서 고른 id 가 기록에 남아 있는 것만 보인다. */
export function publicRecords(records: RecordItem[], v: Visibility): RecordItem[] {
  if (!v.profilePublic) return [];
  return records.filter(r => v.sharedRecordIds.includes(r.id));
}

export const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

export type RecruitPost = {
  id: string;
  opportunityId: string;
  author: string;
  /** 모집 인원(본인 제외) */
  slots: number;
  note: string;
  mine: boolean;
};

/** 같은 기회에 관심을 표시한 학생에게 먼저 보인다. 그 안에서는 올린 순서를 지킨다. */
export function orderPosts(posts: RecruitPost[], interestedOpportunityIds: string[]): RecruitPost[] {
  const first = (p: RecruitPost) => (interestedOpportunityIds.includes(p.opportunityId) ? 0 : 1);
  return posts.map((p, i) => ({ p, i })).sort((a, b) => first(a.p) - first(b.p) || a.i - b.i).map(x => x.p);
}

export type NewPostInput = { opportunityId: string; slots: number; note: string };
export const SLOT_RANGE = { min: 1, max: 5 } as const;
export const NOTE_MAX = 60;

/** 모집 글 입력 검사. 문제가 있으면 학생에게 보일 해요체 문장을 돌려준다. */
export function validatePost(input: NewPostInput): string | null {
  if (!input.opportunityId) return '모집할 기회를 먼저 골라 주세요.';
  if (!Number.isInteger(input.slots) || input.slots < SLOT_RANGE.min || input.slots > SLOT_RANGE.max) return `모집 인원은 ${SLOT_RANGE.min}~${SLOT_RANGE.max}명이에요.`;
  if (input.note.trim().length === 0) return '어떤 팀원이 좋은지 한 줄 적어 주세요.';
  if (input.note.trim().length > NOTE_MAX) return `한 줄은 ${NOTE_MAX}자까지 쓸 수 있어요.`;
  return null;
}
