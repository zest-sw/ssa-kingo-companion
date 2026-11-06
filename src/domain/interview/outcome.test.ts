import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { analysisTarget, interviewRecord, savedChanges } from './outcome';
import type { NewRecordInput } from './record';

const base: NewRecordInput = {
  activityId: 'a1', title: '해커톤', field: 'data', kind: '교내 해커톤', verification: 'school', date: 'd', semester: '2026-2',
  card: { role: '데이터 전처리', action: '결측치 정리 코드를 만들어 팀이 함께 썼어요' }, energy: 'up', visibility: 'me', useForRecommend: true
};

describe('interviewRecord', () => {
  it('맡은 일·한 일이 있으면 역량 근거를 붙인다', () => {
    expect(interviewRecord(base).axes.length).toBeGreaterThan(0);
  });
  it('둘 다 건너뛰면 근거를 지어 붙이지 않는다', () => {
    expect(interviewRecord({ ...base, card: { situation: '해커톤' } }).axes).toEqual([]);
  });
});

describe('savedChanges', () => {
  it('첫 기록이면 근거가 처음 생겼다고 말하고, 확인 전이라 추정으로 표시한다', () => {
    const r = interviewRecord(base);
    const [ev, next] = savedChanges([], r);
    expect(ev.text).toMatch(/근거가 처음 생겼어요/);
    expect(ev.estimate).toBe(true);
    expect(next.text).toBe('다음 추천에 이 기록을 반영해요.');
  });
  it('이미 같은 근거가 있으면 +1', () => {
    const r = interviewRecord(base);
    const before = [rec('r0', { axes: r.axes })];
    expect(savedChanges(before, r)[0].text).toMatch(/근거 \+1$/);
  });
  it('아니에요라고 한 근거는 이전 근거로 세지 않는다', () => {
    const r = interviewRecord(base);
    const before = [rec('r0', { axes: r.axes, rejectedAxes: r.axes })];
    expect(savedChanges(before, r)[0].text).toMatch(/처음/);
  });
  it('근거가 없으면 한 일을 채우라고 안내한다(추정 아님)', () => {
    const r = interviewRecord({ ...base, card: { situation: '해커톤' } });
    expect(savedChanges([], r)[0]).toEqual({ text: '한 일을 채우면 역량 근거가 생겨요.', estimate: false });
  });
  it('추천에 쓰지 않으면 그렇게 말한다', () => {
    const r = interviewRecord({ ...base, useForRecommend: false });
    expect(savedChanges([], r)[1].text).toBe('추천과 발견에는 쓰지 않는 기록이에요.');
  });
  it('새 발견 후보가 생기면 그 수를 추정으로 알리고 분석 요약으로 보낸다', () => {
    const before = [rec('r1', { did: 'make', energy: 'up' })];
    const r = interviewRecord(base);
    expect(savedChanges(before, r)[1]).toEqual({ text: '새 발견 후보가 1개 생겼어요.', estimate: true });
    expect(analysisTarget(before, r)).toBe('analysis');
  });
  it('발견이 없으면 나의 강점으로 보낸다', () => {
    expect(analysisTarget([], interviewRecord(base))).toBe('analysis/strengths');
  });
});
