import type { RecordItem } from '../types';

// 학기 이름은 '2026-1', '2026-여름', '2026-2', '2026-겨울' 순서로 흐른다.
const SEASONS = ['1', '여름', '2', '겨울'];
const SEASON_LABEL: Record<string, string> = { '1': '1학기', '여름': '여름', '2': '2학기', '겨울': '겨울' };

/** 학기를 한 줄 위의 숫자로. 모르는 이름이면 NaN. */
export function semesterKey(s: string): number {
  const [y, k] = s.split('-');
  const i = SEASONS.indexOf(k);
  return i < 0 || !/^\d{4}$/.test(y) ? NaN : Number(y) * 4 + i;
}
export const semesterOf = (key: number) => `${Math.floor(key / 4)}-${SEASONS[key % 4]}`;
export function semesterLabel(s: string): string {
  const [y, k] = s.split('-');
  return k === '1' || k === '2' ? `${y}-${k}학기` : `${y} ${SEASON_LABEL[k] ?? k}`;
}

/** 기록을 학기 순서로. 같은 학기면 들어온 순서를 지킨다. */
export function sortRecords(records: RecordItem[]): RecordItem[] {
  return records.map((r, i) => ({ r, i, k: semesterKey(r.semester) })).sort((a, b) => (a.k - b.k) || (a.i - b.i)).map(x => x.r);
}

/** from 부터 now 까지, 기록이 그 바깥에 있으면 거기까지 늘린 학기 목록. 기록이 없는 학기도 넣는다. */
export function semesterAxis(records: RecordItem[], from: string, now: string): string[] {
  const keys = records.map(r => semesterKey(r.semester)).filter(k => !Number.isNaN(k));
  const lo = Math.min(semesterKey(from), ...keys);
  const hi = Math.max(semesterKey(now), ...keys);
  return Array.from({ length: hi - lo + 1 }, (_, i) => semesterOf(lo + i));
}
