import { useSyncExternalStore } from 'react';
import type { InterviewState } from '../../domain/interview/engine';
import type { Axis, Energy, RecordVisibility } from '../../domain/types';

// 전역 상태(src/app)에 둘 자리가 없는 화면 전용 값. 새로고침하면 사라진다(저장소 없음, 프로토타입 기본).
// ponytail: 초안·역량 근거 확인은 화면 안 메모리에만 둔다. 공용 타입에 자리가 생기면 전역 상태로 옮긴다.

function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) { value = next; subs.forEach(f => f()); },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
  };
}

export type Message = { id: number; from: 'agent' | 'me'; text: string };
export type Draft = { messages: Message[]; interview: InterviewState; energy?: Energy; visibility: RecordVisibility; useForRecommend: boolean; confirmed: Axis[] };

const drafts = createStore<Record<string, Draft>>({});
export const getDraft = (activityId: string): Draft | undefined => drafts.get()[activityId];
export const saveDraft = (activityId: string, d: Draft) => drafts.set({ ...drafts.get(), [activityId]: d });
export const clearDraft = (activityId: string) => {
  const { [activityId]: _gone, ...rest } = drafts.get();
  drafts.set(rest);
};
export const useDraftIds = () => Object.keys(useSyncExternalStore(drafts.subscribe, drafts.get));

/** 기록별로 학생이 '맞아요'를 눌러 확인한 역량 근거. 누르기 전에는 AI 추정(점선)이다 */
const evidence = createStore<Record<string, Axis[]>>({});
export const useConfirmedAxes = (recordId: string): Axis[] => useSyncExternalStore(evidence.subscribe, evidence.get)[recordId] ?? [];
export const setConfirmedAxes = (recordId: string, axes: Axis[]) => evidence.set({ ...evidence.get(), [recordId]: axes });
export const toggleAxis = (axes: Axis[], axis: Axis): Axis[] => (axes.includes(axis) ? axes.filter(a => a !== axis) : [...axes, axis]);
