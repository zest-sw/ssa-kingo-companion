import { useSyncExternalStore } from 'react';
import type { IconName } from '../components';

/** 사이드바 메인 메뉴 순서 그대로(docs/design/ia-navigation.md 1절) */
export const SCREENS = ['home', 'recommend', 'activities', 'analysis', 'profile'] as const;
export type ScreenName = (typeof SCREENS)[number];
/** 'settings' 는 사이드바 아래 톱니바퀴로 연다. '_kit' 은 컴포넌트 목록(개발용)이고 사이드바에 없다. */
export type RouteName = ScreenName | 'settings' | '_kit';
const OTHER_ROUTES: readonly string[] = ['settings', '_kit'];

export type NavChild = { path: string; label: string };
export type NavItem = { id: ScreenName; path: string; label: string; icon: IconName; children?: NavChild[] };

/** 메뉴 트리. 사이드바가 유일한 이동 수단이고, 하위 항목은 지금 보고 있는 부모 아래에만 펼친다. */
export const NAV: NavItem[] = [
  { id: 'home', path: 'home', label: '홈', icon: 'home' },
  { id: 'recommend', path: 'recommend', label: '추천', icon: 'compass' },
  {
    id: 'activities', path: 'activities', label: '내 활동', icon: 'board',
    children: [{ path: 'activities/schedule', label: '일정' }, { path: 'activities/records', label: '기록' }]
  },
  {
    id: 'analysis', path: 'analysis', label: '나의 분석', icon: 'analysis',
    children: [
      { path: 'analysis/techtree', label: '테크 트리' }, { path: 'analysis/map', label: '경험 지도' },
      { path: 'analysis/flow', label: '관심 흐름' }, { path: 'analysis/strengths', label: '나의 강점' }
    ]
  },
  {
    id: 'profile', path: 'profile', label: '프로필', icon: 'user',
    children: [{ path: 'profile/friends', label: '친구' }, { path: 'profile/recruit', label: '팀원 모집' }, { path: 'profile/hall', label: '명예의 전당' }]
  }
];

/**
 * 자리를 옮긴 경로. 예전 링크와 북마크가 새 자리로 열린다. 가장 긴 앞부분이 먼저 맞는다.
 * v1.0: 기록·도전 과제·친구 메뉴가 하위로 들어갔고, 추천 목록·비교는 추천 한 화면에 합쳤다.
 */
const MOVED: Record<string, string> = {
  'friends/visibility': 'settings/visibility',
  'friends/profile': 'profile/friends',
  friends: 'profile',
  'challenges/list': 'profile',
  challenges: 'profile',
  'records/archive': 'activities/records',
  records: 'activities/records',
  'activities/board': 'activities/schedule/board',
  'activities/list': 'activities/schedule/list',
  'recommend/list': 'recommend',
  'recommend/compare': 'recommend'
};
const MOVED_KEYS = Object.keys(MOVED).sort((a, b) => b.length - a.length);

const clean = (hash: string) => hash.replace(/^#?\/?/, '').replace(/\/+$/, '');

/** 옮긴 경로면 새 경로('settings/visibility'), 아니면 undefined */
export function movedPath(hash: string): string | undefined {
  const path = clean(hash);
  const from = MOVED_KEYS.find(k => path === k || path.startsWith(k + '/'));
  return from && MOVED[from] + path.slice(from.length);
}

/** 화면 컴포넌트가 받는 값. sub 는 '#/analysis/techtree' 의 'techtree'(없으면 undefined). */
export type ScreenProps = { sub?: string };
export type Route = { name: RouteName; sub?: string };

export const pathOf = (r: Route) => (r.sub ? `${r.name}/${r.sub}` : r.name);
const within = (path: string, base: string) => path === base || path.startsWith(base + '/');

/**
 * 지금 경로가 메뉴 트리의 어디인지. item 은 메인 메뉴, child 는 하위 항목.
 * exact 는 그 항목 화면 자체인지(아니면 신청 준비·회고 인터뷰처럼 그 아래 흐름 화면).
 */
export function navMatch(route: Route): { item?: NavItem; child?: NavChild; exact: boolean } {
  const path = pathOf(route);
  const item = NAV.find(n => within(path, n.path));
  const child = item?.children?.find(c => within(path, c.path));
  return { item, child, exact: path === (child ?? item)?.path };
}

/** 흐름 화면의 빵부스러기 첫 칸. parentLink('activities/records') → { label: '기록', href: '#/activities/records' } */
export function parentLink(path: string): { label: string; href: string } {
  const label = NAV.flatMap(n => [n, ...(n.children ?? [])]).find(n => n.path === path)?.label ?? path;
  return { label, href: hrefOf(path) };
}

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

// 바로 앞 경로. 요약·목록 화면이 '아래 흐름 화면에서 돌아왔는지' 알아 스크롤을 되살릴 때 쓴다(브라우저 뒤로 가기 포함).
let currentHash = typeof location === 'undefined' ? '' : location.hash;
let previousHash = '';
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    if (location.hash === currentHash) return;
    previousHash = currentHash;
    currentHash = location.hash;
  });
}

/** 지금 화면 바로 전에 있던 경로. 처음 연 화면이면 undefined */
export function previousRoute(): Route | undefined {
  return previousHash ? parseHash(previousHash) : undefined;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => location.hash;

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}
