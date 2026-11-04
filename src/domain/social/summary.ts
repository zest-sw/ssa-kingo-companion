import { josa } from '../text';
import type { Activity, Field, FieldGroup, RecordItem } from '../types';
import { FIELD_GROUP, GROUP_LABEL } from '../vocab';
import type { RecruitPost } from './index';

// 프로필 요약과 친구·모집·전당 화면 머리의 핵심 한 줄. 숫자만 늘어놓지 않고 학생 상태에서 계산한다.

export const friendsLine = (friends: number, requests: number) =>
  friends === 0 && requests === 0 ? '아직 친구가 없어요. 비슷한 친구에게 신청해 보세요' : `친구 ${friends}명${requests ? `, 요청 ${requests}개` : ''}`;

/** 관심 표시한 기회: 직접 표시했거나, 신청을 준비하는 추천 후보와 같은 기회 */
export function interestedIds(opps: { id: string; programId?: string }[], activities: Pick<Activity, 'programId'>[], marked: string[]): string[] {
  const preparing = new Set(activities.map(a => a.programId));
  return [...marked, ...opps.filter(o => o.programId && preparing.has(o.programId)).map(o => o.id)];
}

export function recruitLine(posts: RecruitPost[], interested: string[]): string {
  const mine = posts.filter(p => p.mine).length;
  const match = posts.filter(p => !p.mine && interested.includes(p.opportunityId)).length;
  if (posts.length === 0) return '모집 글이 아직 없어요. 팀원이 필요하면 첫 글을 올려 보세요';
  const tail = mine ? `, 내 글 ${mine}개` : match ? `, 관심 있는 기회에 ${match}개` : '';
  return `모집 글 ${posts.length}개${tail}`;
}

/** 내 기록에서 가장 많이 한 분야 묶음. 기록이 없으면 undefined */
export function myTopGroup(records: Pick<RecordItem, 'field'>[]): FieldGroup | undefined {
  const count = new Map<FieldGroup, number>();
  for (const r of records) count.set(FIELD_GROUP[r.field], (count.get(FIELD_GROUP[r.field]) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function hallLine(entries: { group: FieldGroup }[], mine?: FieldGroup): string {
  const near = mine ? entries.filter(e => e.group === mine).length : 0;
  if (entries.length === 0) return '아직 올라온 길이 없어요';
  if (!mine) return `걸어온 길 ${entries.length}개`;
  const label = GROUP_LABEL[mine];
  return near ? `걸어온 길 ${entries.length}개, ${label}${josa(label, '은', '는')} ${near}개` : `걸어온 길 ${entries.length}개, ${label} 길은 아직 없어요`;
}

/**
 * 비슷한 학생 줄의 이유. 예시 이유 '같은 활동 2개'는 내 활동이 없으면 사실이 아니라서, 그 학생이 한 분야로 바꿔 말한다.
 * ponytail: 같은 활동 수는 예시 값이다. 친구 연동이 생기면 내 활동과 실제로 겹친 수를 센다.
 */
export function peerNote(note: string, field: Field, myActivities: number): string {
  if (myActivities > 0 || !note.startsWith('같은 활동')) return note;
  const label = GROUP_LABEL[FIELD_GROUP[field]];
  return `${label} 활동을 해 봤어요`;
}
