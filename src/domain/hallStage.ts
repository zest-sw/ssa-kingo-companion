// 명예의 전당 장면: 오른 날짜순 줄 세우기와 끝없이 이어지는 행렬의 위치 계산. 순위·번호는 만들지 않는다.

export type Joined = { id: string; joined: string };

/** 오른 날짜('2026-09') 순, 먼저 오른 사람이 앞. 날짜가 없으면 뒤로 */
export function byJoined<T extends { id: string }>(entries: T[], joined: Record<string, string>): T[] {
  return [...entries].sort((a, b) => (joined[a.id] ?? '9999').localeCompare(joined[b.id] ?? '9999'));
}

/** 가장 최근에 오른 n명(최근이 앞) */
export function recentJoined<T extends { id: string }>(entries: T[], joined: Record<string, string>, n = 3): T[] {
  return byJoined(entries, joined).reverse().slice(0, n);
}

/** 걸어온 길 한 줄: '첫 활동에서 마지막 활동까지, 활동 n개'. 화살표·가운뎃점 사슬 대신 말로 잇는다 */
export function pathLine(path: { title: string }[]): string {
  if (!path.length) return '아직 공개한 활동이 없어요';
  if (path.length === 1) return path[0].title;
  return `${path[0].title}에서 ${path[path.length - 1].title}까지, 활동 ${path.length}개`;
}

/** '2026-09' → '2026년 9월에 올랐어요' */
export function joinedLabel(ym: string | undefined): string | undefined {
  const m = ym?.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[1]}년 ${Number(m[2])}월에 올랐어요` : undefined;
}

/** 행렬 위치를 한 바퀴(set) 안으로 접는다. 같은 줄을 여러 번 이어 그려 끝없이 보이게 할 때 쓴다 */
export const wrapOffset = (x: number, set: number) => (set <= 0 ? 0 : ((x % set) + set) % set);
