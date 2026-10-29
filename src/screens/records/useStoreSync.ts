import { useEffect, useRef } from 'react';
import { useApp } from '../../app/AppState';
import { INITIAL_STATE } from '../../app/state';
import { clearStores, pruneStores } from './stores';

/** 토스트의 되돌리기(8초)가 끝난 뒤에 치운다. 그 전에 되돌리면 역량 근거 확인도 함께 살아난다. */
const AFTER_UNDO_MS = 9000;

/**
 * 화면 전용 저장(초안, 역량 근거 확인)을 전역 상태와 맞춘다.
 * - 열 때, 그리고 기록·활동이 바뀐 지 9초 뒤에 없어진 것을 치운다.
 * - 이 화면이 열려 있는 동안 앱이 처음으로 돌아가면 모두 비운다.
 * ponytail: 다른 화면에서 처음으로 돌렸거나 상태가 그대로일 때(초안만 있을 때)는 알 수 없어 초안이 남는다. 전역 reset 신호가 생기면 고친다.
 */
export function useStoreSync() {
  const { state } = useApp();
  const latest = useRef(state);
  const prev = useRef(state);
  latest.current = state;

  const prune = () => pruneStores(latest.current.records.map(r => r.id), latest.current.activities.filter(a => a.status === 'ended').map(a => a.id));

  useEffect(() => { prune(); }, []);
  useEffect(() => {
    if (state !== prev.current && state === INITIAL_STATE) clearStores();
    prev.current = state;
  }, [state]);
  useEffect(() => {
    const t = window.setTimeout(prune, AFTER_UNDO_MS);
    return () => window.clearTimeout(t);
  }, [state.records, state.activities]);
}
