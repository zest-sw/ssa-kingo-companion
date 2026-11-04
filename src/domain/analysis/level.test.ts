import { describe, expect, it } from 'vitest';
import { prog } from '../fixtures.test-util';
import { levelOf, levelReason, levelWithSource } from './level';

describe('심화 수준(난이도)', () => {
  it('직접 정한 값이 먼저, 그다음 연결된 기회의 난이도', () => {
    expect(levelOf({ title: '발표', level: 1 })).toBe(1);
    expect(levelWithSource({ title: '무엇', programId: 'p' }, { p: prog('p', { level: 2 }) })).toEqual({ level: 2, source: 'program' });
  });
  it('이름 규칙: 입문·기초·멘티는 입문, 튜터·멘토·발표·수상은 심화, 프로젝트·해커톤·대회는 중급, 특강·스터디는 입문', () => {
    expect(levelOf({ title: '웹 개발 입문 캠프' })).toBe(1);
    expect(levelOf({ title: 'SW 학습 멘토링 · 멘티' })).toBe(1);
    expect(levelOf({ title: 'SW 학습 멘토링 · 멘토' })).toBe(3);
    expect(levelOf({ title: '앱 동아리 신입 튜터' })).toBe(3);
    expect(levelOf({ title: '리서치 스터디 결과 발표' })).toBe(3);
    expect(levelOf({ title: 'AI 아이디어 경진대회 수상' })).toBe(3);
    expect(levelOf({ title: '가을 데이터 해커톤' })).toBe(2);
    expect(levelOf({ title: '설문 시각화', kind: '프로젝트' })).toBe(2);
    expect(levelOf({ title: '기획자 직무 특강' })).toBe(1);
    expect(levelOf({ title: '머신러닝 스터디' })).toBe(1);
  });
  it('규칙에 없으면 한 일로, 그것도 없으면 입문', () => {
    expect(levelOf({ title: '무엇', did: 'present' })).toBe(3);
    expect(levelOf({ title: '무엇', did: 'make' })).toBe(2);
    expect(levelOf({ title: '무엇' })).toBe(1);
  });
  it('놓인 이유는 근거를 말한다', () => {
    expect(levelReason({ title: 't', kind: 'k', did: 'listen', level: 3 })).toMatch(/^‘심화’ 수준 활동이라/);
    expect(levelReason({ title: '해커톤', kind: 'k', did: 'listen' })).toMatch(/^이름과 한 일로 보면 ‘중급’/);
  });
});
