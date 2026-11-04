import { describe, expect, it } from 'vitest';
import { PROGRAMS } from '../../data/catalog';
import { EXAMPLE_EDGE_ANSWERS, SEED_RECORDS } from '../../data/seed';
import { prog, rec } from '../fixtures.test-util';
import type { KgPair } from './build';
import { buildKg, edgeCounts, W } from './build';
import { analyzeKg, betweenness, communities, isShown, MAX_CLUSTERS, pageRank, predictLinks, clustersOf } from './analyze';
import { leiden, modularity } from './community';
import { cTfIdf, nameClusters } from './labels';
import { mockLlm, NO_LLM } from './llm';
import { tokens } from './text';

const pair = (a: string, b: string, weight = 1): KgPair => ({ id: `${a}~${b}`, a, b, weight, parts: [], origin: 'rule' });

describe('생성(build)', () => {
  it('같은 분야·시리즈·확인 역량·키워드는 규칙 엣지, 무게는 규칙대로', () => {
    const a = rec('a', { title: 'SW 멘토링 · 멘티', field: 'mentor', semester: '2026-1', confirmedAxes: ['self'], axes: ['self'], note: '멘토에게 질문' });
    const b = rec('b', { title: 'SW 멘토링 · 멘토', field: 'mentor', semester: '2026-여름', confirmedAxes: ['self'], axes: ['self'], note: '신입 멘티에게 설명' });
    const kg = buildKg([a, b]);
    const p = kg.pairs.find(x => x.id === 'a~b')!;
    expect(p.parts.map(e => e.type).sort()).toEqual(['axis', 'field', 'follow', 'keyword', 'series']);
    expect(p.parts.every(e => e.origin === 'rule' && e.reason.length > 0)).toBe(true);
    expect(p.weight).toBeGreaterThanOrEqual(W.field + W.series);
  });

  it('LLM 엣지는 출처 llm·신뢰도·이유를 남기고, 학생이 확인하면 student, 아니에요면 쌍을 뺀다', () => {
    const recs = [rec('x', { field: 'dev', semester: '2026-1' }), rec('y', { field: 'global', semester: '2026-여름' })];
    const llm = mockLlm([{ a: 'x', b: 'y', confidence: 0.5, reason: '같은 질문 습관' }], []);
    const p = buildKg(recs, { llm }).pairs[0];
    expect(p.origin).toBe('llm');
    expect(p.parts[0]).toMatchObject({ type: 'semantic', origin: 'llm', confidence: 0.5, weight: W.llm * 0.5, reason: '같은 질문 습관' });
    expect(buildKg(recs, { llm, answers: { 'x~y': 'yes' } }).pairs[0].origin).toBe('student');
    expect(buildKg(recs, { llm, answers: { 'x~y': 'no' } }).pairs).toHaveLength(0);
  });

  it('같은 입력이면 같은 그래프(결정적), 예시 학생은 규칙·LLM·학생 엣지를 모두 갖는다', () => {
    const one = buildKg(SEED_RECORDS, { llm: mockLlm(), answers: EXAMPLE_EDGE_ANSWERS });
    expect(JSON.stringify(one)).toBe(JSON.stringify(buildKg(SEED_RECORDS, { llm: mockLlm(), answers: EXAMPLE_EDGE_ANSWERS })));
    const n = edgeCounts(one);
    expect(n.rule).toBeGreaterThan(0);
    expect(n.llm).toBeGreaterThan(0);
    expect(n.student).toBe(Object.keys(EXAMPLE_EDGE_ANSWERS).length);
  });
});

describe('커뮤니티 탐지(Leiden 식)', () => {
  // 삼각형 두 개를 약한 다리 하나로 이은 그래프
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const edges = [['a', 'b'], ['b', 'c'], ['a', 'c'], ['d', 'e'], ['e', 'f'], ['d', 'f']].map(([a, b]) => ({ a, b, w: 1 })).concat({ a: 'c', b: 'd', w: 0.2 });

  it('삼각형 둘을 두 묶음으로 나눈다', () => {
    const c = leiden(ids, edges);
    expect(new Set(['a', 'b', 'c'].map(x => c.get(x))).size).toBe(1);
    expect(new Set(['d', 'e', 'f'].map(x => c.get(x))).size).toBe(1);
    expect(c.get('a')).not.toBe(c.get('d'));
    expect(modularity(ids, edges, c)).toBeGreaterThan(0.3);
  });

  it('모든 묶음은 안에서 이어져 있다(끊긴 묶음 없음), 이어진 데 없는 노드는 혼자 묶음', () => {
    const c = leiden([...ids, 'z'], edges);
    expect([...c.values()].filter(v => v === c.get('z'))).toHaveLength(1);
    const seed = buildKg(SEED_RECORDS, { llm: mockLlm() });
    for (const g of communities(seed)) {
      const seen = new Set([g[0]]);
      const stack = [g[0]];
      while (stack.length) { const v = stack.pop()!; for (const p of seed.pairs) { const w = p.a === v ? p.b : p.b === v ? p.a : null; if (w && g.includes(w) && !seen.has(w)) { seen.add(w); stack.push(w); } } }
      expect(seen.size).toBe(g.length);
    }
  });

  it('예시 학생: 묶음은 MAX_CLUSTERS 개 이하, 모든 기록이 한 묶음에만 든다', () => {
    const g = communities(buildKg(SEED_RECORDS, { llm: mockLlm() }));
    expect(g.length).toBeLessThanOrEqual(MAX_CLUSTERS);
    expect(g.flat().sort()).toEqual(SEED_RECORDS.map(r => r.id).sort());
  });
});

describe('묶음 이름(labels)', () => {
  it('c-TF-IDF: 한 묶음에만 많은 말이 그 묶음 대표 단어가 된다', () => {
    const t = cTfIdf([['설문', '설문', '질문'], ['코드', '코드', '질문']]);
    expect(t[0][0].term).toBe('설문');
    expect(t[1][0].term).toBe('코드');
  });

  it('조사를 떼어 낱말 줄기만 남긴다', () => {
    expect(tokens('설문을 두 번 고쳐 인터뷰에서')).toEqual(expect.arrayContaining(['설문', '인터뷰']));
  });

  it('사전 키워드가 맞으면 사전 이름과 맞은 키워드, 아니면 LLM 이름 후보(AI 제안)', () => {
    const research = [rec('a', { note: '사용자 인터뷰 질문지를 만들었다' }), rec('b', { note: '설문 응답을 관찰했다' })];
    const odd = [rec('c', { field: 'etc', note: '마라톤 완주' }), rec('d', { field: 'etc', note: '마라톤 기록 단축' })];
    const llm = mockLlm([], [{ members: ['c', 'd'], name: '끝까지 해내기', summary: '' }]);
    const [n1, n2] = nameClusters([research, odd], llm);
    expect(n1).toMatchObject({ name: '사용자 리서치', source: 'taxonomy' });
    expect(n1.keywords.length).toBeGreaterThanOrEqual(2);
    expect(n2).toMatchObject({ name: '끝까지 해내기', source: 'llm' });
    expect(nameClusters([odd], NO_LLM)[0].source).toBe('llm');
  });

  it('두 묶음이 같은 사전 이름을 갖지 않는다', () => {
    const names = clustersOf(buildKg(SEED_RECORDS, { llm: mockLlm() }), mockLlm()).map(c => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('그래프 분석', () => {
  it('PageRank: 별 모양 가운데가 가장 크다', () => {
    const pr = pageRank(['h', 'a', 'b', 'c'], [pair('h', 'a'), pair('h', 'b'), pair('h', 'c')]);
    expect(Math.max(...pr.values())).toBe(pr.get('h'));
    expect([...pr.values()].reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5);
  });

  it('매개 중심성(Brandes): 사슬 a-b-c 에서 b 만 1', () => {
    const bc = betweenness(['a', 'b', 'c'], [pair('a', 'b'), pair('b', 'c')]);
    expect([bc.get('a'), bc.get('b'), bc.get('c')]).toEqual([0, 1, 0]);
  });

  it('링크 예측: 묶음과 드문 키워드·분야를 많이 나누는 기회가 위, 이미 한 기회는 뺀다', () => {
    const recs = [rec('a', { note: '사용자 인터뷰', axes: ['communication'] }), rec('b', { note: '설문 응답 정리', axes: ['communication'], programId: 'p-done' })];
    const kg = buildKg(recs);
    const cs = clustersOf(kg);
    const g = predictLinks(kg, cs, [prog('p-far', { field: 'dev', did: ['make'], title: '코딩' }), prog('p-near', { title: '인터뷰 설문 실습' }), prog('p-done', { title: '인터뷰' })]);
    expect(g[0].program.id).toBe('p-near');
    expect(g[0].keywords).toEqual(expect.arrayContaining(['인터뷰']));
    expect(g.some(x => x.program.id === 'p-done')).toBe(false);
  });

  it('예시 학생: 중심·연결고리·이어질 수 있는 활동 3개가 나오고 연결고리는 두 묶음을 잇는다', () => {
    const a = analyzeKg(buildKg(SEED_RECORDS, { llm: mockLlm(), answers: EXAMPLE_EDGE_ANSWERS }), PROGRAMS, mockLlm());
    expect(a.center).not.toBeNull();
    expect(a.bridge?.joins[0]).not.toBe(a.bridge?.joins[1]);
    expect(a.guesses).toHaveLength(3);
    expect(a.shown.every(isShown)).toBe(true);
    expect(a.stats.every(s => s.cohesion >= 0 && s.cohesion <= 1)).toBe(true);
  });

  it('이어진 데 없는 활동은 고립 활동으로 나온다', () => {
    const a = analyzeKg(buildKg([rec('a', { field: 'dev' }), rec('b', { field: 'global', semester: '2025-1' })]));
    expect(a.loose.map(x => x.id).sort()).toEqual(['a', 'b']);
    expect(a.center).toBeNull();
  });
});
