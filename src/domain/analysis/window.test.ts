import { describe, expect, it } from 'vitest';
import { stepWindow, termWindow } from './window';

const terms = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

describe('termWindow', () => {
  it('기본은 가장 최근 네 칸, 앞에 접힌 수를 센다', () => {
    expect(termWindow(terms)).toEqual({ shown: ['g', 'h', 'i', 'j'], before: 6, after: 0, end: 9 });
  });
  it('칸이 적으면 모두 보여 준다', () => {
    expect(termWindow(['a', 'b'])).toEqual({ shown: ['a', 'b'], before: 0, after: 0, end: 1 });
    expect(termWindow([])).toEqual({ shown: [], before: 0, after: 0, end: -1 });
  });
  it('끝 위치가 범위를 벗어나면 안으로 당긴다', () => {
    expect(termWindow(terms, 4, 1).shown).toEqual(['a', 'b', 'c', 'd']);
    expect(termWindow(terms, 4, 99).shown).toEqual(['g', 'h', 'i', 'j']);
  });
  it('앞으로 넘기면 한 칸 겹쳐 세 칸씩 간다', () => {
    const w = termWindow(terms);
    const back = termWindow(terms, 4, stepWindow(w, -1));
    expect(back.shown).toEqual(['d', 'e', 'f', 'g']);
    expect(back).toMatchObject({ before: 3, after: 3 });
    const first = termWindow(terms, 4, stepWindow(back, -1));
    expect(first).toMatchObject({ shown: ['a', 'b', 'c', 'd'], before: 0 });
    expect(termWindow(terms, 4, stepWindow(first, 1)).shown).toEqual(['d', 'e', 'f', 'g']);
  });
});
