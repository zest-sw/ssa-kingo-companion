/** keep 에 없는 키를 뺀다. 뺄 것이 없으면 같은 객체를 돌려줘서 불필요한 갱신을 막는다. */
export function pruneByKeys<T>(map: Record<string, T>, keep: readonly string[]): Record<string, T> {
  const have = new Set(keep);
  const keys = Object.keys(map);
  if (keys.every(k => have.has(k))) return map;
  return Object.fromEntries(keys.filter(k => have.has(k)).map(k => [k, map[k]]));
}
