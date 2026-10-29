import type { RecordCard } from '../types';
import { CARD_STEPS, FOLLOW_UP, MIN_LENGTH, QUESTION, REVIEW_PROMPT, STEP_ORDER, type CardStep, type Step } from './schema';

export type InterviewState = {
  card: RecordCard;
  /** 지금 묻고 있는 단계. 다 채우면 'review' */
  step: Step;
  /** 이미 한 번 더 물은 단계. 같은 단계에서 두 번 되묻지 않는다 */
  followedUp: CardStep[];
};

/** 에이전트가 다음에 할 말. 한 번에 여러 말풍선이 나올 수 있다. */
export type Turn = { state: InterviewState; replies: string[] };

export const isCardStep = (s: Step): s is CardStep => s !== 'review';
const squash = (t: string) => t.replace(/\s+/g, '');

export const isShort = (step: CardStep, text: string) => squash(text).length < MIN_LENGTH[step];

/** 비어 있는 첫 단계. 다 찼으면 'review' */
export function firstMissing(card: RecordCard): Step {
  return CARD_STEPS.find(s => !card[s]?.trim()) ?? 'review';
}

const ask = (step: Step, title: string) => (isCardStep(step) ? QUESTION[step](title) : REVIEW_PROMPT);

/**
 * 인터뷰 시작. 상황은 에이전트가 활동 정보로 먼저 채우고, 빠진 것만 묻는다.
 * situation 이 없으면 상황부터 묻는다.
 */
export function startInterview(title: string, situation?: string): Turn {
  const card: RecordCard = situation?.trim() ? { situation: situation.trim() } : {};
  const state: InterviewState = { card, step: firstMissing(card), followedUp: [] };
  const hello = `${title} 회고를 시작할게요.`;
  const filled = card.situation ? '상황은 활동 정보로 적어 뒀어요. 틀리면 오른쪽 카드에서 고쳐 주세요.' : '';
  return { state, replies: [hello, ...(filled ? [filled] : []), ask(state.step, title)] };
}

/**
 * 학생의 답 하나를 반영한다.
 * - 직접 입력한 답이 짧으면 같은 단계에서 한 번만 더 묻고, 이어서 받은 말은 앞 답에 덧붙인다.
 * - 빠른 답 칩은 짧아도 되묻지 않는다.
 * - 카드에는 학생이 말한 글자만 넣는다(수치를 만들어 넣지 않는다).
 */
export function answer(state: InterviewState, title: string, text: string, via: 'typed' | 'chip' = 'typed'): Turn {
  const step = state.step;
  const t = text.trim();
  if (!isCardStep(step) || !t) return { state, replies: [] };

  const prev = state.card[step]?.trim();
  const card: RecordCard = { ...state.card, [step]: prev ? `${prev} ${t}` : t };

  if (via === 'typed' && isShort(step, t) && !state.followedUp.includes(step)) {
    return { state: { ...state, card, followedUp: [...state.followedUp, step] }, replies: [FOLLOW_UP[step]] };
  }
  const next = firstMissing(card);
  return { state: { ...state, card, step: next }, replies: [ask(next, title)] };
}

/** 카드의 한 칸을 학생이 직접 고친다(지나간 건 체크). 비우면 그 칸이 빈다. */
export function editField(state: InterviewState, step: CardStep, text: string): InterviewState {
  const card = { ...state.card };
  if (text.trim()) card[step] = text.trim(); else delete card[step];
  return { ...state, card };
}

export type StepStatus = 'done' | 'current' | 'todo';

/** 위쪽 단계 칩의 모양. 'review' 에 닿으면 앞 단계는 모두 done, review 가 current. */
export function stepStatuses(state: InterviewState): Record<Step, StepStatus> {
  const at = STEP_ORDER.indexOf(state.step);
  return Object.fromEntries(STEP_ORDER.map((s, i) => [s, i < at ? 'done' : i === at ? 'current' : 'todo'])) as Record<Step, StepStatus>;
}
