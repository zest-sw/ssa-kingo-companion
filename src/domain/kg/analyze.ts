import { FIELD_GROUP } from '../vocab';
import type { Axis, Program, RecordItem } from '../types';
import { semesterKey } from '../analysis/semester';
import { axesOfProgram, liveAxes } from '../analysis/strengths';
import type { Kg, KgPair } from './build';
import { leiden } from './community';
import { nameClusters, type ClusterName } from './labels';
import { NO_LLM, type LlmProvider } from './llm';
import { keywordsIn, programText, recordText } from './text';

// 지식 그래프 '분석'. 생성(build.ts)이 만든 그래프를 읽어 묶음·이름·중심·연결고리·이어질 수 있는 활동·고립 활동을 낸다.
// 숫자(중심성 값, 점수)는 순서를 정하는 데만 쓰고 화면에는 '가장 많이 이어진' 같은 말로만 낸다.

/** 묶음 목록 상한(덩어리 안 항목 5개) */
export const MAX_CLUSTERS = 5;
/**
 * 화면에 선으로 그리는 쌍: 무게 2.0 이상(규칙 두세 가지가 겹침), 또는 시리즈·LLM·학생 확인 엣지가 있는 쌍.
 * 같은 분야 하나만 겹친 쌍(1.0)까지 그리면 선이 수십 개가 되어 읽히지 않는다. 묶음 계산은 모든 쌍으로 한다.
 */
export const STRONG = 2;
export const isShown = (p: KgPair) => p.weight >= STRONG || p.parts.some(e => e.type === 'series' || e.origin !== 'rule');

export type KgCluster = ClusterName & { id: string; recordIds: string[] };

/** 쌍 무게로 Leiden 묶음을 찾고, MAX_CLUSTERS 를 넘으면 작은 묶음부터 가장 많이 이어진 묶음에 합친다. 큰 묶음 순 */
export function communities(kg: Kg): string[][] {
  const ids = kg.records.map(r => r.id);
  const comm = leiden(ids, kg.pairs.map(p => ({ a: p.a, b: p.b, w: p.weight })));
  let groups: string[][] = [];
  for (const id of ids) (groups[comm.get(id)!] ??= []).push(id);
  groups = groups.filter(Boolean);
  const pos = new Map(ids.map((id, i) => [id, i]));
  const between = (x: string[], y: string[]) => {
    const Y = new Set(y);
    return kg.pairs.reduce((s, p) => s + ((x.includes(p.a) && Y.has(p.b)) || (x.includes(p.b) && Y.has(p.a)) ? p.weight : 0), 0);
  };
  while (groups.length > MAX_CLUSTERS) {
    const small = groups.reduce((a, b) => (b.length < a.length ? b : a));
    const rest = groups.filter(g => g !== small);
    const into = rest.reduce((best, g) => (between(small, g) > between(small, best) || (between(small, g) === between(small, best) && g.length > best.length) ? g : best), rest[0]);
    groups = rest.map(g => (g === into ? [...g, ...small].sort((a, b) => pos.get(a)! - pos.get(b)!) : g));
  }
  return groups.sort((a, b) => b.length - a.length || pos.get(a[0])! - pos.get(b[0])!);
}

/** 묶음 + 이름. 사전 이름이면 id 는 주제 id(학기가 바뀌어도 같은 묶음으로 비교), 아니면 첫 활동 id */
export function clustersOf(kg: Kg, llm: LlmProvider = NO_LLM): KgCluster[] {
  const groups = communities(kg);
  const byId = new Map(kg.records.map(r => [r.id, r]));
  const names = nameClusters(groups.map(g => g.map(id => byId.get(id)!)), llm);
  return groups.map((g, i) => ({ ...names[i], id: names[i].topic ? `c-${names[i].topic}` : `c-${g[0]}`, recordIds: g }));
}

type Adj = Map<string, Map<string, number>>;
function adjacency(ids: string[], pairs: KgPair[]): Adj {
  const adj: Adj = new Map(ids.map(id => [id, new Map()]));
  for (const p of pairs) { adj.get(p.a)?.set(p.b, p.weight); adj.get(p.b)?.set(p.a, p.weight); }
  return adj;
}

/** PageRank(무게, 감쇠 0.85, 60번 반복). 이웃이 없는 노드의 몫은 모두에게 고르게 나눈다 */
export function pageRank(ids: string[], pairs: KgPair[], d = 0.85, iters = 60): Map<string, number> {
  const adj = adjacency(ids, pairs);
  const n = ids.length || 1;
  let pr = new Map(ids.map(id => [id, 1 / n]));
  const out = new Map(ids.map(id => [id, [...adj.get(id)!.values()].reduce((s, w) => s + w, 0)]));
  for (let t = 0; t < iters; t++) {
    const dangling = ids.filter(id => out.get(id) === 0).reduce((s, id) => s + pr.get(id)!, 0);
    const next = new Map(ids.map(id => [id, (1 - d) / n + (d * dangling) / n]));
    for (const id of ids) for (const [j, w] of adj.get(id)!) next.set(j, next.get(j)! + (d * pr.get(id)! * w) / out.get(id)!);
    pr = next;
  }
  return pr;
}

/** 매개 중심성(Brandes 2001, 무게 없는 최단 경로). 묶음 사이를 잇는 활동일수록 크다 */
export function betweenness(ids: string[], pairs: KgPair[]): Map<string, number> {
  const adj = adjacency(ids, pairs);
  const cb = new Map(ids.map(id => [id, 0]));
  for (const s of ids) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>(ids.map(id => [id, []]));
    const sigma = new Map(ids.map(id => [id, 0]));
    const dist = new Map(ids.map(id => [id, -1]));
    sigma.set(s, 1); dist.set(s, 0);
    const queue = [s];
    while (queue.length) {
      const v = queue.shift()!;
      stack.push(v);
      for (const w of [...adj.get(v)!.keys()].sort()) {
        if (dist.get(w)! < 0) { dist.set(w, dist.get(v)! + 1); queue.push(w); }
        if (dist.get(w) === dist.get(v)! + 1) { sigma.set(w, sigma.get(w)! + sigma.get(v)!); pred.get(w)!.push(v); }
      }
    }
    const delta = new Map(ids.map(id => [id, 0]));
    while (stack.length) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) delta.set(v, delta.get(v)! + (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!));
      if (w !== s) cb.set(w, cb.get(w)! + delta.get(w)!);
    }
  }
  for (const id of ids) cb.set(id, cb.get(id)! / 2);
  return cb;
}

/** 링크 예측에 쓰는 속성: 세부 분야, 분야 묶음, 한 일, 역량, 사전 키워드 */
function attrsOfRecord(r: RecordItem): string[] {
  return [`f:${r.field}`, `g:${FIELD_GROUP[r.field]}`, `d:${r.did}`, ...liveAxes(r).map(a => `a:${a}`), ...new Set(keywordsIn(recordText(r)).map(k => `k:${k.keyword}`))];
}
function attrsOfProgram(p: Program): string[] {
  return [`f:${p.field}`, `g:${FIELD_GROUP[p.field]}`, ...p.did.map(d => `d:${d}`), ...axesOfProgram(p).map(a => `a:${a}`), ...new Set(keywordsIn(programText(p)).map(k => `k:${k.keyword}`))];
}

export type LinkGuess = { program: Program; clusterId: string; clusterName: string; keywords: string[]; axes: Axis[]; neighbors: number };

/**
 * 링크 예측(Liben-Nowell·Kleinberg 2007): 기회와 활동이 나눈 속성을 공통 이웃으로 보고 Adamic-Adar 로 센다.
 * AA(p, r) = Σ 1/log(deg z), z 는 둘이 함께 가진 속성. 흔한 속성(모든 활동이 가진 역량)은 덜, 드문 키워드는 더 친다.
 * 기회마다 AA 합이 가장 큰 묶음을 '이어질 묶음'으로 한다. 이미 한 기회는 뺀다. 상위 n 개.
 */
export function predictLinks(kg: Kg, clusters: KgCluster[], programs: Program[], n = 3): LinkGuess[] {
  const rAttrs = new Map(kg.records.map(r => [r.id, attrsOfRecord(r)]));
  const deg = new Map<string, number>();
  for (const as of rAttrs.values()) for (const a of as) deg.set(a, (deg.get(a) ?? 0) + 1);
  const done = new Set(kg.records.map(r => r.programId).filter(Boolean));
  return programs
    .filter(p => !done.has(p.id))
    .map((p, order) => {
      const pa = new Set(attrsOfProgram(p));
      const aa = (rid: string) => rAttrs.get(rid)!.filter(z => pa.has(z)).reduce((s, z) => s + 1 / Math.log(1 + (deg.get(z) ?? 0)), 0);
      const per = clusters.map(c => ({ c, s: c.recordIds.reduce((s, id) => s + aa(id), 0) }));
      const best = per.reduce((a, b) => (b.s > a.s ? b : a), per[0] ?? { c: undefined, s: 0 });
      return { p, order, best, total: per.reduce((s, x) => s + x.s, 0) };
    })
    .filter(x => x.best?.c && x.best.s > 0)
    .sort((a, b) => b.best.s - a.best.s || a.order - b.order)
    .slice(0, n)
    .map(({ p, best }) => {
      const c = best.c!;
      const pset = new Set(attrsOfProgram(p));
      const shared = [...new Set(c.recordIds.flatMap(id => rAttrs.get(id)!))].filter(z => pset.has(z));
      return {
        program: p, clusterId: c.id, clusterName: c.name,
        keywords: shared.filter(z => z.startsWith('k:')).map(z => z.slice(2)).slice(0, 2),
        axes: shared.filter(z => z.startsWith('a:')).map(z => z.slice(2) as Axis),
        neighbors: c.recordIds.filter(id => rAttrs.get(id)!.filter(z => pset.has(z)).length >= 2).length
      };
    });
}

export type ClusterStat = {
  id: string; size: number; first: string; last: string;
  axes: { axis: Axis; confirmed: number; estimated: number }[];
  /** 안쪽 무게 ÷ (안쪽 + 바깥 무게). 화면에는 말로만('단단해요') */
  cohesion: number;
  inner: number;
};

export function clusterStats(kg: Kg, clusters: KgCluster[]): ClusterStat[] {
  const byId = new Map(kg.records.map(r => [r.id, r]));
  return clusters.map(c => {
    const ids = new Set(c.recordIds);
    const recs = c.recordIds.map(id => byId.get(id)!);
    let inW = 0, outW = 0, inner = 0;
    for (const p of kg.pairs) {
      const a = ids.has(p.a), b = ids.has(p.b);
      if (a && b) { inW += p.weight; if (isShown(p)) inner++; } else if (a || b) outW += p.weight;
    }
    const axes = new Map<Axis, { confirmed: number; estimated: number }>();
    for (const r of recs) for (const a of liveAxes(r)) {
      const row = axes.get(a) ?? { confirmed: 0, estimated: 0 };
      if (r.confirmedAxes?.includes(a)) row.confirmed++; else row.estimated++;
      axes.set(a, row);
    }
    const keys = recs.map(r => r.semester).filter(s => !Number.isNaN(semesterKey(s))).sort((a, b) => semesterKey(a) - semesterKey(b));
    return {
      id: c.id, size: recs.length, first: keys[0] ?? '', last: keys[keys.length - 1] ?? '',
      axes: [...axes].map(([axis, v]) => ({ axis, ...v })).sort((a, b) => b.confirmed - a.confirmed || (b.confirmed + b.estimated) - (a.confirmed + a.estimated)),
      cohesion: inW + outW > 0 ? Math.round((inW / (inW + outW)) * 100) / 100 : 0,
      inner
    };
  });
}
export const cohesionWord = (c: number) => (c >= 0.6 ? '단단히 모였어요' : c >= 0.4 ? '적당히 모였어요' : '느슨하게 모였어요');

export type KeyNode = { id: string; title: string; links: number; why: { rule: number; llm: number; student: number } };
export type Bridge = KeyNode & { joins: [string, string] };
export type KgAnalysis = {
  clusters: KgCluster[];
  stats: ClusterStat[];
  shown: KgPair[];
  /** PageRank 가 가장 큰 활동(선으로 이어진 활동이 있을 때만) */
  center: KeyNode | null;
  /** 매개 중심성이 가장 크고 다른 묶음과 이어진 활동 */
  bridge: Bridge | null;
  /** 선으로 이어진 데가 없는 활동(기록 순서) */
  loose: { id: string; title: string }[];
  guesses: LinkGuess[];
};

const whyOf = (pairs: KgPair[]) => {
  const out = { rule: 0, llm: 0, student: 0 };
  for (const p of pairs) for (const e of p.parts) out[e.origin]++;
  return out;
};

/** 그래프 분석 전체. programs 는 지금 열린 기회(추천 순서) */
export function analyzeKg(kg: Kg, programs: Program[] = [], llm: LlmProvider = NO_LLM): KgAnalysis {
  const ids = kg.records.map(r => r.id);
  const clusters = clustersOf(kg, llm);
  const shown = kg.pairs.filter(isShown);
  const title = new Map(kg.records.map(r => [r.id, r.title]));
  const touching = (id: string) => shown.filter(p => p.a === id || p.b === id);
  const linked = ids.filter(id => touching(id).length > 0);
  const pr = pageRank(ids, shown);
  const top = [...linked].sort((a, b) => pr.get(b)! - pr.get(a)! || ids.indexOf(a) - ids.indexOf(b))[0];
  const center = top ? { id: top, title: title.get(top)!, links: touching(top).length, why: whyOf(touching(top)) } : null;

  const clusterOf = new Map(clusters.flatMap(c => c.recordIds.map(id => [id, c.id] as const)));
  const bc = betweenness(ids, shown);
  const bridgeId = [...linked]
    .filter(id => id !== top || linked.length > 2)
    .filter(id => touching(id).some(p => clusterOf.get(p.a === id ? p.b : p.a) !== clusterOf.get(id)))
    .sort((a, b) => bc.get(b)! - bc.get(a)! || ids.indexOf(a) - ids.indexOf(b))[0];
  let bridge: Bridge | null = null;
  if (bridgeId && bc.get(bridgeId)! > 0) {
    const own = clusterOf.get(bridgeId)!;
    const other = new Map<string, number>();
    for (const p of touching(bridgeId)) { const c = clusterOf.get(p.a === bridgeId ? p.b : p.a)!; if (c !== own) other.set(c, (other.get(c) ?? 0) + p.weight); }
    const to = [...other].sort((a, b) => b[1] - a[1])[0][0];
    bridge = { id: bridgeId, title: title.get(bridgeId)!, links: touching(bridgeId).length, why: whyOf(touching(bridgeId)), joins: [own, to] };
  }
  return {
    clusters, stats: clusterStats(kg, clusters), shown, center, bridge,
    loose: ids.filter(id => touching(id).length === 0).map(id => ({ id, title: title.get(id)! })),
    guesses: predictLinks(kg, clusters, programs)
  };
}
