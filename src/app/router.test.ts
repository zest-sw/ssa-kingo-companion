import { describe, expect, it } from 'vitest';
import { parseHash } from './router';

describe('parseHash', () => {
  it('화면 이름과 하위 경로를 나눈다', () => {
    expect(parseHash('#/analysis/techtree')).toEqual({ name: 'analysis', sub: 'techtree' });
    expect(parseHash('#/records/interview/a-hackathon')).toEqual({ name: 'records', sub: 'interview/a-hackathon' });
    expect(parseHash('#/friends')).toEqual({ name: 'friends', sub: undefined });
    expect(parseHash('#/friends/')).toEqual({ name: 'friends', sub: undefined });
  });
  it('빈 경로·모르는 경로는 홈, 하위 경로도 버린다', () => {
    expect(parseHash('')).toEqual({ name: 'home', sub: undefined });
    expect(parseHash('#/nope/x')).toEqual({ name: 'home', sub: undefined });
  });
  it('컴포넌트 목록', () => {
    expect(parseHash('#/_kit')).toEqual({ name: '_kit', sub: undefined });
  });
});
