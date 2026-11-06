import type { Axis, Energy, RecordCard, RecordVisibility } from '../types';
import { QUESTIONS, type FlowStep, type QuestionKey } from './questions';
import type { Step } from './schema';

// 회고 인터뷰 초안. 답할 때마다 저장해서, 나갔다 들어오면 보던 질문에서 이어 간다. 활동 id 로 묶는다.

export type InterviewState = {
  card: RecordCard;
  /** 보던 질문의 칸, 미리보기면 'review' */
  step: Step;
};

export type InterviewDraft = { interview: InterviewState; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean };

export type FlowDraft = { card: RecordCard; step: FlowStep; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean };

export const toggleAxis = (axes: Axis[], axis: Axis): Axis[] => (axes.includes(axis) ? axes.filter(a => a !== axis) : [...axes, axis]);

export function toDraft(f: FlowDraft): InterviewDraft {
  const step: Step = f.step === 'preview' ? 'review' : QUESTIONS[f.step].key;
  return { interview: { card: f.card, step }, energy: f.energy, visibility: f.visibility, useForRecommend: f.useForRecommend };
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

/** 저장소에서 읽은 초안 묶음. 모양이 맞는 초안만 남기고, 옛 대화형 초안(v2.2)에 남은 칸은 버린다. */
export function parseDrafts(raw: unknown): Record<string, InterviewDraft> {
  if (!isObj(raw)) return {};
  const out: Record<string, InterviewDraft> = {};
  for (const [id, d] of Object.entries(raw)) {
    if (!isObj(d) || !isObj(d.interview) || !isObj(d.interview.card) || typeof d.interview.step !== 'string') continue;
    const { interview, energy, visibility, useForRecommend } = d as InterviewDraft;
    out[id] = { interview: { card: interview.card, step: interview.step }, energy, visibility, useForRecommend };
  }
  return out;
}
