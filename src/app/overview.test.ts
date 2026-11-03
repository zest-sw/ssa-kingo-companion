import { describe, expect, it } from 'vitest';
import { createOverviewStore, parseOverview, restoreSel, shouldRestoreScroll } from './overview';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('L1 상태 보존', () => {
  it('메뉴별로 선택과 스크롤을 따로 저장하고 다시 읽는다', () => {
    const kv = memory();
    const a = createOverviewStore(kv);
    a.setSel('activities', { focus: 'a-swm' });
    a.setScroll('activities', 640.4);
    a.setSel('records', 'dev');
    const b = createOverviewStore(kv);
    expect(b.get('activities')).toEqual({ sel: { focus: 'a-swm' }, scrollY: 640 });
    expect(b.get('records').sel).toBe('dev');
    expect(b.get('home')).toEqual({});
  });
  it('지우면 그 메뉴만 빠진다', () => {
    const s = createOverviewStore(memory());
    s.setSel('a', 1); s.setSel('b', 2);
    s.clear('a');
    expect([s.get('a').sel, s.get('b').sel]).toEqual([undefined, 2]);
  });
  it('저장소가 없거나 막혀도 메모리로 돈다', () => {
    const s = createOverviewStore({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    s.setScroll('home', 10);
    expect(s.get('home').scrollY).toBe(10);
    expect(createOverviewStore().get('x')).toEqual({});
  });
  it('깨진 글·이상한 값은 버린다', () => {
    expect(parseOverview('{nope')).toEqual({});
    expect(parseOverview('[1]')).toEqual({});
    expect(parseOverview(JSON.stringify({ a: 3, b: { scrollY: -5, sel: 'x' } }))).toEqual({ b: { sel: 'x', scrollY: undefined } });
  });
});

describe('선택 되살리기', () => {
  it('같은 모양이면 저장한 값, 아니면 처음 값', () => {
    expect(restoreSel({ sel: 'dev' }, 'all')).toBe('dev');
    expect(restoreSel({ sel: 3 }, 'all')).toBe('all');
    expect(restoreSel({ sel: [1] }, { a: 1 })).toEqual({ a: 1 });
    expect(restoreSel({}, 'all')).toBe('all');
  });
  it('검사 함수를 주면 그걸 따른다', () => {
    const isTab = (v: unknown): v is 'board' | 'list' => v === 'board' || v === 'list';
    expect(restoreSel({ sel: 'list' }, 'board', isTab)).toBe('list');
    expect(restoreSel({ sel: 'grid' }, 'board', isTab)).toBe('board');
  });
});

describe('스크롤 되살릴 때', () => {
  it('이 화면 아래 경로에서 돌아올 때만', () => {
    expect(shouldRestoreScroll('activities', { name: 'activities', sub: 'schedule' })).toBe(true);
    expect(shouldRestoreScroll('activities/records', { name: 'activities', sub: 'records/interview/a-1' })).toBe(true);
    expect(shouldRestoreScroll('activities/records', { name: 'activities', sub: 'records' })).toBe(false);
    expect(shouldRestoreScroll('activities/records', { name: 'activities', sub: 'schedule' })).toBe(false);
    expect(shouldRestoreScroll('activities', { name: 'activities' })).toBe(false);
    expect(shouldRestoreScroll('activities', { name: 'home' })).toBe(false);
    expect(shouldRestoreScroll('activities', undefined)).toBe(false);
  });
});
