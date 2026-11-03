import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES, SEED_RECORDS } from '../../data/seed';
import { latestRecord, nextDues, recordHeadline, recordSentence, scheduleHeadline, scheduleSentence, todoSentence } from './summary';

const act = (over: object) => ({ ...SEED_ACTIVITIES[0], ...over });

describe('todoSentence', () => {
  it('예시 데이터', () => expect(todoSentence(SEED_ACTIVITIES)).toBe('할 것 3개 중 2개가 이번 주 마감이에요'));
  it('할 것이 없으면', () => expect(todoSentence([])).toBe('지금 할 것이 없어요'));
  it('마감이 멀면', () => expect(todoSentence([act({ due: { label: '마감', dday: 9 } })])).toBe('할 것 1개, 이번 주 마감은 없어요'));
  it('모두 이번 주', () => expect(todoSentence([act({}), act({ id: 'x' })])).toBe('할 것 2개가 모두 이번 주 마감이에요'));
});

describe('nextDues', () => {
  it('가까운 순 두 개, 오늘 마감이 앞', () => expect(nextDues(SEED_ACTIVITIES).map(d => d.id)).toEqual(['a-tutor', 'a-swm']));
  it('끝난 활동은 뺀다', () => expect(nextDues([act({ status: 'ended' })])).toEqual([]));
});

describe('일정 문장', () => {
  it('카드', () => expect(scheduleSentence(SEED_ACTIVITIES)).toBe('진행 중 2개, 신청 준비 2개, 결과 기다림 1개'));
  it('머리 한 줄', () => expect(scheduleHeadline(SEED_ACTIVITIES, '2026-10-13')).toBe('이번 달 마감 2개, 진행 중 2개'));
  it('다음 달로 넘어간 마감은 이번 달이 아니다', () => expect(scheduleHeadline([act({ due: { label: '마감', dday: 25 } })], '2026-10-13')).toBe('이번 달 마감도, 진행 중인 활동도 없어요'));
});

describe('기록 문장', () => {
  it('카드', () => expect(recordSentence(SEED_RECORDS, '2026-2')).toBe('기록 6개, 이번 학기 3개. 가장 최근은 서비스 사용성 테스트'));
  it('기록이 없으면 다음 행동', () => expect(recordSentence([], '2026-2')).toContain('회고'));
  it('새 기록이 가장 최근', () => {
    const fresh = { ...SEED_RECORDS[0], id: 'n', title: '새 회고', semester: '2026-2', date: '2학기 · 10월' };
    expect(latestRecord([...SEED_RECORDS, fresh])?.title).toBe('새 회고');
  });
  it('머리 한 줄', () => expect(recordHeadline(SEED_RECORDS)).toMatch(/^기록 6개 중 \d개가 .+(이에요|예요)$/));
  it('빈 머리 한 줄', () => expect(recordHeadline([])).toBe('아직 기록이 없어요'));
});
