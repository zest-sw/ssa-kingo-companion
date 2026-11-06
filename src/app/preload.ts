import { useEffect } from 'react';
import { PRELOAD_ORDER, preloadScreen } from './lazyScreens';
import { parseHash } from './router';

/** requestIdleCallback 이 없는 브라우저(사파리)는 그림을 그린 뒤 잠깐 쉬고 받는다 */
const IDLE_FALLBACK_MS = 200;

function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, IDLE_FALLBACK_MS);
  return () => window.clearTimeout(id);
}

/** 앱 안 링크(#/…)가 가리키는 화면 */
function routeOfLink(target: EventTarget | null) {
  const a = target instanceof Element ? target.closest<HTMLAnchorElement>('a[href*="#/"]') : null;
  if (!a) return undefined;
  const href = a.getAttribute('href') ?? '';
  return parseHash(href.slice(href.indexOf('#'))).name;
}

/**
 * 다른 화면 덩어리를 미리 받아 둔다. 처음 갈 때 기다림이 안 보이게.
 * 1) 첫 화면을 그린 뒤 브라우저가 한가할 때 한꺼번에. 2) 링크에 마우스를 올리거나 초점이 가면 그 화면을 먼저.
 */
export function usePreloadScreens() {
  useEffect(() => {
    // 한 번에 다 요청한다. 하나씩 받으면 느린 망(Fast 3G 왕복 0.5초)에서 왕복이 쌓여 뒤 화면이 1초 넘게 늦었다(docs/qa/perf-2026-11-06.md).
    // 다 합쳐 gzip 90kB 남짓이고, 받은 모듈은 그 화면을 열 때까지 그리지 않으니 지금 화면의 입력을 밀지 않는다.
    const cancel = whenIdle(() => { for (const name of PRELOAD_ORDER) void preloadScreen(name); });

    const onIntent = (e: Event) => {
      const name = routeOfLink(e.target);
      if (name) void preloadScreen(name);
    };
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent);
    return () => {
      cancel();
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
    };
  }, []);
}
