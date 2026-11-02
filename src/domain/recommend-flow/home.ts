import type { Activity, DiscState, Discovery } from '../types';

// 홈 숫자와 그래프에 쓰는 계산. 전역 상태에서 바로 뽑는다.

export type HomeCounts = { semesterActivities: number; reviewWaiting: number; newRecommend: number; toConfirm: number };

/** 이번 학기 활동 = 하는 중 + 끝난 것(회고 대기·기록됨). 신청 준비·결과 대기·떨어진 신청은 세지 않는다. */
export function homeCounts(activities: Activity[], newRecommend: number, discoveries: Discovery[], stateOf: (d: Discovery) => DiscState): HomeCounts {
  return {
    semesterActivities: activities.filter(a => a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded').length,
    reviewWaiting: activities.filter(a => a.status === 'ended').length,
    newRecommend,
    toConfirm: discoveries.filter(d => needsConfirm(stateOf(d))).length
  };
}

/** 아직 확인 전이거나 근거가 바뀌어 다시 확인할 발견 */
const needsConfirm = (s: DiscState) => s === 'none' || s === 'changed';
