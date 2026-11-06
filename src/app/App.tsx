import { Suspense, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { setPageScrollTop, ToastProvider } from '../components';
import { AppStateProvider } from './AppState';
import { useChallengeToasts } from './challenges';
import { EntityProvider } from './entity';
import { SCREEN } from './lazyScreens';
import { usePreloadScreens } from './preload';
import { canonicalPath, navigate, screenLabel, useRoute } from './router';
import { ScreenFallback } from './ScreenFallback';
import { useScrollingMark } from './scrolling';
import { Sidebar } from './Sidebar';
import './app.css';

/** 전환 표시를 떼는 시간. 움직임(--dur-fast)보다 넉넉히 */
const ENTER_CLEAR_MS = 400;

/**
 * 새 화면이 실제로 붙은 뒤(덩어리를 받는 중이면 받고 나서) 할 일: 맨 위로, 제목으로 포커스, 본문 옅게 나타나기.
 * Suspense 안 화면 옆에 둬서 화면과 같은 때 붙는다. 첫 화면은 건너뛴다.
 */
function ScreenEntered({ main, first }: { main: RefObject<HTMLElement | null>; first: RefObject<boolean> }) {
  // 그리기 전에 표시를 달아야 새 본문이 첫 그림부터 움직임을 탄다.
  useLayoutEffect(() => {
    if (first.current) return;
    const el = main.current;
    if (!el) return;
    el.setAttribute('data-entering', '');
    const t = window.setTimeout(() => el.removeAttribute('data-entering'), ENTER_CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [main, first]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setPageScrollTop(0);
    document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true });
  }, [first]);
  return null;
}

function Shell() {
  const route = useRoute();
  const first = useRef(true);
  const main = useRef<HTMLElement>(null);
  useChallengeToasts();
  useScrollingMark();
  usePreloadScreens();
  // 화면 하나 = 메뉴 + 하위 경로 첫 토막('activities/records'). 그 아래 id 가 바뀌어도 같은 화면이 아니면 새로 그린다.
  const page = route.sub ? `${route.name}/${route.sub.split('/')[0]}` : route.name;

  // 옮긴 경로(#/records/archive)나 모르는 하위 경로(#/settings/notify)로 들어오면 주소를 화면이 그리는 자리로 바꿔 둔다.
  useEffect(() => {
    const fixed = canonicalPath(location.hash);
    if (fixed) navigate(fixed, { replace: true });
  });

  useEffect(() => {
    const label = screenLabel(route) ?? (route.name === 'settings' ? '설정' : '컴포넌트 목록');
    document.title = `${label} · 킹고 컴패니언`;
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // 화면이 바뀌면(사이드바·구역 탭) 본문만 옅게 나타난다(app.css). 같은 화면 안 주소 상태(?tab·칩·모달)는 page 가 그대로라 전환하지 않는다.
  const Screen = SCREEN[route.name];
  return (
    <div className="app">
      <button type="button" className="app-skip" onClick={() => document.querySelector<HTMLElement>('[data-page-title]')?.focus()}>본문으로 건너뛰기</button>
      <Sidebar route={route} />
      <main ref={main} className="app-main" data-scroll-root>
        <Suspense key={page} fallback={<ScreenFallback route={route} />}>
          <Screen sub={route.sub} />
          <ScreenEntered main={main} first={first} />
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <EntityProvider>
          <Shell />
        </EntityProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
