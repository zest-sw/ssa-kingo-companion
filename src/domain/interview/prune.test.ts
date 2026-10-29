import { describe, expect, it } from 'vitest';
import { pruneByKeys } from './prune';

describe('pruneByKeys', () => {
  it('남길 키만 둔다', () => {
    expect(pruneByKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(pruneByKeys({ a: 1 }, [])).toEqual({});
  });
  it('뺄 것이 없으면 같은 객체를 돌려준다(불필요한 갱신 방지)', () => {
    const m = { a: 1, b: 2 };
    expect(pruneByKeys(m, ['a', 'b', 'z'])).toBe(m);
  });
});
