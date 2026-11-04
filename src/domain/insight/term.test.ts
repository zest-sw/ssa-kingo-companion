import { expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import type { Activity } from '../types';
import { tallyLine, termTally } from './term';

const act = (id: string, status: Activity['status']): Activity => ({ id, title: id, field: 'dev', status, schedule: '' });

it('이번 학기 기록과 활동 상태를 센다', () => {
  const t = termTally([rec('a', { semester: '2026-2' }), rec('b', { semester: '2026-1' })], [act('x', 'ongoing'), act('y', 'applied'), act('z', 'ended')], '2026-2');
  expect(t).toEqual({ records: 1, ongoing: 1, preparing: 1 });
  expect(tallyLine(t)).toBe('기록 1개 · 하는 중 1개 · 신청 준비 1개');
  expect(tallyLine({ records: 0, ongoing: 0, preparing: 0 })).toBe('');
});
