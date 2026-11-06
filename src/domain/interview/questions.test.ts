import { describe, expect, it } from 'vitest';
import { answerChips, answered, canSave, insertChip, nextStep, prevStep, QUESTION_COUNT, QUESTIONS, setAnswer, trimmedCard } from './questions';

describe('질문 넷', () => {
  it('상황, 맡은 일, 한 일, 남은 것 순서로 카드 칸에 들어간다', () => {
    expect(QUESTIONS.map(q => q.key)).toEqual(['situation', 'role', 'action', 'learned']);
    expect(QUESTION_COUNT).toBe(4);
  });
  it('마지막 질문 다음은 미리보기, 미리보기 이전은 마지막 질문', () => {
    expect(nextStep(0)).toBe(1);
    expect(nextStep(3)).toBe('preview');
    expect(prevStep('preview')).toBe(3);
    expect(prevStep(0)).toBe(0);
  });
});

describe('답 고치기와 건너뛰기', () => {
  it('비우면 칸이 사라지고, 쓴 글은 그대로 둔다', () => {
    const c = setAnswer({}, 'role', '발표 ');
    expect(c.role).toBe('발표 ');
    expect(setAnswer(c, 'role', '  ')).toEqual({});
  });
  it('한 칸이라도 답해야 저장한다', () => {
    expect(canSave({})).toBe(false);
    expect(canSave({ result: '본선' })).toBe(false);
    expect(canSave({ action: '코드를 만들었어요' })).toBe(true);
    expect(answered({ situation: 'a', learned: ' ' })).toEqual(['situation']);
  });
  it('저장할 때 앞뒤 공백만 다듬는다', () => {
    expect(trimmedCard({ role: ' 발표 ', action: ' ' })).toEqual({ role: '발표' });
  });
});

describe('답 조각', () => {
  it('상황은 활동 정보 문장을 먼저 두고 유형으로 만든다. 수치는 넣지 않는다', () => {
    const chips = answerChips('situation', { kind: '교내 해커톤', group: 'ai', situation: '교내 해커톤에 참여한 활동' });
    expect(chips[0]).toBe('교내 해커톤에 참여한 활동');
    expect(chips).toContain('교내 해커톤에 팀으로 참여했어요');
    expect(chips.join('')).not.toMatch(/\d/);
  });
  it('상황 정보가 없으면 유형 문장만', () => {
    expect(answerChips('situation', { kind: '학회', group: 'ai' })).toHaveLength(2);
  });
  it('뭉뚱그린 유형은 문장에 넣지 않는다', () => {
    expect(answerChips('situation', { kind: '비교과 활동', group: 'other' })).toEqual(['팀으로 참여했어요', '혼자 참여했어요']);
  });
  it('맡은 일·한 일은 분야에 맞춘다', () => {
    expect(answerChips('role', { kind: 'k', group: 'ai' })).toContain('데이터 전처리를 맡았어요');
    expect(answerChips('action', { kind: 'k', group: 'dev' }).length).toBeGreaterThan(0);
  });
  it('칩은 빈 칸에는 그대로, 쓴 글 뒤에는 이어 붙이고 같은 말은 두 번 넣지 않는다', () => {
    expect(insertChip('', '발표를 맡았어요')).toBe('발표를 맡았어요');
    expect(insertChip('자료 조사', '발표를 맡았어요')).toBe('자료 조사 발표를 맡았어요');
    expect(insertChip('발표를 맡았어요', '발표를 맡았어요')).toBe('발표를 맡았어요');
  });
});
