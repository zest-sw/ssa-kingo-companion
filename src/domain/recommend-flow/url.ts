import { CATEGORY_ORDER, type CategoryFilter, type OpenSort } from './opportunities';

// 추천 화면의 주소 상태: 탭, 종류 칩, 정렬, 연 모달(기회 id). 새로고침·뒤로 가기·공유가 같은 화면을 연다.

export type RecTab = 'picks' | 'all';
export type RecSel = { tab: RecTab; cat: CategoryFilter; sort: OpenSort; open?: string };
export const DEFAULT_SEL: RecSel = { tab: 'picks', cat: 'all', sort: 'deadline' };

/** 주소의 ?tab=all&cat=edu&sort=new&open=p-x 를 읽는다. 모르는 값은 기본값으로 둔다. */
export function parseRecQuery(q: URLSearchParams): RecSel {
  const tab = q.get('tab') === 'all' ? 'all' : 'picks';
  const c = q.get('cat');
  const cat: CategoryFilter = c && (CATEGORY_ORDER as string[]).includes(c) ? (c as CategoryFilter) : 'all';
  const sort: OpenSort = q.get('sort') === 'new' ? 'new' : 'deadline';
  const open = q.get('open') || undefined;
  return { tab, cat, sort, open };
}

/** 주소에 붙일 값. 기본값은 빼서 주소를 짧게 둔다. 칩·정렬은 전체 기회 탭에서만 뜻이 있다. */
export function recQuery(sel: RecSel): Record<string, string | undefined> {
  const all = sel.tab === 'all';
  return {
    tab: all ? 'all' : undefined,
    cat: all && sel.cat !== 'all' ? sel.cat : undefined,
    sort: all && sel.sort !== 'deadline' ? sel.sort : undefined,
    open: sel.open
  };
}
