import { useMemo, useSyncExternalStore } from 'react';
import { useApp } from '../../app/AppState';
import { PROGRAMS } from '../../data/catalog';
import { SEMESTER_FROM, SEMESTER_NOW } from '../../data/analysis';
import { semesterAxis } from '../../domain/analysis/semester';
import { withAnswers } from '../../domain/analysis/strengths';
import { buildStory, type Story } from '../../domain/insight/story';
import type { RecordItem } from '../../domain/types';

// 정체성 문장의 답(학생이 고른 문장). 홈과 분석 요약이 같은 답을 본다.
// ponytail: 앱 상태(state.ts) 밖, 이 브라우저의 localStorage 에만 둔다. 공용 상태에 'story/answer' 액션이 생기면 옮긴다.
// 답은 문장 그대로 저장해서, 기록이 바뀌어 후보 문장이 달라지면 buildStory 가 저절로 '확인 전'으로 돌린다.
const KEY = 'kingo-companion:story-answer';
const listeners = new Set<() => void>();
const read = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };
let current = read();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };

export function setStoryAnswer(text: string | null) {
  current = text;
  try { if (text) localStorage.setItem(KEY, text); else localStorage.removeItem(KEY); } catch { /* 저장소를 못 쓰면 이번 화면에서만 */ }
  listeners.forEach(fn => fn());
}

/** 이야기 하나. records 를 주면 그 기록(분석을 마친 것)으로, 없으면 지금 기록으로 만든다. 근거 답은 늘 지금 것을 덧입힌다. */
export function useStory(records?: RecordItem[]): Story {
  const { state, view } = useApp();
  const answer = useSyncExternalStore(subscribe, () => current, () => null);
  const base = records ?? state.records;
  return useMemo(() => {
    const live = withAnswers(base, state.records);
    return buildStory({
      records: live, profile: state.profile, activities: state.activities, edgeAnswers: state.edgeAnswers, scored: view.scored,
      week: state.week, programs: PROGRAMS, semesters: semesterAxis(live, SEMESTER_FROM, SEMESTER_NOW), answer
    });
  }, [base, state.records, state.profile, state.activities, state.edgeAnswers, view.scored, state.week, answer]);
}
