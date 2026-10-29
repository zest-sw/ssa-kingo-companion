import { describe, expect, it } from 'vitest';
import { answer, editField, firstMissing, startInterview, stepStatuses } from './engine';
import { FOLLOW_UP, QUESTION } from './schema';

const T = '해커톤';
const start = () => startInterview(T, '24시간 교내 해커톤, 4인 팀').state;

describe('startInterview', () => {
  it('상황이 있으면 먼저 채우고 역할부터 묻는다', () => {
    const t = startInterview('가을 데이터 해커톤', '24시간 교내 해커톤, 4인 팀');
    expect(t.state.card.situation).toBe('24시간 교내 해커톤, 4인 팀');
    expect(t.state.step).toBe('role');
    expect(t.replies.at(-1)).toBe(QUESTION.role('가을 데이터 해커톤'));
  });
  it('상황이 없으면 상황부터 묻는다', () => {
    const t = startInterview('창업 동아리');
    expect(t.state.card).toEqual({});
    expect(t.state.step).toBe('situation');
    expect(t.replies.at(-1)).toBe('창업 동아리는 어떤 활동이었어요? 한 줄로 알려 주세요.');
  });
});

describe('answer', () => {
  it('짧은 답은 한 번만 되묻고, 이어 받은 말을 덧붙인다', () => {
    const s1 = answer(start(), T, '네', 'typed');
    expect(s1.state.step).toBe('role');
    expect(s1.replies).toEqual([FOLLOW_UP.role]);
    const s2 = answer(s1.state, T, '데이터 전처리', 'typed');
    expect(s2.state.card.role).toBe('네 데이터 전처리');
    expect(s2.state.step).toBe('action');
  });
  it('같은 단계에서 두 번 되묻지 않는다', () => {
    const s1 = answer(start(), T, '네', 'typed');
    const s2 = answer(s1.state, T, '응', 'typed');
    expect(s2.state.step).toBe('action');
    expect(s2.state.followedUp).toEqual(['role']);
  });
  it('충분히 긴 답은 바로 다음 단계로 간다', () => {
    const s = answer(start(), T, '데이터 전처리, 발표', 'typed');
    expect(s.state.step).toBe('action');
    expect(s.replies).toEqual([QUESTION.action(T)]);
  });
  it('빠른 답 칩은 짧아도 되묻지 않는다', () => {
    const s = answer(start(), T, '발표', 'chip');
    expect(s.state.step).toBe('action');
    expect(s.state.card.role).toBe('발표');
  });
  it('수치는 학생이 말한 것만 적는다', () => {
    let s = start();
    s = answer(s, T, '데이터 전처리를 맡았어요', 'typed').state;
    s = answer(s, T, '결측치를 정리하는 코드를 짜서 팀이 같이 썼어요', 'typed').state;
    s = answer(s, T, '본선에 진출했어요', 'typed').state;
    expect(s.card.result).toBe('본선에 진출했어요');
    expect(s.card.result).not.toMatch(/\d/);
  });
  it('빈 입력은 무시한다', () => {
    const s = start();
    expect(answer(s, T, '   ', 'typed')).toEqual({ state: s, replies: [] });
  });
  it('여섯 칸이 차면 review 로 가고 더는 받지 않는다', () => {
    let s = start();
    for (const t of ['데이터 전처리, 발표', '결측치 정리 코드를 만들어 팀이 함께 썼다', '본선 진출', '데이터 품질이 먼저다 싶었다', '시각화 스터디 찾아보기']) s = answer(s, T, t, 'typed').state;
    expect(s.step).toBe('review');
    expect(firstMissing(s.card)).toBe('review');
    expect(answer(s, T, '더 할 말', 'typed').state).toBe(s);
  });
});

describe('editField · stepStatuses', () => {
  it('고치면 그 칸만 바뀌고 비우면 빈다', () => {
    const s = start();
    expect(editField(s, 'situation', ' 고친 상황 ').card.situation).toBe('고친 상황');
    expect(editField(s, 'situation', '').card.situation).toBeUndefined();
  });
  it('단계 칩: 앞은 done, 지금은 current, 뒤는 todo', () => {
    const st = stepStatuses(start());
    expect([st.situation, st.role, st.action, st.review]).toEqual(['done', 'current', 'todo', 'todo']);
  });
});
