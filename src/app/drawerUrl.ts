import { useCallback } from 'react';
import { navigate, queryOf, useQuery, withParam } from './router';

/**
 * 연 서랍을 주소 뒤 ?drawer=<종류>:<id> 에 남긴다. 모든 화면이 이 한 규칙을 쓴다(기회·활동·기록은 openEntity, 분석 서랍은 useDrawerOf).
 * - 열면 기록을 하나 쌓는다. 뒤로 가기가 서랍을 닫는다. 주소로 바로 열 수 있다(새로고침·공유).
 * - 서랍이 열린 채 다른 서랍을 열면 그 기록을 바꿔 쓴다(닫으면 목록으로).
 * - 닫기는 이 앱이 쌓은 기록이면 뒤로 가기, 주소로 바로 연 서랍이면 주소에서 빼기(기록을 바꿔 쓴다).
 */
export type DrawerKey = { kind: string; id: string };

export const DRAWER_PARAM = 'drawer';

/** '?drawer=record:e4' → { kind: 'record', id: 'e4' }. id 가 없는 서랍은 '?drawer=ratio' → { kind: 'ratio', id: '' } */
export function parseDrawer(q: URLSearchParams): DrawerKey | null {
  const raw = q.get(DRAWER_PARAM);
  if (!raw) return null;
  const i = raw.indexOf(':');
  return i < 0 ? { kind: raw, id: '' } : { kind: raw.slice(0, i), id: raw.slice(i + 1) };
}

export const drawerValue = (key: DrawerKey) => (key.id ? `${key.kind}:${key.id}` : key.kind);

/** 지금 주소에서 서랍만 바꾼 경로. drawerHref('#/analysis/map?x=1', { kind: 'edge', id: 'f1' }) = 'analysis/map?x=1&drawer=edge:f1' */
export const drawerHref = (hash: string, key: DrawerKey | undefined) => withParam(hash, DRAWER_PARAM, key && drawerValue(key));

const current = () => parseDrawer(queryOf(location.hash));

// 이 앱이 서랍을 열며 기록을 쌓았는지. 그랬다면 닫기는 뒤로 가기다(기록이 연 수만큼 쌓이지 않게).
let pushed = false;
// 닫는 중인 주소. 한 번 닫는 동안 onClose 가 두 번 불려도(지운 기록 서랍 등) 뒤로 가기는 한 번만.
let closingFrom: string | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => { closingFrom = null; if (!current()) pushed = false; });
}

export function openDrawer(key: DrawerKey) {
  if (current()) { navigate(drawerHref(location.hash, key), { replace: true }); return; }
  navigate(drawerHref(location.hash, key));
  pushed = true;
}

/**
 * 서랍을 닫는다. 같은 차례 안에서 다른 곳으로 옮기거나 다른 서랍을 열면(닫고 바로 navigate) 닫기는 하지 않는다:
 * history.back 은 늦게 돌아서, 새로 쌓은 기록을 되돌려 버린다.
 */
export function closeDrawer() {
  const at = location.hash;
  if (!current() || closingFrom === at) return;
  closingFrom = at;
  queueMicrotask(() => {
    if (location.hash !== at || !current()) { closingFrom = null; return; }
    if (pushed) { pushed = false; history.back(); }
    else navigate(drawerHref(location.hash, undefined), { replace: true });
  });
}

/** 지금 주소의 서랍. 주소가 바뀌면 다시 그린다. */
export function useDrawer(): DrawerKey | null {
  return parseDrawer(useQuery());
}

/** 한 종류 서랍의 열림(id)과 열기·닫기. const strength = useDrawerOf('strength'); strength.open('data') */
export function useDrawerOf(kind: string): { id: string | null; open: (id?: string) => void; close: () => void } {
  const d = useDrawer();
  const open = useCallback((id = '') => openDrawer({ kind, id }), [kind]);
  return { id: d?.kind === kind ? d.id : null, open, close: closeDrawer };
}

/** 테스트에서만: 쌓은 기록 표시를 지운다 */
export const resetDrawerHistory = () => { pushed = false; closingFrom = null; };
