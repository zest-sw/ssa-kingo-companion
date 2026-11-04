// 보관함에서 고른 경험 카드 묶음. 묶음 화면(records/portfolio)과 보관함이 같이 읽는다.
// ponytail: 이 탭 세션에만 남긴다(sessionStorage). 기기 사이에 남기려면 저장소가 생길 때 AppState 로 옮긴다.
const KEY = 'kingo.records.portfolio';

export function readPicks(): string[] {
  try {
    const v: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writePicks(ids: string[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* 저장이 막혀 있으면 이번 화면에서만 쓴다 */ }
}
