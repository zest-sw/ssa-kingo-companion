import { useEffect, useRef, type ComponentType } from 'react';
import { ToastProvider } from '../components';
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
import { movedPath, navigate, navMatch, useRoute, type RouteName, type ScreenProps } from './router';
import { Sidebar } from './Sidebar';
import './app.css';

const SCREEN: Record<RouteName, ComponentType<ScreenProps>> = {
  home: Home, recommend: Recommend, activities: Activities, analysis: Analysis, profile: Profile, settings: Settings, _kit: KitScreen
};

function Shell() {
  const route = useRoute();
  const first = useRef(true);
  useChallengeToasts();
  // 화면 하나 = 메뉴 + 하위 경로 첫 토막('activities/records'). 그 아래 id 가 바뀌어도 같은 화면이 아니면 새로 그린다.
  const page = route.sub ? `${route.name}/${route.sub.split('/')[0]}` : route.name;

  // 옮긴 경로(#/records/archive)로 들어오면 주소도 새 자리로 바꿔 둔다. 화면은 parseHash 가 이미 새 자리로 그린다.
  useEffect(() => {
    const moved = movedPath(location.hash);
    if (moved) navigate(moved, { replace: true });
  });

  // 화면이 바뀌면 맨 위로, 제목으로 포커스.
  useEffect(() => {
    const at = navMatch(route);
    const label = (at.child ?? at.item)?.label ?? (route.name === 'settings' ? '설정' : '컴포넌트 목록');
    document.title = `${label} · 킹고 컴패니언`;
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true });
  }, [page]);

  const Screen = SCREEN[route.name];
  return (
    <div className="app">
      <button type="button" className="app-skip" onClick={() => document.querySelector<HTMLElement>('[data-page-title]')?.focus()}>본문으로 건너뛰기</button>
      <Sidebar route={route} />
      <main className="app-main">
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
