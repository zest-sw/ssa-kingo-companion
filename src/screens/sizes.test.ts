import { describe, expect, it } from 'vitest';
import { frameOf } from './sizes';

describe('frameOf', () => {
  it('카드 화면은 최대 폭, 흐름 화면은 가운데 한 칸, 그림 화면은 전체 폭', () => {
    expect(frameOf({ name: 'home' })).toBe('cap');
    expect(frameOf({ name: 'recommend' })).toBe('cap');
    expect(frameOf({ name: 'profile', sub: 'friends' })).toBe('cap');
    expect(frameOf({ name: 'settings', sub: 'visibility' })).toBe('cap');
    expect(frameOf({ name: 'recommend', sub: 'prepare/p-interview' })).toBe('flow');
    expect(frameOf({ name: 'activities', sub: 'records/interview' })).toBe('flow');
    expect(frameOf({ name: 'activities', sub: 'records/interview/a-hackathon' })).toBe('flow');
    expect(frameOf({ name: 'activities' })).toBe('full');
    expect(frameOf({ name: 'activities', sub: 'records' })).toBe('full');
    expect(frameOf({ name: 'analysis', sub: 'map' })).toBe('full');
  });
});
