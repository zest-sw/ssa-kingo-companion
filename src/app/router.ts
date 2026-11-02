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

/**
 * 메뉴별 L2 하위 경로(docs/design/ia-navigation.md 2절). ':id' 는 항목 id 자리다. 위에서부터 맞춰 본다.
 * 화면은 sub 를 그대로 받고, 모르는 sub 면 L1 을 그린다.
 */
export const SUB_ROUTES = {
  recommend: ['list', 'compare', 'prepare/:id', ':id'],
  activities: ['board', 'list'],
  records: ['archive', 'interview/:id', 'interview'],
  analysis: ['techtree', 'map', 'flow', 'strengths'],
  challenges: ['list'],
  friends: ['profile', 'recruit', 'hall']
} as const satisfies Partial<Record<ScreenName, readonly string[]>>;

type SubMenu = keyof typeof SUB_ROUTES;
export type SubPattern = { [M in SubMenu]: `${M}/${(typeof SUB_ROUTES)[M][number]}` }[SubMenu];

/** 빵부스러기 끝 이름. 항목 상세(':id')는 화면이 제목으로 채운다. */
export const SUB_LABEL: Record<SubPattern, string> = {
  'recommend/list': '후보 목록', 'recommend/compare': '비교해서 고르기', 'recommend/prepare/:id': '신청 준비', 'recommend/:id': '추천 상세',
  'activities/board': '보드', 'activities/list': '목록',
  'records/archive': '보관함', 'records/interview/:id': '회고 인터뷰', 'records/interview': '회고 인터뷰',
  'analysis/techtree': '테크 트리', 'analysis/map': '경험 지도', 'analysis/flow': '관심 흐름', 'analysis/strengths': '나의 강점',
  'challenges/list': '과제 목록',
  'friends/profile': '프로필', 'friends/recruit': '팀원 모집', 'friends/hall': '명예의 전당'
};

/**
 * sub 가 어느 L2 인지. 'prepare/p-ai' → { pattern: 'recommend/prepare/:id', id: 'p-ai' }. L1 이거나 모르면 undefined.
 */
export function matchSub(name: RouteName, sub: string | undefined): { pattern: SubPattern; id?: string } | undefined {
  if (!sub || !(name in SUB_ROUTES)) return undefined;
  const parts = sub.split('/');
  const patterns = SUB_ROUTES[name as SubMenu] as readonly string[];
  // 'prepare' 처럼 고정 이름으로 쓰는 말은 id 자리에 오지 않는다.
  const reserved = new Set(patterns.map(p => p.split('/')[0]).filter(w => w !== ':id'));
  for (const p of patterns) {
    const want = p.split('/');
    if (want.length !== parts.length) continue;
    if (!want.every((w, i) => (w === ':id' ? parts[i] !== '' && !(i === 0 && reserved.has(parts[i])) : w === parts[i]))) continue;
    const at = want.indexOf(':id');
    return { pattern: `${name}/${p}` as SubPattern, id: at === -1 ? undefined : parts[at] };
  }
  return undefined;
}

/** L2 머리(PageHeader parent)에 넘길 그 메뉴의 L1. 뒤로 버튼과 빵부스러기 첫 칸이 여기로 간다. */
export function l1Of(menu: ScreenName): { label: string; href: string } {
  return { label: NAV.find(n => n.id === menu)?.label ?? menu, href: hrefOf(menu) };
}

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

// 바로 앞 경로. L1 이 'L2 에서 돌아왔는지' 알아 스크롤을 되살릴 때 쓴다(브라우저 뒤로 가기 포함).
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
