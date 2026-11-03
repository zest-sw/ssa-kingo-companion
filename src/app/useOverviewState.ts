import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createOverviewStore, restoreSel, shouldRestoreScroll } from './overview';
import { previousRoute } from './router';

const store = createOverviewStore(typeof sessionStorage === 'undefined' ? undefined : sessionStorage);

/**
 * 요약·목록 화면이 쓰는 선택 상태. 화면 경로('activities/records')마다 따로 기억하고, 그 아래 흐름 화면에서 돌아오면(빵부스러기·브라우저 뒤로 가기) 선택과 스크롤이 그대로다.
 * 그 화면 컴포넌트에서만 부른다. 선택이 필요 없으면 initial 에 null 을 넘겨 스크롤만 쓴다.
 *
 *   const [sel, setSel] = useOverviewState('activities', { focus: undefined as string | undefined });
 *
 * isValid 를 주면 저장한 값이 그 모양일 때만 되살린다(없으면 typeof 만 본다).
 */
export function useOverviewState<T>(menu: string, initial: T, isValid?: (v: unknown) => v is T) {
  const [sel, setSelState] = useState<T>(() => restoreSel(store.get(menu), initial, isValid));

  const setSel = useCallback((next: T | ((prev: T) => T)) => {
    setSelState(prev => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      store.setSel(menu, value);
      return value;
    });
  }, [menu]);

  // 이 화면 아래 경로에서 돌아왔을 때만 스크롤을 되살린다. 그림이 그려진 뒤에 옮기려고 한 프레임 미룬다.
  useLayoutEffect(() => {
    if (!shouldRestoreScroll(menu, previousRoute())) return;
    const y = store.get(menu).scrollY;
    if (!y) return;
    const id = requestAnimationFrame(() => window.scrollTo({ top: y }));
    return () => cancelAnimationFrame(id);
  }, [menu]);

  // 이 화면이 떠 있는 동안 스크롤을 따라 적는다. 떠날 때 적으면 다음 화면이 이미 그려져 위치가 바뀐 뒤일 수 있다.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => store.setScroll(menu, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); };
  }, [menu]);

  return [sel, setSel] as const;
}
