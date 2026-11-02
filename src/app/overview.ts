// 메뉴별 L1 개요의 선택과 스크롤 위치. L2 에서 돌아오면 그대로 되살린다.
// 이번 탭(sessionStorage)에만 둔다. 새로고침해도 남고, 탭을 닫으면 사라진다. 학생 데이터가 아니라 화면 위치라 app 저장 키와 따로 둔다.

export type OverviewSnap = { sel?: unknown; scrollY?: number };
type Store = Record<string, OverviewSnap>;
type KV = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'kingo-companion:overview';
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** 저장한 글을 읽는다. 모양이 틀린 조각은 버린다. */
export function parseOverview(raw: string | null): Store {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data)) return {};
    const out: Store = {};
    for (const [menu, snap] of Object.entries(data)) {
      if (!isObj(snap)) continue;
      out[menu] = { sel: snap.sel, scrollY: typeof snap.scrollY === 'number' && snap.scrollY >= 0 ? snap.scrollY : undefined };
    }
    return out;
  } catch {
    return {};
  }
}

export function createOverviewStore(kv?: KV) {
  let store: Store = {};
  try { store = parseOverview(kv?.getItem(KEY) ?? null); } catch { /* 저장소가 막혀 있으면 메모리로만 */ }
  const flush = () => { try { kv?.setItem(KEY, JSON.stringify(store)); } catch { /* 위와 같은 이유 */ } };
  const patch = (menu: string, p: OverviewSnap) => { store = { ...store, [menu]: { ...store[menu], ...p } }; flush(); };
  return {
    get: (menu: string): OverviewSnap => store[menu] ?? {},
    setSel: (menu: string, sel: unknown) => patch(menu, { sel }),
    setScroll: (menu: string, scrollY: number) => patch(menu, { scrollY: Math.max(0, Math.round(scrollY)) }),
    clear: (menu: string) => { const { [menu]: _, ...rest } = store; store = rest; flush(); }
  };
}
export type OverviewStore = ReturnType<typeof createOverviewStore>;

/** 저장한 선택이 지금 화면이 쓰는 모양이면 그것, 아니면 처음 값 */
export function restoreSel<T>(snap: OverviewSnap, initial: T, isValid?: (v: unknown) => v is T): T {
  if (snap.sel === undefined) return initial;
  if (isValid) return isValid(snap.sel) ? snap.sel : initial;
  return typeof snap.sel === typeof initial && Array.isArray(snap.sel) === Array.isArray(initial) && (snap.sel === null) === (initial === null) ? (snap.sel as T) : initial;
}

/** 스크롤을 되살릴지: 바로 전 화면이 같은 메뉴의 L2 였을 때만(사이드바로 새로 들어오면 맨 위부터). */
export function shouldRestoreScroll(menu: string, previous: { name: string; sub?: string } | undefined): boolean {
  return previous !== undefined && previous.name === menu && previous.sub !== undefined;
}
