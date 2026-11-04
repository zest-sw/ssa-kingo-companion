/**
 * 진입점 세기 규칙(docs/design/ia-navigation.md 2절). 화면 하나에서 찾은 링크·버튼을 목적지별로 묶는다.
 * - 지금 보고 있는 페이지를 가리키는 링크(aria-current="page")끼리는 하나로 센다. 위치 표시이지 다른 길이 아니다.
 *   예) 나의 분석 요약에서 사이드바 '나의 분석'과 구역 탭 '한눈에'.
 * - 구역 요약 짝: 하위 화면에서 사이드바 구역 항목과 그 구역의 '한눈에' 탭은 같은 구역 머리를 가리키는 한 쌍이라 하나로 센다(sectionHome).
 * 나머지 같은 목적지 중복은 그대로 둘 이상으로 센다.
 */
export type Entry = { dest: string; name: string; current?: boolean; sectionHome?: boolean };

export function groupEntries(entries: Entry[]): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const merged = new Set<string>();
  for (const e of entries) {
    const list = found.get(e.dest) ?? [];
    const key = e.current ? `page:${e.dest}` : e.sectionHome ? `home:${e.dest}` : undefined;
    if (key && merged.has(key)) continue;
    if (key) merged.add(key);
    found.set(e.dest, [...list, e.name]);
  }
  return found;
}

/** 둘 이상인 목적지만 'dest ← 이름 / 이름' 줄로 */
export const duplicates = (found: Map<string, string[]>) =>
  [...found].filter(([, names]) => names.length > 1).map(([dest, names]) => `${dest} ← ${names.join(' / ')}`);
