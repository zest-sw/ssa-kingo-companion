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
