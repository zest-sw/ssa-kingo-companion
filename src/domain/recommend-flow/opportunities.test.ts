import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import type { Program } from '../types';
import { categoryCounts, categoryOf, groupedGains, inCategory, openPrograms, rowGains, sortOpen } from './opportunities';
import { ddayOf } from '../recommend';

const base = CATALOG.programs[0];
const mk = (over: Partial<Program>): Program => ({ ...base, ...over });

describe('전체 기회', () => {
  it('예시 데이터: 열린 기회 25~35개, 종류마다 2~5개, 얻는 것이 모두 있다', () => {
    const open = openPrograms(CATALOG.programs, 1);
    expect(open.length).toBeGreaterThanOrEqual(25);
    expect(open.length).toBeLessThanOrEqual(35);
    for (const c of categoryCounts(open).slice(1)) {
      expect(c.count, c.label).toBeGreaterThanOrEqual(2);
      expect(c.count, c.label).toBeLessThanOrEqual(5);
    }
    expect(open.every(p => (p.gains ?? []).length >= 2)).toBe(true);
    expect(open.filter(p => p.category === 'job').length).toBeGreaterThanOrEqual(2);
  });

  it('마감 지난 것과 다른 주 것은 빼고, 신청 대상이 아닌 것은 남긴다', () => {
    const list = [mk({ id: 'a', ddayW1: -1 }), mk({ id: 'b', weeks: [2] }), mk({ id: 'c', eligible: false, ddayW1: 2, weeks: [1] })];
    expect(openPrograms(list, 1).map(p => p.id)).toEqual(['c']);
  });

  it('칩: 전체 + 있는 종류만, 정해진 순서', () => {
    const list = [mk({ id: 'a', category: 'global' }), mk({ id: 'b', category: 'job' }), mk({ id: 'c', category: 'job' }), mk({ id: 'd', category: undefined })];
    expect(categoryCounts(list)).toEqual([
      { id: 'all', label: '전체', count: 4 }, { id: 'job', label: '채용', count: 2 }, { id: 'edu', label: '교육·캠프', count: 1 }, { id: 'global', label: '글로벌', count: 1 }
    ]);
    expect(categoryOf(list[3])).toBe('edu');
    expect(list.filter(p => inCategory(p, 'job')).map(p => p.id)).toEqual(['b', 'c']);
    expect(list.filter(p => inCategory(p, 'all'))).toHaveLength(4);
  });

  it('정렬: 마감순, 새로 열린 순(같으면 마감순)', () => {
    const list = [mk({ id: 'a', title: 'a', ddayW1: 9, openedW1: 0 }), mk({ id: 'b', title: 'b', ddayW1: 2, openedW1: 5 }), mk({ id: 'c', title: 'c', ddayW1: 5, openedW1: 0 })];
    expect(sortOpen(list, 1, 'deadline').map(p => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortOpen(list, 1, 'new').map(p => p.id)).toEqual(['c', 'a', 'b']);
    const open = sortOpen(openPrograms(CATALOG.programs, 1), 1, 'deadline');
    expect(open.every((p, i) => i === 0 || ddayOf(open[i - 1], 1) <= ddayOf(p, 1))).toBe(true);
  });

  it('얻는 것: 행에는 종류가 다른 것 최대 3개(상금·채용·증명 먼저), 모달에는 전부 묶어서', () => {
    const p = mk({ gains: [{ kind: 'skill', label: '협업' }, { kind: 'skill', label: '발표' }, { kind: 'people', label: '팀' }, { kind: 'money', label: '상금 10만 원' }, { kind: 'output', label: '시안' }] });
    expect(rowGains(p).map(g => g.label)).toEqual(['상금 10만 원', '시안', '팀']);
    expect(rowGains(p, 2)).toHaveLength(2);
    expect(groupedGains(p).map(x => [x.kind, x.items.length])).toEqual([['money', 1], ['output', 1], ['people', 1], ['skill', 2]]);
    expect(rowGains(mk({ gains: undefined }))).toEqual([]);
  });
});
