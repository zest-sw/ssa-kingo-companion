import { useCallback, useEffect, useRef, useState, type RefCallback } from 'react';

/** 접힘·펼침이 끝난 뒤 표시를 떼는 시간. 움직임(--dur-base)보다 넉넉히 */
const SETTLE_MS = 400;

export type Presence = 'enter' | 'leave' | undefined;
export type PresenceEntry<T> = { key: string; item: T; presence: Presence };

/**
 * 두 목록 사이에 행 하나만 빠졌거나 하나만 들어왔는지. 그때만 움직인다(관심 없음·나중에 보기·되돌리기).
 * 칩·정렬·주차처럼 여러 행이 한꺼번에 바뀌면 움직이지 않는다(같은 화면 주소 상태는 전환하지 않는다).
 */
export function diffOne(prev: readonly string[], next: readonly string[]): { removed?: { key: string; index: number }; added?: string } {
  const now = new Set(next);
  const was = new Set(prev);
  const gone = prev.flatMap((k, index) => (now.has(k) ? [] : [{ key: k, index }]));
  const fresh = next.filter(k => !was.has(k));
  if (gone.length === 1 && fresh.length === 0) return { removed: gone[0] };
  if (fresh.length === 1 && gone.length === 0) return { added: fresh[0] };
  return {};
}

/**
 * 목록에서 빠지는 행을 접히는 동안 제자리에 남겨 두고, 되돌려 들어온 행은 펼친다. 움직임은 CSS(.ui-collapse)가 한다.
 * 처음 그릴 때는 움직이지 않는다.
 */
export function useListPresence<T>(items: readonly T[], keyOf: (item: T) => string): PresenceEntry<T>[] {
  const [, settle] = useState(0);
  const last = useRef<{ keys: string[]; items: readonly T[] } | null>(null);
  const leaving = useRef(new Map<string, { item: T; index: number }>());
  const entering = useRef(new Set<string>());
  const keys = items.map(keyOf);

  const prev = last.current;
  if (prev && prev.items !== items) {
    const { removed, added } = diffOne(prev.keys, keys);
    if (removed) leaving.current.set(removed.key, { item: prev.items[removed.index], index: removed.index });
    if (added) { entering.current.add(added); leaving.current.delete(added); }
  }
  // 되돌려 다시 들어온 행은 남겨 둔 빈 행이 아니라 새 행으로 그린다.
  for (const k of keys) leaving.current.delete(k);

  useEffect(() => {
    last.current = { keys, items };
    if (leaving.current.size === 0 && entering.current.size === 0) return;
    const t = window.setTimeout(() => { leaving.current.clear(); entering.current.clear(); settle(n => n + 1); }, SETTLE_MS);
    return () => window.clearTimeout(t);
  });

  const out: PresenceEntry<T>[] = items.map((item, i) => ({ key: keys[i], item, presence: entering.current.has(keys[i]) ? 'enter' : undefined }));
  for (const [key, { item, index }] of leaving.current) out.splice(Math.min(index, out.length), 0, { key, item, presence: 'leave' });
  return out;
}

type CollapseRowProps = {
  ref: RefCallback<HTMLLIElement>;
  className: string;
  'data-presence'?: 'enter' | 'leave';
  inert?: boolean;
  'aria-hidden'?: boolean;
};

/**
 * 접히고 펼쳐지는 행(li)에 다는 값. 높이는 그 순간의 내용 높이를 재어 CSS 변수로 넘긴다.
 * 빠지는 행은 접히는 동안 눌리지도 읽히지도 않는다.
 */
export function useCollapseRow(presence: Presence): CollapseRowProps {
  const ref = useCallback<RefCallback<HTMLLIElement>>(el => {
    if (el && presence) el.style.setProperty('--ui-collapse-h', `${el.scrollHeight}px`);
  }, [presence]);
  return {
    ref,
    className: 'ui-collapse',
    'data-presence': presence,
    inert: presence === 'leave' || undefined,
    'aria-hidden': presence === 'leave' || undefined
  };
}
