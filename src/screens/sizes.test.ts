import { describe, expect, it } from 'vitest';
import { isFlowRoute, skeletonOf } from './sizes';

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

describe('skeletonOf', () => {
  it('경로마다 실제 첫 모양을 고른다', () => {
    expect(skeletonOf({ name: 'recommend' })).toBe('list');
    expect(skeletonOf({ name: 'recommend', sub: 'open/p-interview' })).toBe('list');
    expect(skeletonOf({ name: 'recommend', sub: 'prepare/p-interview' })).toBe('flow');
    expect(skeletonOf({ name: 'activities', sub: 'records/interview/a-hackathon' })).toBe('flow');
    expect(skeletonOf({ name: 'activities' })).toBe('week');
    expect(skeletonOf({ name: 'activities', sub: 'schedule/board' })).toBe('panel');
    expect(skeletonOf({ name: 'activities', sub: 'records' })).toBe('panel');
    expect(skeletonOf({ name: 'analysis' })).toBe('side');
    expect(skeletonOf({ name: 'analysis', sub: 'map' })).toBe('panel');
    expect(skeletonOf({ name: 'analysis', sub: 'strengths' })).toBe('split');
    expect(skeletonOf({ name: 'profile' })).toBe('split');
    expect(skeletonOf({ name: 'profile', sub: 'hall' })).toBe('panel');
    expect(skeletonOf({ name: 'settings', sub: 'data' })).toBe('nav');
  });
});
