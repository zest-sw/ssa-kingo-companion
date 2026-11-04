import { describe, expect, it } from 'vitest';
import { EXAMPLE_EDGE_ANSWERS, SEED_RECORDS } from '../../data/seed';
import type { Program, RecordItem } from '../types';
import { axisCount, axisNodeId, buildGraph, clusterInsight, clusterRecords, focusSet, MAX_CLUSTERS, miniGraph } from './graph';
import { convexHull, joinDots, layoutGraph, placeEdgeLabels, rectsOverlap, textWidth } from './graphLayout';

const rec = (id: string, p: Partial<RecordItem>): RecordItem => ({
  id, v: 1, title: id, kind: '스터디', date: '', semester: '2026-1', field: 'dev', did: 'make', energy: 'same', quote: '', note: '', axes: ['problem'],
  source: 'seed', verification: 'self', visibility: 'me', useForRecommend: true, ...p
});

describe('지식 그래프 모델', () => {
  const g = buildGraph(SEED_RECORDS, EXAMPLE_EDGE_ANSWERS);

  it('역량 허브 여섯 개와 활동 노드, 근거 선을 만든다', () => {
    expect(g.nodes.filter(n => n.kind === 'axis')).toHaveLength(6);
    expect(g.nodes.filter(n => n.kind === 'record')).toHaveLength(SEED_RECORDS.length);
    expect(g.edges.every(e => g.nodes.some(n => n.id === e.from) && g.nodes.some(n => n.id === e.to))).toBe(true);
  });

  it('학생이 확인한 근거만 확인(실선), 아니에요라고 한 근거는 선이 없다', () => {
    const e = g.edges.find(x => x.id === `r-webcamp>expertise`);
    expect(e?.confirmed).toBe(true);
    expect(g.edges.find(x => x.id === 'r-webcamp>creative')?.confirmed).toBe(false);
    expect(g.edges.find(x => x.id === 'r-algo>self')).toBeUndefined();
  });

  it('이어짐: 같은 일·같은 분야를 이어서 했거나 학생이 맞다고 한 연결', () => {
    const follows = g.edges.filter(e => e.kind === 'follow').map(e => e.id);
    expect(follows).toContain('r-webcamp~r-appclub');
    expect(follows).toContain('r-mentee~r-mentor');
    expect(g.edges.find(e => e.id === 'r-mentee~r-mentor')?.confirmed).toBe(true);
    expect(buildGraph(SEED_RECORDS, { 'r-webcamp~r-appclub': 'no' }).edges.some(e => e.id === 'r-webcamp~r-appclub')).toBe(false);
  });

  it('묶음은 4~5개이고 모든 활동이 꼭 한 묶음에 든다. 이름은 규칙으로 정해진다', () => {
    expect(g.clusters.length).toBeGreaterThanOrEqual(4);
    expect(g.clusters.length).toBeLessThanOrEqual(MAX_CLUSTERS);
    const all = g.clusters.flatMap(c => c.recordIds);
    expect(new Set(all).size).toBe(SEED_RECORDS.length);
    expect(g.clusters.map(c => c.name)).toEqual(expect.arrayContaining(['사용자 리서치', '데이터 분석', '멘토링·나눔']));
    const research = g.clusters.find(c => c.name === '사용자 리서치')!;
    expect(research.recordIds).toEqual(expect.arrayContaining(['e2', 'e3', 'r-survey', 'e6']));
  });

  it('같은 기록이면 같은 묶음(순서를 바꿔도)', () => {
    const shuffled = [...SEED_RECORDS].reverse();
    const key = (cs: typeof g.clusters) => cs.map(c => `${c.name}:${[...c.recordIds].sort().join(',')}`);
    expect(key(buildGraph(shuffled, EXAMPLE_EDGE_ANSWERS).clusters)).toEqual(key(g.clusters));
  });

  it('활동 하나뿐인 묶음은 가장 닮은 묶음에 합친다', () => {
    const cs = clusterRecords([rec('a', { field: 'research', did: 'listen' }), rec('b', { field: 'research', did: 'ask' }), rec('c', { field: 'global', did: 'listen' })]);
    expect(cs).toHaveLength(1);
    expect(cs[0].name).toBe('사용자 리서치');
    expect(clusterRecords([])).toEqual([]);
  });

  it('묶음 강조: 그 묶음 활동과 닿은 역량·선만', () => {
    const c = g.clusters.find(x => x.name === '사용자 리서치')!;
    const f = focusSet(g, { kind: 'cluster', id: c.id })!;
    for (const id of c.recordIds) expect(f.nodes.has(id)).toBe(true);
    expect(f.nodes.has('r-py')).toBe(false);
    expect([...f.edges].every(id => g.edges.find(e => e.id === id)!.from !== 'r-py')).toBe(true);
    expect(focusSet(g, null)).toBeNull();
  });

  it('역량 강조: 그 역량 근거 활동만', () => {
    const f = focusSet(g, { kind: 'axis', id: 'collaboration' })!;
    const n = axisCount(g, 'collaboration');
    expect(f.nodes.size).toBe(n.confirmed + n.estimated + 1);
    expect(f.nodes.has(axisNodeId('collaboration'))).toBe(true);
  });

  it('묶음 분석: 근거 역량 개수(확인/추정), 기간, 대표 회고, 다음 기회', () => {
    const c = g.clusters.find(x => x.name === '사용자 리서치')!;
    const p = (id: string, field: Program['field'], did: Program['did']) => ({ id, title: id, field, did }) as Program;
    const ins = clusterInsight(g, c.id, [p('x', 'dev', ['make']), p('y', 'research', ['listen']), p('z', 'product', ['ask'])])!;
    const comm = ins.axes.find(a => a.axis === 'communication')!;
    expect(comm.confirmed).toBe(2);
    expect(ins.axes[0].confirmed).toBeGreaterThanOrEqual(ins.axes[ins.axes.length - 1].confirmed);
    expect(ins.first).toBe('2026-1');
    expect(ins.last).toBe('2026-2');
    expect(ins.quotes).toHaveLength(2);
    expect(ins.quotes[0].recordId).toBe('e2');
    expect(ins.next.map(x => x.id)).toEqual(['y', 'z']);
    expect(clusterInsight(g, 'none', [])).toBeNull();
  });

  it('작은 그림: 묶음 넷, 역량 셋, 묶음마다 선 둘까지', () => {
    const m = miniGraph(g);
    expect(m.clusters).toHaveLength(4);
    expect(m.axes).toHaveLength(3);
    for (const c of m.clusters) expect(m.links.filter(l => l.cluster === c.id).length).toBeLessThanOrEqual(2);
  });
});

describe('그래프 배치', () => {
  const g = buildGraph(SEED_RECORDS, EXAMPLE_EDGE_ANSWERS);

  it('같은 데이터면 같은 그림이다', () => {
    expect(layoutGraph(g, 680, 460)).toEqual(layoutGraph(g, 680, 460));
  });

  it.each([[600, 420], [700, 460], [880, 700], [1300, 860]])('%ix%i: 노드·이름 상자가 겹치지 않고 칸 안에 있다', (w, h) => {
    const l = layoutGraph(g, w, h);
    expect(l.overlaps).toBe(0);
    const boxes = Object.values(l.boxes);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(rectsOverlap(boxes[i], boxes[j], 0)).toBe(false);
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w).toBeLessThanOrEqual(l.width);
      expect(b.y + b.h).toBeLessThanOrEqual(l.height);
    }
  });

  it('묶음끼리 떨어진다: 묶음 가운데 사이가 묶음 안 평균 거리보다 멀다', () => {
    const l = layoutGraph(g, 880, 700);
    const center = (ids: string[]) => ({ x: ids.reduce((s, i) => s + l.pos[i].x, 0) / ids.length, y: ids.reduce((s, i) => s + l.pos[i].y, 0) / ids.length });
    const cs = g.clusters.map(c => ({ c, m: center(c.recordIds) }));
    const inside = cs.map(({ c, m }) => c.recordIds.reduce((s, i) => s + Math.hypot(l.pos[i].x - m.x, l.pos[i].y - m.y), 0) / c.recordIds.length);
    const avgInside = inside.reduce((a, b) => a + b, 0) / inside.length;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      expect(Math.hypot(cs[i].m.x - cs[j].m.x, cs[i].m.y - cs[j].m.y)).toBeGreaterThan(avgInside);
    }
  });

  it('관계 이름표는 노드·다른 이름표와 겹치지 않는다', () => {
    const l = layoutGraph(g, 700, 460);
    const f = focusSet(g, { kind: 'axis', id: 'communication' })!;
    const edges = g.edges.filter(e => f.edges.has(e.id)).map(e => ({ id: e.id, from: e.from, to: e.to, label: '근거' }));
    const at = placeEdgeLabels(edges, l);
    const rects = Object.values(at).map(p => ({ x: p.x - 15, y: p.y - 7, w: 30, h: 14 }));
    expect(rects.length).toBeGreaterThan(0);
    for (const r of rects) for (const b of Object.values(l.boxes)) expect(rectsOverlap(r, b, 0)).toBe(false);
  });

  it('볼록 껍질과 글자 폭 어림', () => {
    expect(convexHull([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }])).toHaveLength(4);
    expect(textWidth('리서치', 12)).toBe(36);
    expect(joinDots('SW 학습 멘토링 · 멘토')).toBe('SW 학습 멘토링· 멘토');
  });
});
