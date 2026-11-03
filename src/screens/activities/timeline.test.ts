import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES } from '../../data/seed';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { addDays, clipRows, columnCounts, monthRange, parseSchedule, timelineOf } from './timeline';

describe('parseSchedule', () => {
  it('날짜 범위', () => expect(parseSchedule('9월 4일 ~ 12월 10일 · 매주 목')).toEqual({ start: '2026-09-04', end: '2026-12-10' }));
  it('달 범위는 달 끝까지', () => expect(parseSchedule('9월 ~ 12월 · 격주 화')).toEqual({ start: '2026-09-01', end: '2026-12-31' }));
  it('끝남은 그날 하루', () => expect(parseSchedule('10월 11일 끝남')).toEqual({ start: '2026-10-11', end: '2026-10-11' }));
  it('카탈로그 일정: 하루짜리와 N주', () => {
    expect(parseSchedule('10.14(수) 18:30')).toEqual({ start: '2026-10-14', end: '2026-10-14' });
    expect(parseSchedule('10.20(화)부터 4주')).toEqual({ start: '2026-10-20', end: '2026-11-16' });
  });
  it('결과 발표', () => expect(parseSchedule('결과 발표 10월 30일')).toEqual({ result: '2026-10-30' }));
  it('○월부터는 시작만', () => expect(parseSchedule('11월부터 매주 1회')).toEqual({ start: '2026-11-01' }));
  it('다른 해는 읽지 않는다', () => expect(parseSchedule('연수 2027년 1월부터')).toEqual({}));
  it('읽을 날짜가 없으면 빈 값', () => expect(parseSchedule('다음 모집 2027-1학기')).toEqual({}));
});

describe('addDays', () => {
  it('달을 넘긴다', () => expect(addDays('2026-10-30', 3)).toBe('2026-11-02'));
});

describe('timelineOf', () => {
  const { rows, undated } = timelineOf(SEED_ACTIVITIES);

  it('모든 활동이 행이나 날짜 미정 중 한 곳에 한 번 있다', () => {
    const ids = [...rows.map(r => r.id), ...undated.map(a => a.id)].sort();
    expect(ids).toEqual(SEED_ACTIVITIES.map(a => a.id).sort());
  });
  it('기간 없는 활동은 날짜 미정', () => expect(undated.map(a => a.id).sort()).toEqual(['a-dataviz', 'a-exchange']));
  it('신청 준비는 오늘부터 마감까지, 마감 ◆ 가 끝에 있다', () => {
    const swm = rows.find(r => r.id === 'a-swm');
    expect(swm).toMatchObject({ start: PROTOTYPE_TODAY, end: '2026-10-18', deadline: '2026-10-18', state: 'prep' });
  });
  it('결과 대기는 오늘부터 발표일까지, 발표 ○ 가 있다', () => {
    expect(rows.find(r => r.id === 'a-global-camp')).toMatchObject({ start: PROTOTYPE_TODAY, end: '2026-10-30', result: '2026-10-30', state: 'prep' });
  });
  it('진행 중·끝남은 모양이 다르다', () => {
    expect(rows.find(r => r.id === 'a-ai-club')?.state).toBe('active');
    expect(rows.find(r => r.id === 'a-hackathon')?.state).toBe('done');
  });
  it('활동이 없으면 둘 다 비어 있다', () => expect(timelineOf([])).toEqual({ rows: [], undated: [] }));
});

describe('columnCounts', () => {
  it('보드 세 칸 개수', () => expect(columnCounts(SEED_ACTIVITIES)).toEqual({ todo: 3, doing: 2, done: 3 }));
});

describe('monthRange', () => {
  it('오늘이 속한 달의 첫날과 끝날', () => expect(monthRange('2026-10-13')).toEqual({ start: '2026-10-01', end: '2026-10-31' }));
  it('2월은 28일까지', () => expect(monthRange('2027-02-03')).toEqual({ start: '2027-02-01', end: '2027-02-28' }));
});

describe('clipRows', () => {
  const { rows } = timelineOf(SEED_ACTIVITIES);
  const oct = monthRange(PROTOTYPE_TODAY);
  it('범위 밖 막대는 빼고, 걸친 막대는 범위 안으로 자른다', () => {
    const { rows: out } = clipRows(rows, oct, 9);
    expect(out.every(r => r.start >= oct.start && r.end <= oct.end)).toBe(true);
    expect(out.find(r => r.id === 'a-ai-club')).toMatchObject({ start: '2026-10-01', end: '2026-10-31' });
  });
  it('범위 밖 마감 표시는 지운다', () => {
    const one = [{ id: 'x', label: 'x', start: '2026-10-20', end: '2026-11-10', state: 'prep' as const, deadline: '2026-11-10' }];
    expect(clipRows(one, oct).rows[0].deadline).toBeUndefined();
  });
  it('limit 을 넘으면 끝난 활동부터 빼고 빠진 수를 알린다', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, label: `r${i}`, start: '2026-10-05', end: '2026-10-06', state: i < 2 ? ('done' as const) : ('active' as const) }));
    const out = clipRows(many, oct, 5);
    expect(out.hidden).toBe(2);
    expect(out.rows.map(r => r.id)).toEqual(['r2', 'r3', 'r4', 'r5', 'r6']);
  });
  it('limit 이하면 그대로', () => expect(clipRows([], oct)).toEqual({ rows: [], hidden: 0 }));
});
