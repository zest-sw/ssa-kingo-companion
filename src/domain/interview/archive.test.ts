import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { axesPresent, filterRecords, groupBySemester, groupsPresent, isFiltered, NO_FILTER, previewOf, semesterKey, semesterLabel, semestersPresent } from './archive';

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
    expect(filterRecords(list, { ...NO_FILTER, group: 'ai' }).map(r => r.id)).toEqual(['a', 'b']);
    expect(filterRecords(list, { ...NO_FILTER, group: 'ai', verification: 'self' }).map(r => r.id)).toEqual(['b']);
    expect(filterRecords(list, NO_FILTER)).toHaveLength(3);
  });
  it('있는 분야 묶음만 정해진 순서로', () => {
    expect(groupsPresent(list)).toEqual(['ai', 'plan']);
  });
});

describe('학기·역량 거르기', () => {
  const list = [rec('a', { semester: '2026-1', axes: ['communication', 'self'], rejectedAxes: ['self'] }), rec('b', { semester: '2026-2', axes: ['self'] }), rec('c', { semester: '2025-2', axes: [] })];
  it('학기와 역량을 함께 걸고, 아니에요 한 역량으로는 걸리지 않는다', () => {
    expect(filterRecords(list, { ...NO_FILTER, axis: 'self' }).map(r => r.id)).toEqual(['b']);
    expect(filterRecords(list, { ...NO_FILTER, semester: '2026-1', axis: 'communication' }).map(r => r.id)).toEqual(['a']);
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, axis: 'self' })).toBe(true);
  });
  it('있는 학기는 최근부터, 있는 역량은 역량 표 순서로', () => {
    expect(semestersPresent(list)).toEqual(['2026-2', '2026-1', '2025-2']);
    expect(axesPresent(list)).toEqual(['communication', 'self']);
  });
});

describe('previewOf', () => {
  it('회고 기록: 역할·배운 점·다음·결과 순으로 비지 않은 두 줄', () => {
    const r = rec('a', { card: { role: '발표', result: '본선', next: '스터디' } });
    expect(previewOf(r)).toEqual([['역할', '발표'], ['다음', '스터디']]);
  });
  it('회고가 없는 기록: 한 일·한마디', () => {
    expect(previewOf(rec('b', { note: '메모', quote: '한마디' }))).toEqual([['한 일', '메모'], ['한마디', '한마디']]);
    expect(previewOf(rec('c', { note: '', quote: '' }))).toEqual([]);
  });
});
