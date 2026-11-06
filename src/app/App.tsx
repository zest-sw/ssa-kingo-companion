import { useEffect, useLayoutEffect, useRef, type ComponentType } from 'react';
import { setPageScrollTop, ToastProvider } from '../components';
import Activities from '../screens/activities';
import Analysis from '../screens/analysis';
import Home from '../screens/home';
import Profile from '../screens/profile';
import Recommend from '../screens/recommend';
import Settings from '../screens/settings';
import { AppStateProvider } from './AppState';
import { useChallengeToasts } from './challenges';
import { EntityProvider } from './entity';
import KitScreen from './kit/KitScreen';
import { canonicalPath, navigate, screenLabel, useRoute, type RouteName, type ScreenProps } from './router';
import { useScrollingMark } from './scrolling';
import { Sidebar } from './Sidebar';
import './app.css';

const SCREEN: Record<RouteName, ComponentType<ScreenProps>> = {
  home: Home, recommend: Recommend, activities: Activities, analysis: Analysis, profile: Profile, settings: Settings, _kit: KitScreen
};

/** 전환 표시를 떼는 시간. 움직임(--dur-fast)보다 넉넉히 */
const ENTER_CLEAR_MS = 400;

function Shell() {
  const route = useRoute();
  const first = useRef(true);
  useChallengeToasts();
  useScrollingMark();
  // 화면 하나 = 메뉴 + 하위 경로 첫 토막('activities/records'). 그 아래 id 가 바뀌어도 같은 화면이 아니면 새로 그린다.
  const page = route.sub ? `${route.name}/${route.sub.split('/')[0]}` : route.name;

  // 옮긴 경로(#/records/archive)나 모르는 하위 경로(#/settings/notify)로 들어오면 주소를 화면이 그리는 자리로 바꿔 둔다.
  useEffect(() => {
    const fixed = canonicalPath(location.hash);
    if (fixed) navigate(fixed, { replace: true });
  });

  // 화면이 바뀌면 맨 위로, 제목으로 포커스.
  useEffect(() => {
    const label = screenLabel(route) ?? (route.name === 'settings' ? '설정' : '컴포넌트 목록');
    document.title = `${label} · 킹고 컴패니언`;
    if (first.current) { first.current = false; return; }
    setPageScrollTop(0);
    document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true });
  }, [page]);

  // 화면이 바뀌면(사이드바·구역 탭) 본문만 옅게 나타난다(app.css). 같은 화면 안 주소 상태(?tab·칩·모달)는 page 가 그대로라 전환하지 않는다.
  // 그리기 전에 표시를 달아야 새 본문이 첫 그림부터 움직임을 탄다.
  const main = useRef<HTMLElement>(null);
  const entered = useRef(false);
  useLayoutEffect(() => {
    if (!entered.current) { entered.current = true; return; }
    const el = main.current;
    if (!el) return;
    el.setAttribute('data-entering', '');
    const t = window.setTimeout(() => el.removeAttribute('data-entering'), ENTER_CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [page]);

  const Screen = SCREEN[route.name];
  return (
    <div className="app">
      <button type="button" className="app-skip" onClick={() => document.querySelector<HTMLElement>('[data-page-title]')?.focus()}>본문으로 건너뛰기</button>
      <Sidebar route={route} />
      <main ref={main} className="app-main" data-scroll-root>
        <Screen key={page} sub={route.sub} />
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
