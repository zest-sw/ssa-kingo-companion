import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { useToast } from '../components';
import { buildCandidates, type CandidateView } from '../domain/candidates';
import { discState } from '../domain/discoveries';
import type { DiscState, Discovery } from '../domain/types';
import { CATALOG } from '../data/catalog';
import { reducer, type Action, type AppState } from './state';
import { clearSaved, loadState, saveState } from './storage';

type RunOptions = {
  /** 끝난 뒤 띄울 토스트 문장 */
  toast?: string;
  /** true 면 토스트에 '되돌리기'를 단다(관심 없음, 나중에 보기, 기록 삭제 등) */
  undoable?: boolean;
};

export type AppContextValue = {
  state: AppState;
  /** 추천 후보·발견처럼 상태에서 계산한 값 */
  view: CandidateView;
  discStateOf: (d: Discovery) => DiscState;
  /** 상태를 바꾸는 유일한 길. 토스트와 되돌리기를 함께 건다. */
  run: (action: Action, opts?: RunOptions) => void;
  /** 예시 상태와 저장한 프로필을 모두 처음으로 */
  resetAll: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const toast = useToast();
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => { saveState(state); }, [state.profile, state.onboarded, state.visibility]);

  const run = useCallback((action: Action, opts: RunOptions = {}) => {
    const before = latest.current;
    dispatch(action);
    if (opts.toast) toast(opts.toast, opts.undoable ? { onUndo: () => dispatch({ type: 'restore', state: before }) } : undefined);
  }, [toast]);

  const resetAll = useCallback(() => { clearSaved(); dispatch({ type: 'reset' }); }, []);

  const view = useMemo(() => buildCandidates({
    catalog: CATALOG, week: state.week, profile: state.profile, records: state.records, confirm: state.confirm, settings: state.settings,
    choices: state.choices, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier, last: state.lastDone
  }), [state.week, state.profile, state.records, state.confirm, state.settings, state.choices, state.dislikedFields, state.preferEasier, state.lastDone]);

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
