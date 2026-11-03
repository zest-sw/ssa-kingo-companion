import { useSyncExternalStore } from 'react';
import type { IconName } from '../components';
import { SETTINGS_NAV } from '../data/settings';

/** 사이드바 메인 메뉴 순서 그대로(docs/design/ia-navigation.md 1절) */
export const SCREENS = ['home', 'recommend', 'activities', 'analysis', 'profile'] as const;
export type ScreenName = (typeof SCREENS)[number];
/** 'settings' 는 사이드바 아래 톱니바퀴로 연다. '_kit' 은 컴포넌트 목록(개발용)이고 사이드바에 없다. */
export type RouteName = ScreenName | 'settings' | '_kit';
const OTHER_ROUTES: readonly string[] = ['settings', '_kit'];

export type NavChild = { path: string; label: string };
export type NavItem = { id: ScreenName; path: string; label: string; icon: IconName; children?: NavChild[] };

/** 메인 메뉴 4개. 사이드바가 유일한 이동 수단이고, 하위 항목은 지금 보고 있는 부모 아래에만 펼친다. */
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
  }
];

/** 프로필은 메인 메뉴가 아니라 사이드바 왼쪽 아래 학생 카드로 연다. 친구·팀원 모집·명예의 전당은 프로필 요약의 카드로만 간다. */
// 사이드바 학생 카드의 이름(aria-label)과 화면 제목을 같게 둔다.
export const PROFILE = { path: 'profile', label: '내 프로필' };
const PROFILE_SUBS: NavChild[] = [{ path: 'profile/friends', label: '친구' }, { path: 'profile/recruit', label: '팀원 모집' }, { path: 'profile/hall', label: '명예의 전당' }];

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
  'activities/interview': 'activities/records/interview',
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

/**
 * 메뉴마다 화면이 아는 하위 경로 모양. '*' 는 아무 한 토막(기회·활동 id)이고, 같은 자리의 정해진 이름(예: 'prepare')과는 맞지 않는다.
 * 여기 없는 모양은 화면이 조용히 기본 화면을 그리므로, 주소도 맞는 자리로 바꿔 둔다(canonicalPath).
 */
const KNOWN_SUBS: Record<RouteName, string[]> = {
  home: [],
  recommend: ['*', 'prepare/*'],
  activities: ['schedule', 'schedule/timeline', 'schedule/board', 'schedule/list', 'records', 'records/interview', 'records/interview/*'],
  analysis: ['techtree', 'map', 'flow', 'strengths'],
  profile: ['friends', 'recruit', 'hall'],
  settings: SETTINGS_NAV.map(n => n.id),
  _kit: ['*']
};
/** 하위 경로가 있어야 하는 메뉴의 기본 하위(설정은 첫 칸 '프로필·추천 조건'을 그린다) */
const DEFAULT_SUB: Partial<Record<RouteName, string>> = { settings: SETTINGS_NAV[0].id };

function knownSub(name: RouteName, parts: string[]): boolean {
  const patterns = KNOWN_SUBS[name].map(p => p.split('/'));
  return patterns.some(pat => pat.length === parts.length && pat.every((seg, i) =>
    seg === '*' ? !patterns.some(o => o.length > i && o[i] !== '*' && o[i] === parts[i]) : seg === parts[i]));
}

/**
 * 주소를 바꿔야 하면 바꿀 경로, 맞으면 undefined. 옮긴 경로는 새 자리로, 모르는 메뉴는 홈으로,
 * 모르는 하위 경로는 그 메뉴 안에서 아는 가장 긴 앞부분(없으면 메뉴의 기본 경로)으로.
 * canonicalPath('#/settings/notify') → 'settings/profile', canonicalPath('#/activities/schedule/x') → 'activities/schedule'
 */
export function canonicalPath(hash: string): string | undefined {
  const moved = movedPath(hash);
  const path = moved ?? clean(hash);
  if (!path) return undefined;
  const [head, ...parts] = path.split('/');
  const name = parseHash(path).name;
  if (name !== head) return 'home';
  for (let n = parts.length; n > 0; n--) {
    if (knownSub(name, parts.slice(0, n))) return n === parts.length ? moved : [name, ...parts.slice(0, n)].join('/');
  }
  if (!parts.length) return moved;
  return DEFAULT_SUB[name] ? `${name}/${DEFAULT_SUB[name]}` : name;
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

/** 프로필 화면(요약과 친구·팀원 모집·명예의 전당)인지. 학생 카드의 활성 표시에 쓴다. */
export const inProfile = (route: Route) => route.name === 'profile';

/** 지금 화면 이름(문서 제목용). 프로필 하위는 하위 이름. */
export function screenLabel(route: Route): string | undefined {
  if (route.name === 'profile') return PROFILE_SUBS.find(c => within(pathOf(route), c.path))?.label ?? PROFILE.label;
  const at = navMatch(route);
  return (at.child ?? at.item)?.label;
}

/** 흐름 화면의 빵부스러기 첫 칸. parentLink('activities/records') → { label: '기록', href: '#/activities/records' } */
export function parentLink(path: string): { label: string; href: string } {
  const label = [...NAV.flatMap(n => [n, ...(n.children ?? [])]), PROFILE, ...PROFILE_SUBS].find(n => n.path === path)?.label ?? path;
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
