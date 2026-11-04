import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import { skippedRecord } from '../interview/record';
import type { Activity, Funnel } from '../types';
import { laterChoices } from './flow';
import { myWeekCount, TIGHT_AT, weekLoad } from './load';
import { agentLine, hasRetro, semesterTally } from './summary';

// 오늘은 10.13(1주차 첫날). 이번 주 = 10.13~10.19.
const act = (over: Partial<Activity>): Activity => ({ id: over.id ?? 'a', title: 'A', field: 'dev', status: 'applied', schedule: '', ...over });
const funnel = (over: Partial<Funnel> = {}): Funnel => ({ pool: 24, open: 20, eligible: 12, fit: 7, fresh: 5, ...over });

describe('weekLoad: 이번 주 내 일정에 비춘 여유/빠듯', () => {
  it('이번 주 모임과 신청 마감만 센다. 다음 주와 끝난 활동은 세지 않는다', () => {
    const list = [
      act({ id: '1', schedule: '10.14(수) 18:30' }),
      act({ id: '2', status: 'preparing', due: { label: 'D-2', dday: 2 } }),
      act({ id: '3', schedule: '10.25(일)' }),
      act({ id: '4', status: 'ended', schedule: '10.15(목)' }),
      act({ id: '5', status: 'preparing', due: { label: 'D-9', dday: 9 } })
    ];
    expect(myWeekCount(list, 1)).toBe(2);
  });
  it('일정이 적으면 여유, 기준 개수 이상이면 빠듯', () => {
    const few = [act({ id: '1', schedule: '10.14(수)' })];
    expect(weekLoad(prog('p', { when: '10.20(화)' }), few, 1)).toEqual({ tight: false, label: '여유', why: '이번 주 내 일정 1개' });
    const many = Array.from({ length: TIGHT_AT }, (_, n) => act({ id: `m${n}`, schedule: '10.16(금)' }));
    expect(weekLoad(prog('p', { when: '10.20(화)' }), many, 1).label).toBe('빠듯');
  });
  it('내 일정과 시간이 겹치면 개수와 상관없이 빠듯', () => {
    const l = weekLoad(prog('p', { when: '10.14(수)' }), [act({ id: 'x', programId: 'q', status: 'applied', schedule: '10.14(수)' })], 1);
    expect(l).toMatchObject({ tight: true, why: '내 일정과 시간이 겹쳐요' });
  });
  it('이 후보로 만든 활동은 내 일정에서 뺀다', () => {
    expect(weekLoad(prog('p'), [act({ programId: 'p', status: 'preparing', due: { label: '', dday: 1 } })], 1).why).toBe('이번 주 내 일정이 없어요');
  });
});

describe('agentLine: 에이전트가 해 둔 일', () => {
  it('읽은 모집글과 골라 둔 수', () => {
    expect(agentLine(funnel(), [])).toBe('모집글 24개를 읽고 7개를 골라 뒀어요');
  });
  it('대상 확인·일정 등록을 해 둔 준비 활동이 있으면 붙인다', () => {
    const a = act({ status: 'preparing', prepItems: [{ id: 'target', label: '신청 대상 확인', by: 'agent', done: true, at: '09:00' }] });
    expect(agentLine(funnel(), [a])).toBe('모집글 24개를 읽고 7개를 골라 뒀어요 · 신청 준비 1개 챙기는 중');
  });
  it('모집글이 없으면 없다', () => {
    expect(agentLine(funnel({ pool: 0 }), [])).toBeUndefined();
  });
});

describe('semesterTally: 쌓이는 숫자', () => {
  const T = '2026-2';
  it('이번 학기 활동(하는 중·끝남·기록됨)과 이번 학기 회고를 센다. 지난 학기 기록은 세지 않는다', () => {
    const list = [act({ id: '1', status: 'ongoing' }), act({ id: '2', status: 'ended' }), act({ id: '3', status: 'recorded' }), act({ id: '4', status: 'preparing' })];
    const records = [rec('e1', { note: '메모' }), rec('e2', { quote: '한마디' }), rec('old', { semester: '2025-1', note: '메모' })];
    expect(semesterTally(list, records, T)).toBe('이번 학기 활동 3개 · 회고 2개');
  });
  it('예시 데이터처럼 칸 없이 메모만 있는 기록은 회고한 것, 사실만 남긴 기록은 아니다', () => {
    const skipped = skippedRecord({ activityId: 's', title: 'S', field: 'dev', kind: 'k', verification: 'self', date: 'd', semester: T, card: { situation: '상황' } });
    expect(hasRetro(skipped)).toBe(false);
    expect(hasRetro(rec('seed', { note: '관찰하고 물었다' }))).toBe(true);
    expect(hasRetro({ ...skipped, card: { situation: '상황', learned: '배움' } })).toBe(true);
  });
  it('활동이 없으면 없다', () => {
    expect(semesterTally([act({ status: 'preparing' })], [], T)).toBeUndefined();
  });
});

describe('skippedRecord: 회고 없이 남기는 기록', () => {
  it('사실만 남기고 역량 근거를 만들지 않으며 추천에 쓰지 않는다', () => {
    const r = skippedRecord({ activityId: 'a1', title: '해커톤', field: 'dev', kind: '교내 해커톤', verification: 'school', date: '2학기 · 10월', semester: '2026-2', card: { situation: '24시간, 4인 팀' } });
    expect(r).toMatchObject({ id: 'r-a1', title: '해커톤', axes: [], useForRecommend: false, visibility: 'me', verification: 'school', card: { situation: '24시간, 4인 팀' } });
  });
});

describe('laterChoices: 나중에 보기 다시 볼 날', () => {
  it('마감이 멀면 내일 / 다음 주 / 마감 3일 전', () => {
    expect(laterChoices(14).map(c => [c.label, c.days])).toEqual([['내일', 1], ['다음 주', 7], ['마감 3일 전', 11]]);
  });
  it('마감 뒤로 미루지 않는다: 마감 전날까지 다시 보이는 날만, 같은 날은 하나', () => {
    expect(laterChoices(5).map(c => c.label)).toEqual(['내일', '마감 3일 전']);
    expect(laterChoices(4).map(c => c.label)).toEqual(['내일']);
    expect(laterChoices(1)).toEqual([]);
  });
});
