import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { filterRecords, groupBySemester, groupsPresent, semesterKey, semesterLabel } from './archive';

describe('semester', () => {
  it('같은 해 안에서 1학기 < 여름 < 2학기, 해가 큰 쪽이 뒤', () => {
    expect(semesterKey('2026-1')).toBeLessThan(semesterKey('2026-여름'));
    expect(semesterKey('2026-여름')).toBeLessThan(semesterKey('2026-2'));
    expect(semesterKey('2026-2')).toBeLessThan(semesterKey('2027-1'));
  });
  it('이름표', () => {
    expect(semesterLabel('2026-2')).toBe('2026-2학기');
    expect(semesterLabel('2026-여름')).toBe('2026 여름');
  });
});

describe('groupBySemester', () => {
  it('최근 학기부터 묶고, 학기 안에서는 나중에 쓴 기록이 먼저', () => {
    const g = groupBySemester([rec('a', { semester: '2026-1' }), rec('b', { semester: '2026-2' }), rec('c', { semester: '2026-2' }), rec('d', { semester: '2026-여름' })]);
    expect(g.map(x => x.semester)).toEqual(['2026-2', '2026-여름', '2026-1']);
    expect(g[0].items.map(r => r.id)).toEqual(['c', 'b']);
  });
  it('기록이 없으면 빈 목록', () => {
    expect(groupBySemester([])).toEqual([]);
  });
});

describe('filterRecords · groupsPresent', () => {
  const list = [rec('a', { field: 'data', verification: 'school' }), rec('b', { field: 'ai', verification: 'self' }), rec('c', { field: 'research', verification: 'self' })];
  it('분야 묶음과 확인 방식을 함께 건다(data·ai 는 AI·데이터 한 묶음)', () => {
    expect(filterRecords(list, { group: 'ai', verification: 'all' }).map(r => r.id)).toEqual(['a', 'b']);
    expect(filterRecords(list, { group: 'ai', verification: 'self' }).map(r => r.id)).toEqual(['b']);
    expect(filterRecords(list, { group: 'all', verification: 'all' })).toHaveLength(3);
  });
  it('있는 분야 묶음만 정해진 순서로', () => {
    expect(groupsPresent(list)).toEqual(['ai', 'plan']);
  });
});
