import { describe, expect, it } from 'vitest';
import { SEED_ACTIVITIES } from './seed';
import { PROGRAMS } from './catalog';
import { factsOf } from './activities';
import { activityFromProgram } from '../domain/activities';

describe('factsOf', () => {
  it('에이전트가 미리 채우는 상황에는 숫자가 없다(수치는 학생이 말한 것만)', () => {
    const acts = [...SEED_ACTIVITIES, ...PROGRAMS.map(p => activityFromProgram(p, 1))];
    const situations = acts.map(a => factsOf(a).situation).filter((s): s is string => !!s);
    expect(situations.length).toBeGreaterThan(0);
    for (const s of situations) expect(s).not.toMatch(/\d/);
  });
  it('모르는 활동은 상황을 비워 두고 직접 입력으로 본다', () => {
    const f = factsOf({ id: 'a-x', title: 'x', field: 'etc', status: 'ended', schedule: '' });
    expect(f).toEqual({ kind: '비교과 활동', verified: false });
  });
});
