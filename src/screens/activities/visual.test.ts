import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES } from '../../data/seed';
import { statusBars } from './visual';

describe('내 활동 한눈에 그림', () => {
  it('할 일 막대는 할 것·하는 중·끝난 것 개수', () => {
    expect(statusBars(SEED_ACTIVITIES).map(b => [b.label, b.count])).toEqual([['할 것', 5], ['하는 중', 3], ['끝난 것', 6]]);
    expect(statusBars([]).every(b => b.count === 0)).toBe(true);
  });
});
