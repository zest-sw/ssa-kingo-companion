import { describe, expect, it } from 'vitest';
import { nextToAsk } from './discovery';

const list = ['a', 'b', 'c', 'd'].map(key => ({ key }));
const openIf = (open: string[]) => (d: { key: string }) => open.includes(d.key);

describe('nextToAsk', () => {
  it('처음에는 답하지 않은 첫 발견', () => expect(nextToAsk(list, openIf(['b', 'c']))?.key).toBe('b'));
  it('지금 장 다음부터 찾는다', () => expect(nextToAsk(list, openIf(['a', 'c']), 'a')?.key).toBe('c'));
  it('끝에 닿으면 처음으로 돌아간다', () => expect(nextToAsk(list, openIf(['a']), 'd')?.key).toBe('a'));
  it('지금 장 자신은 건너뛴다', () => expect(nextToAsk(list, openIf(['b']), 'b')).toBeUndefined());
  it('남은 게 없으면 undefined', () => expect(nextToAsk(list, openIf([]))).toBeUndefined());
  it('빈 목록', () => expect(nextToAsk([], openIf(['a']))).toBeUndefined());
});
