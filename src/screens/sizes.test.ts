import { describe, expect, it } from 'vitest';
import { isFlowRoute } from './sizes';

describe('isFlowRoute', () => {
  it('신청 준비와 회고 인터뷰만 흐름 화면', () => {
    expect(isFlowRoute({ name: 'recommend', sub: 'prepare/p-interview' })).toBe(true);
    expect(isFlowRoute({ name: 'activities', sub: 'records/interview' })).toBe(true);
    expect(isFlowRoute({ name: 'activities', sub: 'records/interview/a-hackathon' })).toBe(true);
    expect(isFlowRoute({ name: 'recommend' })).toBe(false);
    expect(isFlowRoute({ name: 'activities', sub: 'records' })).toBe(false);
    expect(isFlowRoute({ name: 'analysis', sub: 'map' })).toBe(false);
    expect(isFlowRoute({ name: 'home' })).toBe(false);
  });
});
