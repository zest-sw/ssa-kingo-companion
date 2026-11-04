import { describe, expect, it } from 'vitest';
import { evaluate } from './index';
import { nextChallenges, progressKeyword } from './summary';

const defs = [
  { id: 'a', rule: 'firstRetro', hidden: false, name: '첫 회고' },
  { id: 'b', rule: 'threePaths', hidden: false, name: '세 갈래 길' },
  { id: 'c', rule: 'firstPlaces', hidden: false, name: '처음 가 보는 곳' },
  { id: 'd', rule: 'retry', hidden: true, name: '다시 도전' }
] as const;
const rec = (field: string) => ({ id: field, field, source: 'user' });
const run = (records: unknown[]) => evaluate([...defs], { records: records as never, activities: [], programs: {} });

describe('도전 과제 진행 키워드', () => {
  it('아무것도 없으면 회고 하나가 첫걸음이라고 말한다', () => {
    const r = run([]);
    expect(nextChallenges(r).map(x => x.def.id)).toEqual(['a', 'b', 'c']);
  });
  it('달성 수와 가장 가까운 과제를 말하고, 기록이 늘면 문장이 바뀐다', () => {
    const one = run([rec('dev')]);
    const two = run([rec('dev'), rec('ai')]);
    expect(nextChallenges(two)[0].def.id).toBe('b');
  });
  it('숨은 과제는 다음 과제에 넣지 않는다', () => {
    const r = run([]);
    expect(nextChallenges(r).some(x => x.def.hidden)).toBe(false);
  });
  it('키워드는 달성 수와 가장 가까운 과제를 짧게 말한다', () => {
    expect(progressKeyword(run([]))).toBe('회고 하나로 첫 달성');
    expect(progressKeyword(run([rec('dev')]))).toBe('달성 1 · ‘세 갈래 길’ 2곳 남음');
    expect(progressKeyword(run([rec('dev'), rec('ai')]))).toBe('달성 1 · ‘세 갈래 길’ 1곳 남음');
  });
});
