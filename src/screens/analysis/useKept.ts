import { useRef, useState } from 'react';

const PREFIX = 'ssa-an:';
// 저장소를 못 쓰는 환경(사생활 보호 창 등)에서도 화면 사이 이동에는 값이 남게 메모리에 한 벌 더 둔다.
const memory = new Map<string, unknown>();

function read<T>(key: string, parse: (raw: unknown) => T | null): T | null {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  memory.set(key, value);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* 저장소가 막혀 있으면 메모리에만 둔다 */ }
}

/**
 * useState 처럼 쓰되 학생이 고른 값을 localStorage('ssa-an:' 키)에 저장해 새로고침에도 남긴다.
 * parse 는 저장된 값의 모양을 확인하고, 맞지 않으면 null 을 돌려 초기값을 쓰게 한다.
 */
export function useKept<T>(key: string, initial: T, parse: (raw: unknown) => T | null) {
  const [value, set] = useState<T>(() => read(key, parse) ?? initial);
  const latest = useRef(value);
  const update = (next: T | ((prev: T) => T)) => {
    const v = typeof next === 'function' ? (next as (p: T) => T)(latest.current) : next;
    if (Object.is(v, latest.current)) return;
    latest.current = v;
    set(v);
    write(key, v);
  };
  return [value, update] as const;
}
