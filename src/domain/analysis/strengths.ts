import type { Axis, RecordItem } from '../types';
import { AXES } from '../vocab';

export type Level = 'low' | 'mid' | 'high';
export const LEVELS: { id: Level; label: string }[] = [{ id: 'low', label: '적음' }, { id: 'mid', label: '중간' }, { id: 'high', label: '많음' }];
export type Seen = 'none' | Level;
export type Gap = 'same' | 'seen-more' | 'self-more';
/** count: 이 역량이 보이는 기록 수 */
export type StrengthRow = { axis: Axis; label: string; self: Level; seen: Seen; count: number; evidence: RecordItem[]; gap: Gap };

const RANK: Record<Seen, number> = { none: 0, low: 1, mid: 2, high: 3 };

// ponytail: 역량 체계와 '많음' 기준은 미정이다. 기록 수로만 나누는 임시 규칙이고, 체계가 정해지면 고친다.
export const seenOf = (count: number): Seen => (count === 0 ? 'none' : count === 1 ? 'low' : count <= 3 ? 'mid' : 'high');

export function buildStrengths(records: RecordItem[], self: Record<Axis, Level>): StrengthRow[] {
  return AXES.map(({ id, label }) => {
    const evidence = records.filter(r => r.axes.includes(id));
    const seen = seenOf(evidence.length);
    const d = RANK[seen] - RANK[self[id]];
    return { axis: id, label, self: self[id], seen, count: evidence.length, evidence, gap: d === 0 ? 'same' : d > 0 ? 'seen-more' : 'self-more' };
  });
}

/** '내 생각과 기록이 달라요'에 모을 항목 */
export const differences = (rows: StrengthRow[]) => rows.filter(r => r.gap !== 'same');

/** 기록에서 보이는 수준이 있으면 그 수준, 없으면 null */
export const levelOfSeen = (seen: Seen): Level | null => (seen === 'none' ? null : seen);
export const levelLabel = (l: Level) => LEVELS.find(x => x.id === l)?.label ?? '';

/** 저장소에서 읽은 '내 생각'은 모든 역량에 알맞은 수준이 있을 때만 쓴다. 빠진 역량은 기본값으로 채운다. */
export function parseSelf(raw: unknown, fallback: Record<Axis, Level>): Record<Axis, Level> | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const out = { ...fallback };
  for (const { id } of AXES) {
    const v = src[id];
    if (v === 'low' || v === 'mid' || v === 'high') out[id] = v;
  }
  return out;
}
