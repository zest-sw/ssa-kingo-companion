import { describe, expect, it } from 'vitest';
import { nextStep } from './nextStep';
import type { Activity, ActivityStatus } from './types';

const act = (status: ActivityStatus): Activity => ({ id: status, title: status, field: 'dev', status, schedule: '' });

describe('빈 칸의 다음 행동', () => {
  it('새 학생은 추천으로 (회고할 활동이 없으니 회고 화면으로 보내지 않는다)', () => {
    expect(nextStep([]).to).toBe('recommend');
    expect(nextStep([act('recorded'), act('declined')]).to).toBe('recommend');
  });
  it('끝난 활동이 있으면 회고 쓰기로', () => {
    expect(nextStep([act('preparing'), act('ended')])).toMatchObject({ to: 'activities/records/interview', label: '회고 쓰러 가기' });
  });
  it('하는 활동만 있으면 일정으로', () => {
    for (const s of ['preparing', 'applied', 'ongoing'] as const) expect(nextStep([act(s)]).to).toBe('activities/schedule');
  });
});
