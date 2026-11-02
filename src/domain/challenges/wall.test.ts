import { describe, expect, it } from 'vitest';
import type { ChallengeResult } from './index';
import { fillRatio, RARITY_STEP, wallState } from './wall';

const r = (value: number, over: { hidden?: boolean } = {}, max = 3): ChallengeResult => ({
  def: { id: 'x', rule: 'firstRetro', hidden: over.hidden ?? false }, progress: { value, max }, achieved: value >= max
});

describe('배지 벽 칸', () => {
  it('달성 > 숨김 > 진행 > 시작 전 순으로 모양을 정한다', () => {
    expect(wallState(r(3))).toBe('done');
    expect(wallState(r(3, { hidden: true }))).toBe('done');
    expect(wallState(r(1, { hidden: true }))).toBe('locked');
    expect(wallState(r(1))).toBe('doing');
    expect(wallState(r(0))).toBe('idle');
  });
  it('진행 비율은 0~1 로 자른다', () => {
    expect(fillRatio(r(1))).toBeCloseTo(1 / 3);
    expect(fillRatio(r(5))).toBe(1);
    expect(fillRatio(r(0, {}, 0))).toBe(0);
  });
  it('희귀할수록 단계가 높다', () => {
    expect(RARITY_STEP.common).toBeLessThan(RARITY_STEP.uncommon);
    expect(RARITY_STEP.uncommon).toBeLessThan(RARITY_STEP.rare);
  });
});
