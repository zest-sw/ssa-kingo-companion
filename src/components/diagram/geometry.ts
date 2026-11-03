// 다이어그램 부품의 순수 계산. 화면 픽셀이 아니라 0~1 비율과 개수만 다루고, 픽셀이 필요한 곳은 폭을 받는다.

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' 를 날짜 번호(1970-01-01 = 0)로. 시간대에 흔들리지 않게 UTC 로 센다. */
export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** 날짜 번호를 다시 'YYYY-MM-DD' 로 */
export function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** '2026-10-15' → '10월 15일' */
export function dateLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}월 ${d}일`;
}

/** '2026-10-15' → '10.15' (눈금처럼 좁은 자리) */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}.${d}`;
}

export type DateRange = { start: string; end: string };

/** 날짜가 범위 안 어디쯤인지 0~1. 범위 밖이면 0 미만이나 1 초과를 그대로 돌려준다. */
export function fractionOf(iso: string, range: DateRange): number {
  const s = dayNumber(range.start);
  const total = dayNumber(range.end) - s;
  return total <= 0 ? 0 : (dayNumber(iso) - s) / total;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const inRange = (x: number) => x >= 0 && x <= 1;

/** 눈금 간격 후보(날). 좁으면 더 성기게 찍는다. */
const STEPS = [1, 2, 7, 14, 28];

/**
 * 폭에 맞는 눈금 날짜들. 눈금 사이가 minGapPx 보다 좁아지지 않는 가장 촘촘한 간격을 고른다.
 * 첫 눈금은 범위 시작, 그 뒤로 같은 간격.
 */
export function pickTicks(range: DateRange, widthPx: number, minGapPx = 64): string[] {
  const s = dayNumber(range.start);
  const total = dayNumber(range.end) - s;
  if (total <= 0 || widthPx <= 0) return [range.start];
  const perDay = widthPx / total;
  const step = STEPS.find(n => n * perDay >= minGapPx) ?? Math.ceil(minGapPx / perDay);
  const ticks: string[] = [];
  for (let d = 0; d <= total; d += step) ticks.push(isoOf(s + d));
  return ticks;
}

export type Span = { from: number; to: number };

/**
 * 겹치는 조각을 줄(lane)로 나눈다. 입력 순서대로 줄 번호를 돌려준다.
 * 왼쪽부터 놓으면서, 앞 조각 끝과 gap 이상 떨어진 가장 위 줄에 넣는다.
 */
/**
 * 같은 묶음 키끼리 모은다. 입력 순서를 지킨 묶음 목록(각 묶음은 입력 번호들).
 * groupOf(i) 가 undefined 면 혼자 한 묶음.
 */
export function groupIndices(count: number, groupOf: (i: number) => string | undefined): number[][] {
  const units: number[][] = [];
  const at = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const key = groupOf(i);
    const found = key === undefined ? undefined : at.get(key);
    if (found) { found.push(i); continue; }
    const unit = [i];
    units.push(unit);
    if (key !== undefined) at.set(key, unit);
  }
  return units;
}

/**
 * 한 줄에 놓는 점들(x 오름차순 px)이 서로 minGap 보다 가까우면 벌린다. 벌린 뒤 가운데가 원래 가운데와 같게 맞춘다.
 * 돌려주는 값은 점마다 옮긴 거리(px). 같은 날 마감·활동 표식이 한 점에 포개지지 않게 쓴다.
 */
export function spreadPoints(xs: number[], minGap: number): number[] {
  if (xs.length < 2) return xs.map(() => 0);
  const adj = [xs[0]];
  for (let i = 1; i < xs.length; i++) adj.push(Math.max(xs[i], adj[i - 1] + minGap));
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const shift = mean(xs) - mean(adj);
  return adj.map((v, i) => v + shift - xs[i]);
}

/** 짧은 라벨의 대략 폭(px). 한글은 글자 크기만큼, 그 밖은 0.6배. 줄 나누기에만 쓴다(정확할 필요 없음) */
export function textWidth(s: string, px: number): number {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᇿ㄰-㆏가-힣一-鿿]/.test(ch) ? px : px * 0.6;
  return w;
}

export function assignLanes(spans: Span[], gap: number): number[] {
  const order = spans.map((s, i) => i).sort((a, b) => spans[a].from - spans[b].from || a - b);
  const laneEnd: number[] = [];
  const lanes = new Array<number>(spans.length);
  for (const i of order) {
    const { from, to } = spans[i];
    let lane = laneEnd.findIndex(end => from - end >= gap);
    if (lane === -1) lane = laneEnd.length;
    laneEnd[lane] = Math.max(to, from);
    lanes[i] = lane;
  }
  return lanes;
}

export type GridCell<T> = { row: string; col: string; items: T[] };

/** 행·열 격자에 항목을 나눠 담는다. 행·열 목록에 없는 항목은 dropped 로 따로 돌려준다. */
export function layoutGrid<T extends { row: string; col: string }>(rows: string[], cols: string[], items: T[]): { cells: GridCell<T>[][]; dropped: T[] } {
  const cells = rows.map(row => cols.map(col => ({ row, col, items: [] as T[] })));
  const dropped: T[] = [];
  for (const it of items) {
    const r = rows.indexOf(it.row);
    const c = cols.indexOf(it.col);
    if (r === -1 || c === -1) dropped.push(it);
    else cells[r][c].items.push(it);
  }
  return { cells, dropped };
}

export type FunnelPart = { ratio: number; keptFromPrev: number | undefined };

/** 깔때기 막대 길이(가장 큰 단계 = 1)와 앞 단계에서 남은 비율. 앞 단계가 0 이면 남은 비율은 없다. */
export function funnelRatios(counts: number[]): FunnelPart[] {
  const max = Math.max(0, ...counts);
  return counts.map((c, i) => ({
    ratio: max === 0 ? 0 : Math.max(0, c) / max,
    keptFromPrev: i === 0 || counts[i - 1] <= 0 ? undefined : Math.max(0, c) / counts[i - 1]
  }));
}

/** 값들을 합이 100 인 정수 퍼센트로. 큰 나머지부터 1씩 더한다. 합이 0 이면 모두 0. */
export function segmentPercents(values: number[]): number[] {
  const safe = values.map(v => Math.max(0, v));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total === 0) return safe.map(() => 0);
  const raw = safe.map(v => (v / total) * 100);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const byRemainder = raw.map((r, i) => i).sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])) || a - b);
  for (const i of byRemainder) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  return out;
}

/** 툴팁·끝 라벨이 그림 밖으로 나가지 않게 가장자리 근처면 그쪽에 붙인다. */
export function edgeAlign(x: number): 'start' | 'center' | 'end' {
  return x < 0.12 ? 'start' : x > 0.88 ? 'end' : 'center';
}
