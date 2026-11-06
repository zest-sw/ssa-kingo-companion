import { describe, expect, it } from 'vitest';
import { evaluate } from './index';
import { challengeTrack, nextChallenges } from './summary';

const defs = [
  { id: 'a', rule: 'firstRetro', hidden: false, name: '첫 회고', condition: '활동이 끝난 뒤 회고 쓰기' },
  { id: 'b', rule: 'threePaths', hidden: false, name: '세 갈래 길' },
  { id: 'c', rule: 'firstPlaces', hidden: false, name: '처음 가 보는 곳' },
  { id: 'd', rule: 'retry', hidden: true, name: '다시 도전' }
] as const;
const rec = (field: string) => ({ id: field, field, source: 'user' });
const run = (records: unknown[]) => evaluate([...defs], { records: records as never, activities: [], programs: {} });

describe('다음 도전 과제', () => {
  it('아무것도 없으면 드러난 과제를 순서대로', () => {
    expect(nextChallenges(run([])).map(x => x.def.id)).toEqual(['a', 'b', 'c']);
  });
  it('진행 중인 과제가 먼저 온다', () => {
    expect(nextChallenges(run([rec('dev'), rec('ai')]))[0].def.id).toBe('b');
  });
  it('숨은 과제는 다음 과제에 넣지 않는다', () => {
    expect(nextChallenges(run([])).some(x => x.def.hidden)).toBe(false);
  });
});

describe('도전 과제 진행 그림', () => {
  it('달성 수와 다음 과제, 열리는 때', () => {
    expect(challengeTrack(run([]))).toEqual({ done: 0, next: { name: '첫 회고', when: '활동이 끝난 뒤 회고 쓰기' } });
    expect(challengeTrack(run([rec('dev')]))).toEqual({ done: 1, next: { name: '세 갈래 길', when: '2곳 더 하면 열려요' } });
    expect(challengeTrack(run([rec('dev'), rec('ai')])).next?.when).toBe('1곳 더 하면 열려요');
  });
  it('정해진 날이 있으면 그 날을 말하고, 다 이루면 다음이 없다', () => {
    const dated = evaluate([{ id: 's', rule: 'semesterReview', hidden: false, name: '한 학기 돌아보기', note: '12월에 열려요' }], { records: [], activities: [], programs: {} });
    expect(challengeTrack(dated).next).toEqual({ name: '한 학기 돌아보기', when: '12월에 열려요' });
    const all = evaluate([{ id: 'a', rule: 'firstRetro', hidden: false, name: '첫 회고' }], { records: [rec('dev')] as never, activities: [], programs: {} });
    expect(challengeTrack(all)).toEqual({ done: 1 });
  });
});
