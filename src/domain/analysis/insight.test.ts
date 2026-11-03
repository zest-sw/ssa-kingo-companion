import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { buildFlow } from './flow';
import { flowInsight, mapInsight, strengthInsight, treeInsight } from './insight';
import { buildMap } from './map';
import { buildStrengths } from './strengths';
import { buildTechTree } from './techtree';

const self = { expertise: 'low', problem: 'low', communication: 'low', collaboration: 'low', self: 'low', creative: 'low' } as const;
const tree = (records: ReturnType<typeof rec>[]) => buildTechTree({ records, activities: [], candidates: [] });

describe('나의 분석 한 줄 통찰', () => {
  it('기록이 없으면 다음에 할 일을 말한다', () => {
    expect(treeInsight(tree([])).sentence).toMatch(/회고/);
    expect(mapInsight(buildMap([]), {}).sentence).toMatch(/회고/);
    expect(flowInsight([]).sentence).toMatch(/회고/);
    expect(strengthInsight(buildStrengths([], self)).sentence).toMatch(/회고/);
  });
  it('테크 트리는 가장 많이 한 분야와 안 해 본 분야를 말하고, 기록이 늘면 바뀐다', () => {
    const one = treeInsight(tree([rec('a', { did: 'make', field: 'dev' })]));
    expect(one.sentence).toContain('가장 많이 해 본 분야는 개발');
    expect(one.sentence).toContain('아직 안 해 본 분야는');
    const two = treeInsight(tree([rec('a', { did: 'make', field: 'dev' }), rec('b', { did: 'listen', field: 'ai' }), rec('c', { did: 'make', field: 'ai' })]));
    expect(two.sentence).toContain('가장 많이 해 본 분야는 AI·데이터');
  });
  it('경험 지도는 같은 일이 둘 이상일 때만 이어진다고 말한다', () => {
    expect(mapInsight(buildMap([rec('a', { did: 'listen' })]), {}).sentence).toMatch(/하나 더/);
    const s = mapInsight(buildMap([rec('a', { did: 'listen' }), rec('b', { did: 'listen' }), rec('c', { did: 'make' })]), {}).sentence;
    expect(s).toContain('기록 2개에 이어져요');
  });
  it('관심 흐름은 같은 분야가 계속된 학기부터 말한다', () => {
    const recs = [rec('a', { field: 'startup', semester: '2026-1' }), rec('b', { field: 'startup', semester: '2026-2' }), rec('c', { field: 'dev', semester: '2025-2' })];
    const rows = buildFlow(recs, ['2025-2', '2026-1', '2026-2']);
    expect(flowInsight(rows).sentence).toBe('2026-1학기부터 창업·기획이 계속 가장 많아요');
    expect(flowInsight(buildFlow([recs[0]], ['2026-1'])).sentence).toBe('2026-1학기에는 창업·기획이 가장 많아요');
  });
  it('나의 강점은 기록과 내 생각이 가장 다른 역량을 말한다', () => {
    const rows = buildStrengths([rec('a', { axes: ['communication'] }), rec('b', { axes: ['communication'] }), rec('c', { axes: ['communication'] })], self);
    expect(strengthInsight(rows).sentence).toContain('소통은 기록에서 ‘중간’이고 내 생각은 ‘적음’이에요');
  });
});
