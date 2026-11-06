import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { TOAST_ACTION_MS, TOAST_MS, useToast } from '../components';
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
  /** 결과 토스트가 떠 있으면 그 뒤에 띄운다(도전 과제 달성처럼 행동 결과에 딸려 오는 알림). 결과를 먼저 말한다 */
  toastAfter: (message: string) => void;
  /** 예시 상태와 저장한 프로필을 모두 처음으로 */
  resetAll: () => void;
};

/** 앞 토스트가 닫히고 다음 토스트가 뜨기까지 쉬는 틈. 같은 순간에 뜨면 닫히는 쪽이 새 것을 지운다 */
const NEXT_TOAST_GAP_MS = 400;

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const toast = useToast();
  const latest = useRef(state);
  latest.current = state;
  // 결과 토스트가 사라질 때까지 뒤 알림을 기다리게 한다. 토스트는 한 자리뿐이라 새 것이 옛 것을 덮는다.
  // ponytail: 화면이 useToast 로 직접 띄운 토스트와 마우스를 올려 멈춘 시간은 모른다. 토스트에 줄 세우기가 생기면 그쪽으로 옮긴다.
  const busyUntil = useRef(0);
  const queue = useRef<string[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const schedule = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!queue.current.length) return;
    timer.current = window.setTimeout(() => {
      const next = queue.current.shift();
      if (next) { toast(next); busyUntil.current = Date.now() + TOAST_MS; }
      schedule();
    }, Math.max(0, busyUntil.current + NEXT_TOAST_GAP_MS - Date.now()));
  }, [toast]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const toastAfter = useCallback((message: string) => { queue.current.push(message); schedule(); }, [schedule]);

  useEffect(() => { saveState(state); }, [
    state.demo, state.records, state.profile, state.onboarded, state.visibility, state.settings, state.notify, state.choices, state.laterUntil, state.dislikedFields, state.preferEasier,
    state.activities, state.drafts, state.edgeAnswers
  ]);

  const run = useCallback((action: Action | Action[], opts: RunOptions = {}) => {
    const list = Array.isArray(action) ? action : [action];
    const { after, undo } = applyWithUndo(latest.current, list);
    // 같은 이벤트 안에서 run 을 또 불러도 방금 바뀐 상태를 기준으로 삼는다.
    latest.current = after;
    list.forEach(dispatch);
    if (opts.toast) {
      toast(opts.toast, opts.undoable ? { onUndo: () => dispatch(undo) } : undefined);
      busyUntil.current = Date.now() + (opts.undoable ? TOAST_ACTION_MS : TOAST_MS);
      schedule();
    }
  }, [toast, schedule]);

  const resetAll = useCallback(() => { clearSaved(); dispatch({ type: 'reset' }); }, []);

  const choices = useMemo(() => effectiveChoices(state.choices, state.laterUntil, state.week), [state.choices, state.laterUntil, state.week]);
  const view = useMemo(() => buildCandidates({
    catalog: CATALOG, week: state.week, profile: state.profile, records: state.records, confirm: state.confirm, settings: state.settings,
    choices, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier, last: state.lastDone
  }), [state.week, state.profile, state.records, state.confirm, state.settings, choices, state.dislikedFields, state.preferEasier, state.lastDone]);

  const discStateOf = useCallback((d: Discovery) => discState(d, state.confirm), [state.confirm]);

  const value = useMemo(() => ({ state, view, discStateOf, run, toastAfter, resetAll }), [state, view, discStateOf, run, toastAfter, resetAll]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** 화면은 이 훅으로만 전역 상태를 읽고 쓴다. */
export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp 은 AppStateProvider 안에서만 쓴다');
  return v;
}
