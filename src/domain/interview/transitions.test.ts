import { describe, expect, it } from 'vitest';
import type { Activity } from '../types';
import { rec } from '../fixtures.test-util';
import { activityOfRecord, recordedPatch, unrecordedPatch } from './transitions';

const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ended', schedule: '10월 끝남', ...over });

describe('활동 상태 전이', () => {
  it('저장하면 기록됨 + 기록 연결, 마감·준비는 비운다. 일정 문구는 건드리지 않는다', () => {
    const p = recordedPatch('r-a');
    expect(p).toMatchObject({ status: 'recorded', recordId: 'r-a', due: undefined, prep: undefined });
    expect('schedule' in p).toBe(false);
  });
  it('기록을 지우면 회고 대기로 돌아가고 연결이 끊긴다', () => {
    const recorded = { ...act('a'), ...recordedPatch('r-a') };
    const back = { ...recorded, ...unrecordedPatch() };
    expect(back).toMatchObject({ status: 'ended', recordId: undefined, schedule: '10월 끝남' });
  });
  it('기록을 만든 활동을 recordId 로, 없으면 같은 기회로 찾는다', () => {
    const list = [act('a', { status: 'recorded', recordId: 'r-a' }), act('b', { status: 'recorded', programId: 'p1' }), act('c', { status: 'ended', programId: 'p1' })];
    expect(activityOfRecord(list, rec('r-a'))?.id).toBe('a');
    expect(activityOfRecord(list, rec('x', { programId: 'p1' }))?.id).toBe('b');
    expect(activityOfRecord(list, rec('seed'))).toBeUndefined();
  });
});
