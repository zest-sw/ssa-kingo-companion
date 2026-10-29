import { useSyncExternalStore } from 'react';
import type { IconName } from '../components';

/** 사이드바 메뉴 순서 그대로 */
export const SCREENS = ['home', 'recommend', 'activities', 'records', 'analysis', 'challenges', 'friends'] as const;
export type ScreenName = (typeof SCREENS)[number];
/** 'settings' 는 사이드바 아래 톱니바퀴로 연다. '_kit' 은 컴포넌트 목록(개발용)이고 사이드바에 없다. */
export type RouteName = ScreenName | 'settings' | '_kit';
const OTHER_ROUTES: readonly string[] = ['settings', '_kit'];

/** 자리를 옮긴 경로. 예전 링크와 북마크가 새 자리로 열린다. */
const MOVED: Record<string, string> = { 'friends/visibility': 'settings/visibility' };

/** 옮긴 경로면 새 경로('settings/visibility'), 아니면 undefined */
export function movedPath(hash: string): string | undefined {
  const path = hash.replace(/^#?\/?/, '').replace(/\/+$/, '');
  const from = Object.keys(MOVED).find(k => path === k || path.startsWith(k + '/'));
  return from && MOVED[from] + path.slice(from.length);
}

export const NAV: { id: ScreenName; label: string; icon: IconName }[] = [
  { id: 'home', label: '홈', icon: 'home' },
  { id: 'recommend', label: '추천', icon: 'compass' },
  { id: 'activities', label: '내 활동', icon: 'board' },
  { id: 'records', label: '기록', icon: 'records' },
  { id: 'analysis', label: '나의 분석', icon: 'analysis' },
  { id: 'challenges', label: '도전 과제', icon: 'trophy' },
  { id: 'friends', label: '친구', icon: 'friends' }
];

/** 화면 컴포넌트가 받는 값. sub 는 '#/analysis/techtree' 의 'techtree'(없으면 undefined). */
export type ScreenProps = { sub?: string };
export type Route = { name: RouteName; sub?: string };

/** '#/analysis/techtree/x' → { name: 'analysis', sub: 'techtree/x' }. 모르는 경로는 홈, 옮긴 경로는 새 자리. */
export function parseHash(hash: string): Route {
  const [head, ...rest] = (movedPath(hash) ?? hash.replace(/^#\/?/, '')).split('/');
  const name = (SCREENS as readonly string[]).includes(head) || OTHER_ROUTES.includes(head) ? (head as RouteName) : 'home';
  const sub = name === head && rest.length ? rest.filter(Boolean).join('/') || undefined : undefined;
  return { name, sub };
}

/** 화면 이동. navigate('analysis/techtree') 또는 navigate('#/analysis/techtree'). replace 면 뒤로 가기 기록을 남기지 않는다. */
export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = '#/' + path.replace(/^#?\/?/, '');
  if (opts.replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== hash) {
    location.hash = hash;
  }
}

/** 화면 안에서 링크로 쓸 href */
export const hrefOf = (path: string) => '#/' + path.replace(/^#?\/?/, '');

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}
