import { describe, expect, it } from 'vitest';
import type { Activity } from '../../domain/types';
import { endedText, meetingOf, mondayOf, retroQueue, rowNote, weekOf, weekTitle } from './week';

const A = (o: Partial<Activity> & Pick<Activity, 'id' | 'status' | 'schedule'>): Activity => ({ title: o.id, field: 'dev', ...o }) as Activity;
const TODAY = '2026-10-13'; // 화요일

describe('weekOf', () => {
  it('월요일부터 일요일까지 7칸, 오늘 칸을 안다', () => {
    const w = weekOf([], TODAY);
    expect(mondayOf(TODAY)).toBe('2026-10-12');
    expect(w.days.map(d => d.name).join('')).toBe('월화수목금토일');
    expect(w.todayIndex).toBe(1);
    expect(weekTitle(w)).toBe('이번 주는 마감도, 하는 활동도 없어요');
  });

  it('이번 주 마감만 줄로 두고, 다음 주 마감은 개수로 센다. D-3 이하만 가깝다', () => {
    const w = weekOf([
      A({ id: 'far', status: 'preparing', schedule: '', due: { label: '신청 마감', dday: 5 } }),
      A({ id: 'now', status: 'preparing', schedule: '', due: { label: '사전 설문 마감', dday: 0 } }),
      A({ id: 'next', status: 'applied', schedule: '', due: { label: '기획서 제출', dday: 9 } })
    ], TODAY);
    expect(w.rows.map(r => r.id)).toEqual(['now', 'far']);
    expect(w.rows.map(r => r.kind === 'due' && r.near)).toEqual([true, false]);
    expect(w.rows[1]).toMatchObject({ day: 6, from: 1 });
    expect(w.laterDues).toBe(1);
    expect(weekTitle(w)).toBe('오늘 마감 1개, 이번 주 마감 2개');
    expect(rowNote(w.rows[0])).toBe('오늘 사전 설문 마감');
    expect(rowNote(w.rows[1])).toBe('신청 마감 D-5');
  });

  it('하는 중은 이번 주 안으로 자르고, 매주 모이는 요일에만 점을 찍는다', () => {
    const w = weekOf([
      A({ id: 'crew', status: 'ongoing', schedule: '9월 15일 ~ 11월 28일 · 매주 화' }),
      A({ id: 'club', status: 'ongoing', schedule: '9월 ~ 12월 · 격주 화' }),
      A({ id: 'short', status: 'ongoing', schedule: '10월 14일 ~ 10월 16일' }),
      A({ id: 'old', status: 'ongoing', schedule: '9월 1일 ~ 9월 30일' })
    ], TODAY);
    expect(w.rows.map(r => r.id)).toEqual(['crew', 'club', 'short']);
    expect(w.rows[0]).toMatchObject({ from: 0, to: 6, meets: [1] });
    expect(w.rows[1]).toMatchObject({ meets: [], every: '격주' });
    expect(w.rows[2]).toMatchObject({ from: 2, to: 4 });
    expect(rowNote(w.rows[1])).toBe('격주 화');
    expect(weekTitle(w)).toBe('이번 주 마감은 없고, 하는 중 3개');
  });

  it('요일 글을 읽는다', () => {
    expect(meetingOf('매주 목')).toEqual({ every: '매주', weekday: 4 });
    expect(meetingOf('11월부터 매주 1회')).toBeUndefined();
    expect(meetingOf('매주 화요일')).toBeUndefined();
  });
});

describe('회고 대기', () => {
  it('먼저 끝난 활동이 앞에 온다', () => {
    const q = retroQueue([
      A({ id: 'b', status: 'ended', schedule: '10월 11일 끝남' }),
      A({ id: 'a', status: 'ended', schedule: '10월 8일 끝남' }),
      A({ id: 'x', status: 'ongoing', schedule: '' })
    ]);
    expect(q.map(a => a.id)).toEqual(['a', 'b']);
    expect(endedText(q[0])).toBe('10월 8일에 끝났어요');
  });
});
