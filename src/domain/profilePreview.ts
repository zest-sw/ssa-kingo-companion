import { isSensitive, publicActivities, publicRecords } from './social';
import type { Activity, RecordItem, Visibility } from './types';

// 프로필 첫 화면의 '친구에게 보이는 내 프로필' 미리보기.
// 공개 범위 규칙(social)을 그대로 써서 남에게 실제로 보일 것만 고른다. 발견·역량 근거·AI 추정은 여기 들어오지 않는다.

export type PreviewRecord = Pick<RecordItem, 'id' | 'title' | 'field'>;

export type PreviewCard = {
  /** 친구에게 보이는 한 활동 수 */
  activityCount: number;
  /** 친구에게 보이는 회고(경험 카드) 제목. limit 장까지 */
  records: PreviewRecord[];
  /** limit 를 넘어 안 그린 공개 회고 수 */
  moreRecords: number;
  /** 숨긴 것 한 줄씩. 숫자가 0인 줄은 넣지 않는다 */
  hidden: string[];
};

export type ProfilePreview = {
  open: boolean;
  /** 지금 공개 상태 한 줄 */
  status: string;
  /** 공개했을 때 친구에게 보일 카드. 비공개면 '공개하면 이렇게 보여요' 윤곽에 쓴다 */
  card: PreviewCard;
};

const done = (a: Activity) => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded';

export function profilePreview(activities: Activity[], records: RecordItem[], v: Visibility, limit = 3): ProfilePreview {
  const as = { ...v, profilePublic: true };
  const shown = publicActivities(activities, as);
  const shared = publicRecords(records, as);
  const hiddenActs = activities.filter(a => done(a) && !isSensitive(a)).length - shown.length;
  const sensitive = activities.filter(a => done(a) && isSensitive(a)).length;
  const hiddenRecs = records.length - shared.length;
  const hidden = [
    hiddenActs > 0 && `뺀 활동 ${hiddenActs}개`,
    sensitive > 0 && `민감한 활동 ${sensitive}개`,
    hiddenRecs > 0 && `고르지 않은 회고 ${hiddenRecs}개`,
    '발견과 역량 근거'
  ].filter((x): x is string => typeof x === 'string');
  return {
    open: v.profilePublic,
    status: v.profilePublic ? '친구에게만 보여요' : '나만 봐요',
    card: {
      activityCount: shown.length,
      records: shared.slice(0, limit).map(({ id, title, field }) => ({ id, title, field })),
      moreRecords: Math.max(0, shared.length - limit),
      hidden
    }
  };
}

/**
 * 함께하기 행마다 숫자 하나. 새 요청이 있으면 그게 먼저다.
 * 숫자가 없으면 할 일을 짧게 말한다.
 */
export const friendsCount = (friends: number, requests: number) =>
  requests > 0 ? `요청 ${requests}` : friends > 0 ? `친구 ${friends}` : '친구 찾기';

export function recruitCount(posts: { mine: boolean }[]): string {
  const mine = posts.filter(p => p.mine).length;
  return mine > 0 ? `내 글 ${mine}` : posts.length > 0 ? `모집 글 ${posts.length}` : '첫 글 쓰기';
}

export const hallCount = (people: number) => (people > 0 ? `${people}명` : '아직 없어요');
