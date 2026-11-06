import { lazy, Suspense, useState, type ComponentType } from 'react';
import Home from '../screens/home';
import { entityViewOf, registerEntityView, type EntityKind, type EntityView } from './entity';
import type { RouteName, ScreenProps } from './router';

/**
 * 화면 덩어리 나누기(토스 원칙 09 기다림 없애기). 첫 덩어리에는 앱 틀·홈·공용 부품·상태만 둔다.
 * 나머지 화면은 처음 갈 때 받는데, 보통은 그 전에 미리 받아 둔다(preload.ts: 한가할 때, 링크에 올리거나 초점이 갈 때).
 */
type Mod<P> = { default: ComponentType<P> };

function deferred<P extends object>(load: () => Promise<Mod<P>>) {
  let done: Mod<P> | undefined;
  let pending: Promise<Mod<P>> | undefined;
  // 실패하면 다음에 다시 받게 비운다(잠깐 끊긴 네트워크).
  const preload = () => (pending ??= load().then(m => (done = m), e => { pending = undefined; throw e; }));
  const Lazy = lazy(preload);
  // 이미 받은 화면은 Suspense 를 거치지 않고 바로 그린다. 고르는 건 처음 붙을 때 한 번이다(중간에 바꾸면 화면이 새로 붙는다).
  function View(props: P) {
    const [ready] = useState(() => done);
    return ready ? <ready.default {...props} /> : <Lazy {...props} />;
  }
  return { View, preload };
}

const LAZY = {
  recommend: deferred(() => import('../screens/recommend')),
  activities: deferred(() => import('../screens/activities')),
  analysis: deferred(() => import('../screens/analysis')),
  profile: deferred(() => import('../screens/profile')),
  settings: deferred(() => import('../screens/settings')),
  _kit: deferred(() => import('./kit/KitScreen'))
} satisfies Record<Exclude<RouteName, 'home'>, unknown>;

export const SCREEN: Record<RouteName, ComponentType<ScreenProps>> = {
  home: Home,
  recommend: LAZY.recommend.View, activities: LAZY.activities.View, analysis: LAZY.analysis.View,
  profile: LAZY.profile.View, settings: LAZY.settings.View, _kit: LAZY._kit.View
};

/** 미리 받을 차례: 사이드바 순서. 컴포넌트 목록(_kit)은 개발용이라 미리 받지 않는다. */
export const PRELOAD_ORDER = ['recommend', 'activities', 'analysis', 'profile', 'settings'] as const;

/** 그 화면 덩어리를 받기 시작한다. 이미 받았거나 받는 중이면 아무것도 안 한다. */
export function preloadScreen(name: RouteName): Promise<unknown> {
  return name === 'home' ? Promise.resolve() : LAZY[name].preload().catch(() => undefined);
}

/**
 * 서랍(활동·기회·기록)은 홈에서도 연다. 서랍 코드는 그 화면 덩어리 안에 있어서, 덩어리를 받기 전에는 받아 오는 자리표를 등록해 둔다.
 * 받으면 그 모듈이 진짜 서랍을 등록하는데, 자리표를 다시 등록해 둔다: 열려 있는 서랍이 다른 컴포넌트로 바뀌어 새로 붙지 않게.
 */
function deferEntity(kind: EntityKind, load: () => Promise<unknown>) {
  const Real = lazy(async () => {
    await load();
    const view = entityViewOf(kind);
    registerEntityView(kind, Stub);
    if (!view || view === Stub) throw new Error(`${kind} 서랍을 등록하지 않았다`);
    return { default: view };
  });
  // 서랍은 받는 동안 비워 둔다(눌러서 여는 것이라 덩어리가 이미 와 있는 경우가 대부분이다). 검사 스크립트는 이 표시가 사라지길 기다린다.
  const Stub: EntityView = props => <Suspense fallback={<span hidden data-screen-loading="" />}><Real {...props} /></Suspense>;
  registerEntityView(kind, Stub);
}
deferEntity('activity', () => import('../screens/activities/ActivityEntity'));
deferEntity('opportunity', () => import('../screens/recommend/OppEntity'));
deferEntity('record', () => import('../screens/records/RecordEntity'));
