import { useEffect, useRef, type ComponentType } from 'react';
import { ToastProvider } from '../components';
import Activities from '../screens/activities';
import Analysis from '../screens/analysis';
import Challenges from '../screens/challenges';
import Friends from '../screens/friends';
import Home from '../screens/home';
import Recommend from '../screens/recommend';
import Records from '../screens/records';
import Settings from '../screens/settings';
import { AppStateProvider } from './AppState';
import { useChallengeToasts } from './challenges';
import KitScreen from './kit/KitScreen';
import { movedPath, navigate, NAV, useRoute, type RouteName, type ScreenProps } from './router';
import { Sidebar } from './Sidebar';
import './app.css';

const SCREEN: Record<RouteName, ComponentType<ScreenProps>> = {
  home: Home, recommend: Recommend, activities: Activities, records: Records, analysis: Analysis, challenges: Challenges, friends: Friends, settings: Settings, _kit: KitScreen
};

function Shell() {
  const route = useRoute();
  const first = useRef(true);
  useChallengeToasts();

  // 옮긴 경로(#/friends/visibility)로 들어오면 주소도 새 자리로 바꿔 둔다. 화면은 parseHash 가 이미 새 자리로 그린다.
  useEffect(() => {
    const moved = movedPath(location.hash);
    if (moved) navigate(moved, { replace: true });
  });

  // 화면이 바뀌면 맨 위로, 제목으로 포커스. 같은 화면 안 하위 경로(탭) 이동은 화면이 직접 다룬다.
  useEffect(() => {
    const label = NAV.find(n => n.id === route.name)?.label ?? (route.name === 'settings' ? '설정' : '컴포넌트 목록');
    document.title = `${label} · 킹고 컴패니언`;
    if (first.current) { first.current = false; return; }
    window.scrollTo({ top: 0 });
    document.querySelector<HTMLElement>('[data-page-title]')?.focus({ preventScroll: true });
  }, [route.name]);

  const Screen = SCREEN[route.name];
  return (
    <div className="app">
      <button type="button" className="app-skip" onClick={() => document.querySelector<HTMLElement>('[data-page-title]')?.focus()}>본문으로 건너뛰기</button>
      <Sidebar current={route.name} />
      <main className="app-main">
        <Screen key={route.name} sub={route.sub} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <Shell />
      </AppStateProvider>
    </ToastProvider>
  );
}
