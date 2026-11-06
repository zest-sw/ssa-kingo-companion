import type { Axis, Energy, RecordCard, RecordVisibility } from '../types';
import { QUESTIONS, type FlowStep, type QuestionKey } from './questions';
import type { Step } from './schema';

// 회고 인터뷰 초안. 답할 때마다 저장해서, 나갔다 들어오면 보던 질문에서 이어 간다. 활동 id 로 묶는다.

export type InterviewState = {
  card: RecordCard;
  /** 보던 질문의 칸, 미리보기면 'review' */
  step: Step;
  /** 옛 대화형 인터뷰가 쓰던 칸. 모양을 지키려고 빈 배열로 둔다 */
  followedUp: Step[];
};

export type Message = { id: number; from: 'agent' | 'me'; text: string };
// ponytail: messages·confirmed 는 옛 대화형 인터뷰(v2.2)의 칸이라 이제 비워 둔다. 공용 상태(src/app)의 초안 타입을 바꿀 때 함께 뺀다.
export type InterviewDraft = { messages: Message[]; interview: InterviewState; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean; confirmed: Axis[] };

export type FlowDraft = { card: RecordCard; step: FlowStep; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean };

export const toggleAxis = (axes: Axis[], axis: Axis): Axis[] => (axes.includes(axis) ? axes.filter(a => a !== axis) : [...axes, axis]);

export function toDraft(f: FlowDraft): InterviewDraft {
  const step: Step = f.step === 'preview' ? 'review' : QUESTIONS[f.step].key;
  return { messages: [], interview: { card: f.card, step, followedUp: [] }, energy: f.energy, visibility: f.visibility, useForRecommend: f.useForRecommend, confirmed: [] };
}

/**
 * 초안 → 이어 갈 자리. 보던 질문이 넷 중 하나면 그 질문, 미리보기였으면 미리보기.
 * 옛 대화형 초안이 결과·다음 계획 칸에 멈춰 있었으면 첫 빈 질문, 다 찼으면 미리보기로 간다.
 */
export function fromDraft(d: InterviewDraft): FlowDraft {
  const { card, step } = d.interview;
  const at = QUESTIONS.findIndex(q => q.key === step);
  const firstEmpty = QUESTIONS.findIndex(q => !card[q.key as QuestionKey]?.trim());
  const flow: FlowStep = step === 'review' ? 'preview' : at >= 0 ? at : firstEmpty >= 0 ? firstEmpty : 'preview';
  return { card, step: flow, energy: d.energy, visibility: d.visibility, useForRecommend: d.useForRecommend };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** 저장소에서 읽은 초안 묶음. 모양이 맞는 초안만 남긴다. */
export function parseDrafts(raw: unknown): Record<string, InterviewDraft> {
  if (!isObj(raw)) return {};
  const out: Record<string, InterviewDraft> = {};
  for (const [id, d] of Object.entries(raw)) {
    if (isObj(d) && Array.isArray(d.messages) && isObj(d.interview) && isObj(d.interview.card) && Array.isArray(d.confirmed)) out[id] = d as InterviewDraft;
  }
  return out;
}
