import type { RecordCard } from '../types';

// 경험 카드의 칸. 회고 인터뷰(questions.ts)는 이 가운데 네 칸을 묻고, 나머지(결과·다음 계획)는 기록 서랍에서 채운다.

export type CardStep = keyof RecordCard;
/** 초안에 남기는 위치: 카드 칸 하나 또는 미리보기('review') */
export type Step = CardStep | 'review';

/** 칸 순서. 기준 문서 '기록 카드(안)'의 STAR + 배운 점·다음에 해 볼 것 */
export const CARD_STEPS: readonly CardStep[] = ['situation', 'role', 'action', 'result', 'learned', 'next'];

export const STEP_LABEL: Record<CardStep, string> = {
  situation: '상황', role: '역할', action: '한 일', result: '결과', learned: '배운 점', next: '다음 계획'
};
