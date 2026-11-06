import { describe, expect, it } from 'vitest';
import { memoRecent } from './memo';

describe('memoRecent', () => {
  it('같은 입력(같은 참조)이면 다시 계산하지 않는다', () => {
    let calls = 0;
    const f = memoRecent((xs: number[], k: number) => { calls++; return xs.map(x => x * k); });
    const xs = [1, 2];
    const a = f(xs, 2);
    expect(f(xs, 2)).toBe(a);
    expect(calls).toBe(1);
    // 내용이 같아도 다른 배열이면 다른 입력이다(상태는 바뀔 때 새 참조가 된다)
    f([1, 2], 2);
    expect(calls).toBe(2);
  });

  it('최근 size 개를 기억하고 가장 오래 안 쓴 것부터 잊는다', () => {
    let calls = 0;
    const f = memoRecent((n: number) => { calls++; return n; }, 2);
    f(1); f(2); f(1); f(3);
    expect(calls).toBe(3);
    f(1);
    expect(calls).toBe(3);
    f(2);
    expect(calls).toBe(4);
  });

  it('인자 개수가 다르면 다른 입력이다', () => {
    let calls = 0;
    const f = memoRecent((a: number, b?: number) => { calls++; return a + (b ?? 0); });
    f(1); f(1, undefined);
    expect(calls).toBe(2);
  });
});
