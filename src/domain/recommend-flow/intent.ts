import type { AskFilter } from './ask';

// 다른 화면(홈·추천 L1)에서 목록-상세(#/recommend/list)로 넘길 값: 처음 고를 후보, 필터, 보기.
// ponytail: 주소에 싣지 않고 한 번 읽고 지우는 메모리 값이다. 새로고침하면 사라진다. 링크로 공유할 일이 생기면 주소 조각으로 옮긴다.

export type ListIntent = { select?: string; filter?: AskFilter; view?: 'detail' | 'table' };
let pending: ListIntent | undefined;

export const setListIntent = (i: ListIntent) => { pending = i; };

/** 한 번만 돌려준다 */
export function takeListIntent(): ListIntent | undefined {
  const i = pending;
  pending = undefined;
  return i;
}
