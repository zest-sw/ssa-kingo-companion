import type { RecordCard } from '../types';
import { josa } from '../text';

// 회고 인터뷰의 대화 스키마. 경량 LLM 이 따를 질문 순서와 끝내는 조건을 스크립트로 정해 둔다(결정 로그 2026-10-12 2차 리뷰).

export type CardStep = keyof RecordCard;
export type Step = CardStep | 'review';

/** 묻는 순서. 기준 문서 '기록 카드(안)'의 STAR + 배운 점·다음에 해 볼 것 */
export const CARD_STEPS: readonly CardStep[] = ['situation', 'role', 'action', 'result', 'learned', 'next'];

/** 위쪽 단계 칩. 마지막 '지나간 건 체크'는 카드 전체를 학생이 훑는 단계다 */
export const STEP_LABEL: Record<Step, string> = {
  situation: '상황', role: '역할', action: '한 일', result: '결과', learned: '배운 점', next: '다음에 해 볼 것', review: '지나간 건 체크'
};
export const STEP_ORDER: readonly Step[] = [...CARD_STEPS, 'review'];

export const QUESTION: Record<CardStep, (title: string) => string> = {
  situation: t => `${t}${josa(t, '은', '는')} 어떤 활동이었어요? 한 줄로 알려 주세요.`,
  role: t => `${t}에서 어떤 역할을 맡았어요?`,
  action: () => '실제로 한 일을 하나만 골라 말해 주세요.',
  result: () => '결과는 어땠어요? 숫자가 있으면 같이 말해 주세요.',
  learned: () => '해 보고 나서 새로 알게 된 점이 있어요?',
  next: () => '다음에 해 보고 싶은 게 있어요?'
};

/** 답이 짧을 때 한 번만 더 묻는다 */
export const FOLLOW_UP: Record<CardStep, string> = {
  situation: '언제, 누구와, 어떤 방식이었는지 조금만 더 알려 주세요.',
  role: '맡은 일을 한 가지만 더 구체적으로 말해 줄래요?',
  action: '그 일을 어떻게 했는지 한 문장만 더 알려 주세요.',
  result: '결과나 반응을 한 가지만 더 말해 주세요. 숫자는 기억나는 것만요.',
  learned: '그게 왜 중요했는지 한 문장만 더 알려 주세요.',
  next: '언제쯤 해 볼지 한마디만 더 알려 주세요.'
};

/** 공백을 뺀 글자 수가 이보다 적으면 짧은 답이다. 역할처럼 원래 짧은 답은 기준을 낮췄다. */
export const MIN_LENGTH: Record<CardStep, number> = { situation: 8, role: 3, action: 10, result: 4, learned: 8, next: 6 };

export const REVIEW_PROMPT = '다 채웠어요. 오른쪽 카드를 확인하고, 고칠 곳은 눌러서 고쳐 주세요. 확인한 뒤에만 저장돼요.';
export const ENERGY_PROMPT = '마지막으로, 끝난 뒤 에너지는 어땠어요?';
