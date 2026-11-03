import { describe, expect, it } from 'vitest';
import { evaluate } from './index';
import { nextChallenges, progressLine } from './summary';

const defs = [
  { id: 'a', rule: 'firstRetro', hidden: false, name: '첫 회고' },
  { id: 'b', rule: 'threePaths', hidden: false, name: '세 갈래 길' },
  { id: 'c', rule: 'firstPlaces', hidden: false, name: '처음 가 보는 곳' },
  { id: 'd', rule: 'retry', hidden: true, name: '다시 도전' }
] as const;
const rec = (field: string) => ({ id: field, field, source: 'user' });
const run = (records: unknown[]) => evaluate([...defs], { records: records as never, activities: [], programs: {} });

describe('도전 과제 진행 문장', () => {
  it('아무것도 없으면 회고 하나가 첫걸음이라고 말한다', () => {
    const r = run([]);
    expect(progressLine(r).sentence).toMatch(/회고 하나/);
    expect(nextChallenges(r).map(x => x.def.id)).toEqual(['a', 'b', 'c']);
  });
  it('달성 수와 가장 가까운 과제를 말하고, 기록이 늘면 문장이 바뀐다', () => {
    const one = run([rec('dev')]);
    expect(progressLine(one).sentence).toBe('달성 1개, ‘세 갈래 길’까지 2곳 남았어요');
    const two = run([rec('dev'), rec('ai')]);
    expect(progressLine(two).sentence).toBe('달성 1개, ‘세 갈래 길’까지 1곳 남았어요');
    expect(nextChallenges(two)[0].def.id).toBe('b');
  });
  it('숨은 과제는 이름도 다음 과제에도 넣지 않고 남은 수만 센다', () => {
    const r = run([]);
    expect(nextChallenges(r).some(x => x.def.hidden)).toBe(false);
    expect(progressLine(r).hiddenLeft).toBe(1);
  });
});
