import type { Axis, Energy, RecordVisibility } from '../types';
import type { InterviewState } from './engine';

// 회고 인터뷰를 '나중에 이어 하기'로 멈췄을 때 남기는 초안. 활동 id 로 묶는다.

export type Message = { id: number; from: 'agent' | 'me'; text: string };
export type InterviewDraft = { messages: Message[]; interview: InterviewState; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean; confirmed: Axis[] };

export const toggleAxis = (axes: Axis[], axis: Axis): Axis[] => (axes.includes(axis) ? axes.filter(a => a !== axis) : [...axes, axis]);

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
