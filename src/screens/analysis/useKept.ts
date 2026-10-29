import { useState } from 'react';

// ponytail: 연결 확인과 '내 생각'은 전역 상태에 자리가 없어 화면 밖 변수에 둔다. 새로고침하면 처음으로 돌아간다. 전역 상태에 자리가 생기면 옮긴다.
const kept = new Map<string, unknown>();

/** useState 처럼 쓰되, 다른 화면에 다녀와도 값을 지킨다. */
export function useKept<T>(key: string, initial: T) {
  const [value, set] = useState<T>(() => (kept.has(key) ? (kept.get(key) as T) : initial));
  const update = (next: T | ((prev: T) => T)) => {
    set(prev => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      kept.set(key, v);
      return v;
    });
  };
  return [value, update] as const;
}
