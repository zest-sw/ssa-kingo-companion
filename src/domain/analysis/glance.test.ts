import { describe, expect, it } from 'vitest';
import { discoveriesOf } from '../discoveries';
import { rec } from '../fixtures.test-util';
import type { Confirm } from '../types';
import { buildFlow } from './flow';
import { pendingCount, recentFlow, seenAxes, treeGlance } from './glance';
import { buildStrengths } from './strengths';
import { buildTechTree } from './techtree';

const recs = [rec('a', { did: 'make', field: 'dev' }), rec('b', { did: 'make', field: 'dev', semester: '2026-1' })];

describe('분석 L1 요약', () => {
  it('확인할 발견은 답이 없거나 근거가 바뀐 것만 센다', () => {
    const ds = discoveriesOf(recs);
    expect(ds.length).toBeGreaterThan(0);
    expect(pendingCount(ds, {})).toBe(ds.length);
    const yes: Record<string, Confirm> = Object.fromEntries(ds.map(d => [d.key, { status: 'yes' as const, sig: d.sig }]));
    expect(pendingCount(ds, yes)).toBe(0);
    const stale: Record<string, Confirm> = Object.fromEntries(ds.map(d => [d.key, { status: 'yes' as const, sig: ['x@0'] }]));
    expect(pendingCount(ds, stale)).toBe(ds.length);
    expect(pendingCount([], {})).toBe(0);
  });
  it('테크 트리는 6줄 × 4칸으로 줄고 채운 칸만 센다', () => {
    const g = treeGlance(buildTechTree({ records: recs, activities: [], candidates: [] }));
    expect(g.rows).toHaveLength(6);
    expect(g.rows.every(r => r.cells.length === 4)).toBe(true);
    expect(g.rows.find(r => r.group === 'dev')?.cells[2]).toBe('done');
    expect(g.filled).toBe(1);
    expect(g.blankRows).toBe(5);
  });
  it('관심 흐름은 기록이 있는 최근 학기만 오래된 순서로 남긴다', () => {
    const rows = buildFlow(recs, ['2025-2', '2026-1', '2026-여름', '2026-2']);
    expect(recentFlow(rows, 4).map(r => r.semester)).toEqual(['2026-1', '2026-2']);
    expect(recentFlow(rows, 1).map(r => r.semester)).toEqual(['2026-2']);
    expect(recentFlow([], 3)).toEqual([]);
  });
  it('기록에서 보이는 역량 축을 센다', () => {
    const self = { expertise: 'low', problem: 'low', communication: 'low', collaboration: 'low', self: 'low', creative: 'low' } as const;
    expect(seenAxes(buildStrengths([], self))).toBe(0);
    expect(seenAxes(buildStrengths([rec('a', { axes: ['creative', 'problem'] })], self))).toBe(2);
  });
});
