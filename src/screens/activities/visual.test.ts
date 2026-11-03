import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES, SEED_RECORDS } from '../../data/seed';
import { miniGantt, recordGrid, recordKeyword, retroCount, scheduleKeyword, statusBars, weekHeadline, weekOf } from './visual';

const act = (over: object) => ({ ...SEED_ACTIVITIES[0], ...over });

describe('내 활동 요약 그림', () => {
  it('상태 막대는 할 것·하는 중·끝난 것 개수', () => {
    expect(statusBars(SEED_ACTIVITIES).map(b => [b.label, b.count])).toEqual([['할 것', 3], ['하는 중', 2], ['끝난 것', 3]]);
    expect(statusBars([]).every(b => b.count === 0)).toBe(true);
  });
  it('이번 주 타임라인은 오늘부터 7일이고 마감 점은 이번 주 안의 것만 찍는다', () => {
    const w = weekOf(SEED_ACTIVITIES, '2026-10-13');
    expect(w.days).toHaveLength(7);
    expect(w.days[0]).toMatchObject({ label: '오늘', today: true });
    expect(w.days[1].label).toBe('수');
    expect(w.dues.map(d => d.dday)).toEqual([0, 5]);
    expect(weekHeadline(w)).toBe('이번 주 마감 2');
    const far = weekOf([act({ due: { label: '마감', dday: 9 } })], '2026-10-13');
    expect(far.dues).toEqual([]);
    expect(far.farther).toBe(1);
    expect(weekHeadline(far)).toBe('이번 주 마감 없음');
  });
  it('회고 대기는 끝난 활동 수', () => expect(retroCount(SEED_ACTIVITIES)).toBe(1));
  it('축소 간트는 진행 중부터 3줄이고 비율은 0~1', () => {
    const g = miniGantt(SEED_ACTIVITIES, '2026-10-13');
    expect(g.bars).toHaveLength(3);
    expect(g.bars[0].state).toBe('active');
    for (const b of g.bars) { expect(b.left).toBeGreaterThanOrEqual(0); expect(b.left + b.width).toBeLessThanOrEqual(1.0001); }
    expect(g.today).toBeGreaterThan(0);
    expect(miniGantt([]).bars).toEqual([]);
  });
  it('일정 키워드', () => {
    expect(scheduleKeyword(SEED_ACTIVITIES)).toBe('진행 중 2 · 신청 준비·대기 3');
    expect(scheduleKeyword([])).toBe('지금 하는 활동 없음');
  });
  it('기록 격자는 학기 열 × 분야 행이고 개수를 센다', () => {
    const g = recordGrid(SEED_RECORDS);
    expect(g.total).toBe(6);
    expect(g.rows.reduce((n, r) => n + r.counts.reduce((a, b) => a + b, 0), 0)).toBe(6);
    expect(g.semesters.map(s => s.label)).toEqual(['26-1', '26 여름', '26-2']);
    expect(recordGrid([]).rows).toEqual([]);
  });
  it('기록 키워드', () => {
    expect(recordKeyword(SEED_RECORDS, '2026-2')).toBe('2026-2학기 3개');
    expect(recordKeyword([], '2026-2')).toBe('회고를 쓰면 쌓여요');
  });
});
