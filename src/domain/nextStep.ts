import type { Activity } from './types';

/**
 * 기록이 없어서 비어 있는 칸(분석, 발견, 회고 대기)의 다음 행동. 학생이 지금 실제로 할 수 있는 일로 보낸다.
 * 회고할 활동이 없는 새 학생을 빈 회고 화면으로 보내지 않는다.
 * - lead: 빈 상태 문장의 앞부분. 화면이 '… 흐름이 보여요' 처럼 뒤를 잇는다.
 */
export type NextStep = { lead: string; label: string; to: string };

export function nextStep(activities: Activity[]): NextStep {
  if (activities.some(a => a.status === 'ended')) return { lead: '끝난 활동의 회고를 쓰면', label: '회고 쓰러 가기', to: 'activities/records/interview' };
  if (activities.some(a => a.status === 'preparing' || a.status === 'applied' || a.status === 'ongoing')) {
    return { lead: '신청한 활동이 끝나고 회고를 쓰면', label: '일정 보기', to: 'activities/schedule' };
  }
  return { lead: '활동을 고르고 회고를 쓰면', label: '추천에서 활동 고르기', to: 'recommend' };
}
