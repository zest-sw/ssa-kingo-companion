import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { useToast } from '../components';
import { buildCandidates, type CandidateView } from '../domain/candidates';
import { discState } from '../domain/discoveries';
import { effectiveChoices } from '../domain/recommend-flow/flow';
import type { DiscState, Discovery } from '../domain/types';
import { CATALOG } from '../data/catalog';
import { applyWithUndo, reducer, type Action, type AppState } from './state';
import { clearSaved, loadState, saveState } from './storage';

type RunOptions = {
  /** 끝난 뒤 띄울 토스트 문장 */
  toast?: string;
  /** true 면 토스트에 '되돌리기'를 단다(관심 없음, 나중에 보기, 기록 삭제 등) */
  undoable?: boolean;
};

export type AppContextValue = {
  state: AppState;
  /** 추천 후보·발견처럼 상태에서 계산한 값. 나중에 보기로 고른 날이 된 후보는 다시 들어 있다 */
  view: CandidateView;
  discStateOf: (d: Discovery) => DiscState;
  /** 상태를 바꾸는 유일한 길. 여러 액션을 배열로 넘기면 되돌리기가 한 번에 되돌린다. */
  run: (action: Action | Action[], opts?: RunOptions) => void;
  /** 예시 상태와 저장한 프로필을 모두 처음으로 */
  resetAll: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const toast = useToast();
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => { saveState(state); }, [
    state.profile, state.onboarded, state.visibility, state.settings, state.notify, state.choices, state.laterUntil, state.dislikedFields, state.preferEasier,
    state.activities, state.drafts, state.edgeAnswers, state.selfLevels
  ]);

  const run = useCallback((action: Action | Action[], opts: RunOptions = {}) => {
    const list = Array.isArray(action) ? action : [action];
    const { after, undo } = applyWithUndo(latest.current, list);
    // 같은 이벤트 안에서 run 을 또 불러도 방금 바뀐 상태를 기준으로 삼는다.
    latest.current = after;
    list.forEach(dispatch);
    if (opts.toast) toast(opts.toast, opts.undoable ? { onUndo: () => dispatch(undo) } : undefined);
  }, [toast]);

  const resetAll = useCallback(() => { clearSaved(); dispatch({ type: 'reset' }); }, []);

  const choices = useMemo(() => effectiveChoices(state.choices, state.laterUntil, state.week), [state.choices, state.laterUntil, state.week]);
  const view = useMemo(() => buildCandidates({
    catalog: CATALOG, week: state.week, profile: state.profile, records: state.records, confirm: state.confirm, settings: state.settings,
    choices, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier, last: state.lastDone
  }), [state.week, state.profile, state.records, state.confirm, state.settings, choices, state.dislikedFields, state.preferEasier, state.lastDone]);

  const discStateOf = useCallback((d: Discovery) => discState(d, state.confirm), [state.confirm]);

  const value = useMemo(() => ({ state, view, discStateOf, run, resetAll }), [state, view, discStateOf, run, resetAll]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 화면은 이 훅으로만 전역 상태를 읽고 쓴다. */
export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp 은 AppStateProvider 안에서만 쓴다');
  return v;
}
