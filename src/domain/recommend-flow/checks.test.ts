import { describe, expect, it } from 'vitest';
import { prog } from '../fixtures.test-util';
import type { Activity } from '../types';
import { agentChecks } from './checks';

const act = (over: Partial<Activity>): Activity => ({ id: 'a', title: 'A', field: 'dev', status: 'applied', schedule: '', ...over });

describe('agentChecks: 에이전트가 확인한 것과 확인에 쓴 정보', () => {
  it('신청 대상이고 겹치지 않으면 두 줄 모두 통과, 확인에 쓴 정보를 붙인다', () => {
    const rows = agentChecks(prog('p', { target: '전 학년', when: '10.20(화)' }), [], 1);
    expect(rows.map(r => [r.id, r.state])).toEqual([['target', 'ok'], ['schedule', 'ok']]);
    expect(rows[0].basis).toBe('모집 대상 전 학년');
    expect(rows[1].basis).toBe('이번 주 내 일정이 없어요 · 여유');
  });
  it('신청 대상이 아니거나 일정이 겹치면 warn', () => {
    const rows = agentChecks(prog('p', { eligible: false, when: '10.14(수) 18:30' }), [act({ schedule: '10.14(수) 18:30' })], 1);
    expect(rows.map(r => r.state)).toEqual(['warn', 'warn']);
    expect(rows[1].label).toBe('내 일정과 겹쳐요');
  });
});
