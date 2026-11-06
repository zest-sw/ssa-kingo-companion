import { describe, expect, it } from 'vitest';
import { categoryOf } from '../domain/recommend-flow/opportunities';
import type { Category, FieldGroup } from '../domain/types';
import { FIELD_GROUP } from '../domain/vocab';
import { PROGRAMS } from './catalog';

// 분류와 분야가 같은 이름이면 분야 꼬리표도 그 이름이어야 한다. 다르면 '멘토링과 맞아요' 옆에 '기타'가 붙는다.
const SAME_NAME: Partial<Record<Category, FieldGroup>> = { mentoring: 'mentor', global: 'global' };

describe('예시 기회 목록', () => {
  it('분류가 멘토링·글로벌이면 분야 묶음도 같다', () => {
    for (const p of PROGRAMS) {
      const want = SAME_NAME[categoryOf(p)];
      if (want) expect(FIELD_GROUP[p.field], p.id).toBe(want);
    }
  });
});
