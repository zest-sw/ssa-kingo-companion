import type { CandidateView } from './candidates';
import type { Profile, Reason } from './types';

/** 가입 인터뷰: 관심 분야 → 시간·방식 → 목표. 셋째 질문(목표)은 비워도 끝낼 수 있다. */
export const ONB_STEPS = ['interest', 'plan', 'goal'] as const;
export type OnbStep = (typeof ONB_STEPS)[number];

/** 이 단계에서 다음으로 갈 수 있나. 관심 분야만 하나 이상 골라야 하고('아직 모르겠어요'도 하나), 나머지는 기본값이 있다. */
export const canAdvance = (step: number, draft: Profile) => (step === 0 ? draft.interests.length > 0 : true);

/** 단계 넘김 방향. 다음은 왼쪽으로(새 질문이 오른쪽에서 들어온다), 이전은 오른쪽으로. */
export const stepDirection = (from: number, to: number): 'next' | 'back' => (to > from ? 'next' : 'back');

export type OnbResult = {
  /** 이번 주 추천 수(가장 추천 + 다른 후보) */
  count: number;
  top?: { programId: string; title: string; reason: string };
};

const REASON_FIRST: Reason['kind'][] = ['interest', 'career'];
/**
 * 기록이 없는 학생에게 이 기회를 고른 이유 한 줄. 방금 답한 것과 이어지는 이유를 먼저 고른다(관심 분야 → 목표 → 첫 이유).
 * 가입 끝 장면과 홈 '다음 한 걸음'(story.next)이 같은 기회에 같은 문장을 쓰도록 여기 하나만 둔다.
 */
export function firstReason(reasons: Reason[]): string {
  const r = REASON_FIRST.map(k => reasons.find(x => x.kind === k)).find(Boolean) ?? reasons[0];
  // 한 줄 이유는 마침표 없이 끝낸다(홈·추천의 다른 이유와 같은 모양)
  return (r?.text ?? '지금 신청할 수 있고 내 시간에 맞아요').replace(/\.$/, '');
}

/**
 * 가입을 마친 직후 보여 줄 한 장면. 홈·추천과 같은 후보 계산(view)에서 바로 꺼낸다(기다림 없음).
 * 이유는 firstReason 한 줄: 막 답한 학생에게 내 답이 쓰였다는 게 보이게.
 */
export function onboardingResult(view: Pick<CandidateView, 'primary' | 'newCount'>): OnbResult {
  const p = view.primary;
  if (!p) return { count: 0 };
  return { count: view.newCount, top: { programId: p.p.id, title: p.p.title, reason: firstReason(p.reasons) } };
}
