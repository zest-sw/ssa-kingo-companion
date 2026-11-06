import type { Axis, FieldGroup, Program, RecordItem } from '../types';
import { AXES, FIELD_GROUP } from '../vocab';
import { analyzeKg, type KgAnalysis } from '../kg/analyze';
import { buildKg, pairWhy, type Kg, type KgOrigin } from '../kg/build';
import type { NameSource } from '../kg/labels';
import { mockLlm, type LlmProvider } from '../kg/llm';
import type { EdgeAnswers } from './map';
import { semesterKey, sortRecords } from './semester';
import { liveAxes, textOf } from './strengths';

// 경험 지도 화면 모델. 지식 그래프 생성(kg/build)과 분석(kg/analyze) 결과를 화면이 쓰는 노드·선·묶음으로 옮기는 얇은 어댑터다.
// 역량은 허브, 활동(기록)은 작은 노드. 선은 두 가지: 활동 →(근거)→ 역량, 활동 —(이어짐)— 활동(규칙·AI·내가 확인).
// 묶음은 Leiden 커뮤니티, 이름은 사전 키워드 우선·없으면 AI 제안. 점수가 아니라 개수만 센다.

export type AxisNode = { id: string; kind: 'axis'; axis: Axis; label: string; evidence: number };
export type RecordNode = { id: string; kind: 'record'; record: RecordItem; label: string; group: FieldGroup; cluster: string };
export type GraphNode = AxisNode | RecordNode;
/**
 * evidence: 활동 → 역량. follow: 활동 — 활동(지식 그래프에서 이어진 쌍). confirmed 가 아니면 AI 추정이다.
 * follow 는 origin(규칙으로 이음 · AI 가 이음 · 내가 확인)과 why(규칙 n · AI m), reasons(이유 문장)를 갖는다.
 */
export type GraphEdge = {
  id: string; kind: 'evidence' | 'follow'; from: string; to: string; confirmed: boolean;
  origin?: KgOrigin; why?: { rule: number; llm: number; student: number }; reasons?: { text: string; origin: KgOrigin }[];
};
/** source: 이름이 사전에서 왔나(taxonomy), AI 가 제안했나(llm). topic 은 맞은 사전 주제 id(kgTaxonomy), keywords 는 맞은 사전 키워드 */
export type Cluster = { id: string; name: string; recordIds: string[]; source: NameSource; topic?: string; keywords: string[]; summary?: string; confirmed?: boolean };
/** 학생이 AI 제안 이름에 한 답: 맞아요(ok) 또는 바꾼 이름 */
export type ClusterNameAnswers = Record<string, { ok?: boolean; name?: string }>;

/** 묶음 이름표 글자. 확인 전 AI 제안 이름은 'AI 제안: ' 을 붙인다(확인 전 AI 는 점선과 같은 뜻) */
export const clusterLabel = (c: Cluster) => (c.source === 'llm' && !c.confirmed ? `AI 제안: ${c.name}` : c.name);
/** AI 제안 이름은 사전 이름이 아니라서 학생이 확인해야 확정된다. 바꾼 이름은 학생이 정한 것이므로 확인으로 본다 */
export const isTentative = (c: Cluster) => c.source === 'llm' && !c.confirmed;

/** 학생 답을 묶음 이름에 덧입힌다. 사전 이름에는 답을 받지 않는다 */
export function withClusterNames(g: KnowledgeGraph, answers: ClusterNameAnswers): KnowledgeGraph {
  if (!Object.keys(answers).length) return g;
  const clusters = g.clusters.map(c => {
    const a = c.source === 'llm' ? answers[c.id] : undefined;
    return a ? { ...c, name: a.name?.trim() || c.name, confirmed: !!(a.ok || a.name?.trim()) } : c;
  });
  return { ...g, clusters };
}
export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[]; clusters: Cluster[]; kg: Kg; analysis: KgAnalysis };

export const RELATION_LABEL: Record<GraphEdge['kind'], string> = { evidence: '근거', follow: '이어짐' };
export const axisNodeId = (a: Axis) => `ax:${a}`;
export { MAX_CLUSTERS } from '../kg/analyze';

/**
 * 기록에서 지식 그래프를 만들고 분석한다. '아니에요'라고 한 근거·연결은 뺀다. 역량 허브는 근거가 없어도 여섯 개 다 둔다.
 * programs 는 '이어질 수 있는 활동'(링크 예측) 후보다. llm 은 기본이 모의 LLM(예시 값)이다.
 */
export function buildGraph(records: RecordItem[], answers: EdgeAnswers, programs: Program[] = [], llm: LlmProvider = mockLlm()): KnowledgeGraph {
  const sorted = sortRecords(records);
  const kg = buildKg(sorted, { answers, llm });
  const analysis = analyzeKg(kg, programs, llm);
  const clusters: Cluster[] = analysis.clusters.map(c => ({ id: c.id, name: c.name, recordIds: c.recordIds, source: c.source, topic: c.topic, keywords: c.keywords, summary: c.summary }));
  const clusterOf = new Map(clusters.flatMap(c => c.recordIds.map(id => [id, c.id] as const)));
  const follows: GraphEdge[] = analysis.shown.map(p => ({
    id: p.id, kind: 'follow', from: p.a, to: p.b, confirmed: p.origin === 'student', origin: p.origin, why: pairWhy(p),
    reasons: p.parts.map(e => ({ text: e.reason, origin: e.origin }))
  }));
  const evidence: GraphEdge[] = sorted.flatMap(r => liveAxes(r).map(a => ({
    id: `${r.id}>${a}`, kind: 'evidence' as const, from: r.id, to: axisNodeId(a), confirmed: !!r.confirmedAxes?.includes(a)
  })));
  const axes: AxisNode[] = AXES.map(a => ({ id: axisNodeId(a.id), kind: 'axis', axis: a.id, label: a.label, evidence: evidence.filter(e => e.to === axisNodeId(a.id)).length }));
  const recs: RecordNode[] = sorted.map(r => ({ id: r.id, kind: 'record', record: r, label: r.title, group: FIELD_GROUP[r.field], cluster: clusterOf.get(r.id) ?? '' }));
  return { nodes: [...axes, ...recs], edges: [...evidence, ...follows], clusters, kg, analysis };
}

/** 강조할 대상: 묶음 하나, 역량 하나, 또는 마우스를 올린 노드 하나 */
export type GraphFocus = { kind: 'cluster' | 'axis' | 'node'; id: string };
export type FocusSet = { nodes: Set<string>; edges: Set<string> };

/** 강조할 노드·선. 묶음이면 그 활동과 닿은 역량·선, 역량이면 그 근거 활동과 근거 선, 노드면 그 노드에 닿은 것 전부. */
export function focusSet(g: KnowledgeGraph, f: GraphFocus | null): FocusSet | null {
  if (!f) return null;
  const nodes = new Set<string>();
  const edges = new Set<string>();
  const touch = (keep: (e: GraphEdge) => boolean) => {
    for (const e of g.edges) if (keep(e)) { edges.add(e.id); nodes.add(e.from); nodes.add(e.to); }
  };
  if (f.kind === 'cluster') {
    const ids = new Set(g.clusters.find(c => c.id === f.id)?.recordIds ?? []);
    ids.forEach(i => nodes.add(i));
    touch(e => ids.has(e.from) && (e.kind === 'evidence' || ids.has(e.to)));
  } else if (f.kind === 'axis') {
    const id = axisNodeId(f.id as Axis);
    nodes.add(id);
    touch(e => e.to === id);
  } else {
    nodes.add(f.id);
    touch(e => e.from === f.id || e.to === f.id);
  }
  return { nodes, edges };
}

export type ClusterAxis = { axis: Axis; label: string; confirmed: number; estimated: number };
export type ClusterInsight = {
  cluster: Cluster;
  /** 근거가 된 역량. 확인한 근거 많은 순, 같으면 전체 근거 많은 순 */
  axes: ClusterAxis[];
  first: string;
  last: string;
  terms: number;
  groups: FieldGroup[];
  /** 대표 회고 문장(확인한 근거가 있는 기록, 에너지가 오른 기록, 최근 기록 순) */
  quotes: { recordId: string; title: string; text: string }[];
  /** 이 묶음에서 이어 갈 기회(추천 순서 그대로, 같은 분야나 같은 일) */
  next: Program[];
};

/** 묶음 하나의 분석: 어떤 역량의 근거가 됐나, 언제, 어느 분야, 대표 회고, 다음 기회. programs 는 추천 순서로 정렬된 후보다. */
export function clusterInsight(g: KnowledgeGraph, clusterId: string, programs: Program[], nQuotes = 2, nNext = 2): ClusterInsight | null {
  const cluster = g.clusters.find(c => c.id === clusterId);
  if (!cluster) return null;
  const recs = g.nodes.filter((n): n is RecordNode => n.kind === 'record' && n.cluster === clusterId).map(n => n.record);
  const ids = new Set(recs.map(r => r.id));
  const ev = g.edges.filter(e => e.kind === 'evidence' && ids.has(e.from));
  const axes = AXES
    .map((a, order) => {
      const mine = ev.filter(e => e.to === axisNodeId(a.id));
      return { order, row: { axis: a.id, label: a.label, confirmed: mine.filter(e => e.confirmed).length, estimated: mine.filter(e => !e.confirmed).length } };
    })
    .filter(x => x.row.confirmed + x.row.estimated > 0)
    .sort((a, b) => b.row.confirmed - a.row.confirmed || (b.row.confirmed + b.row.estimated) - (a.row.confirmed + a.row.estimated) || a.order - b.order)
    .map(x => x.row);
  const keys = recs.map(r => semesterKey(r.semester)).filter(k => !Number.isNaN(k));
  const terms = new Set(recs.map(r => r.semester)).size;
  const groups = [...new Set(recs.map(r => FIELD_GROUP[r.field]))];
  const confirmedOf = (r: RecordItem) => (r.confirmedAxes ?? []).filter(a => liveAxes(r).includes(a)).length;
  const quotes = [...recs]
    .map((r, i) => ({ r, i }))
    .sort((a, b) => confirmedOf(b.r) - confirmedOf(a.r) || Number(b.r.energy === 'up') - Number(a.r.energy === 'up') || b.i - a.i)
    .filter(x => x.r.quote || textOf(x.r))
    .slice(0, nQuotes)
    .map(({ r }) => ({ recordId: r.id, title: r.title, text: r.quote || textOf(r) }));
  const dids = new Set(recs.map(r => r.did));
  const done = new Set(recs.map(r => r.programId).filter(Boolean));
  const next = programs.filter(p => !done.has(p.id) && (groups.includes(FIELD_GROUP[p.field]) || p.did.some(d => dids.has(d)))).slice(0, nNext);
  const sem = (k: number) => recs.find(r => semesterKey(r.semester) === k)?.semester ?? '';
  return { cluster, axes, first: keys.length ? sem(Math.min(...keys)) : '', last: keys.length ? sem(Math.max(...keys)) : '', terms, groups, quotes, next };
}

/** 역량 하나의 근거 수(확인/추정). 역량 노드를 눌렀을 때 옆 칸 한 줄에 쓴다. */
export function axisCount(g: KnowledgeGraph, axis: Axis) {
  const ev = g.edges.filter(e => e.kind === 'evidence' && e.to === axisNodeId(axis));
  return { confirmed: ev.filter(e => e.confirmed).length, estimated: ev.filter(e => !e.confirmed).length };
}

/** 묶음에 든 분야(많은 순). 묶음 표시 점 색에 쓴다 */
export function clusterGroups(g: KnowledgeGraph, clusterId: string): FieldGroup[] {
  const count = new Map<FieldGroup, number>();
  for (const n of g.nodes) if (n.kind === 'record' && n.cluster === clusterId) count.set(n.group, (count.get(n.group) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export type MiniCluster = { id: string; name: string; groups: FieldGroup[] };
export type MiniLink = { cluster: string; axis: Axis; confirmed: boolean };
export type MiniGraph = { clusters: MiniCluster[]; axes: { axis: Axis; label: string }[]; links: MiniLink[] };

/**
 * 요약 판 작은 그림: 큰 묶음 nc 개(활동 점은 분야 색), 그 묶음들에서 근거가 가장 많이 나온 역량 na 개,
 * 묶음마다 근거가 많은 역량 둘까지 선으로 잇는다. 그 선에 확인한 근거가 하나라도 있으면 확인(실선).
 */
export function miniGraph(g: KnowledgeGraph, nc = 4, na = 3): MiniGraph {
  const recs = g.nodes.filter((n): n is RecordNode => n.kind === 'record');
  const clusters = g.clusters.slice(0, nc).map(c => ({ id: c.id, name: c.name, groups: recs.filter(r => r.cluster === c.id).map(r => r.group) }));
  const inCluster = new Map(recs.map(r => [r.id, r.cluster]));
  const ev = g.edges.filter(e => e.kind === 'evidence' && clusters.some(c => c.id === inCluster.get(e.from)));
  const total = (a: Axis) => ev.filter(e => e.to === axisNodeId(a)).length;
  const axes = AXES.filter(a => total(a.id) > 0).sort((a, b) => total(b.id) - total(a.id)).slice(0, na).map(a => ({ axis: a.id, label: a.label }));
  const links = clusters.flatMap(c => {
    const mine = ev.filter(e => inCluster.get(e.from) === c.id);
    return axes
      .map(a => ({ a, list: mine.filter(e => e.to === axisNodeId(a.axis)) }))
      .filter(x => x.list.length > 0)
      .sort((x, y) => y.list.length - x.list.length)
      .slice(0, 2)
      .map(x => ({ cluster: c.id, axis: x.a.axis, confirmed: x.list.some(e => e.confirmed) }));
  });
  // 허브를 이어진 묶음 줄의 평균 높이 순으로 세워 선이 덜 엇갈리게 한다
  const row = (a: Axis) => { const ls = links.filter(l => l.axis === a); return ls.reduce((n, l) => n + clusters.findIndex(c => c.id === l.cluster), 0) / Math.max(1, ls.length); };
  return { clusters, axes: [...axes].sort((a, b) => row(a.axis) - row(b.axis)), links };
}

/** 묶음 → 역량 요약 선 하나. count 는 그 묶음 활동이 그 역량의 근거가 된 수, confirmed 는 그중 학생이 확인한 수 */
export type ClusterLink = { id: string; cluster: string; axis: Axis; to: string; count: number; confirmed: number };

/**
 * 기본 화면에 그릴 묶음 → 역량 선. 개별 활동 선 수십 개 대신 묶음마다 근거가 많은 역량 perCluster 개까지(근거 min 개 이상).
 * 확인한 근거 많은 순, 같으면 근거 많은 순, 같으면 역량 순서.
 */
export function clusterLinks(g: KnowledgeGraph, perCluster = 3, min = 2): ClusterLink[] {
  const inCluster = new Map(g.nodes.filter((n): n is RecordNode => n.kind === 'record').map(n => [n.id, n.cluster]));
  return g.clusters.flatMap(c => {
    const ev = g.edges.filter(e => e.kind === 'evidence' && inCluster.get(e.from) === c.id);
    const list = AXES
      .map((a, order) => {
        const mine = ev.filter(e => e.to === axisNodeId(a.id));
        return { order, link: { id: `${c.id}=>${a.id}`, cluster: c.id, axis: a.id, to: axisNodeId(a.id), count: mine.length, confirmed: mine.filter(e => e.confirmed).length } };
      })
      .filter(x => x.link.count > 0)
      .sort((x, y) => y.link.confirmed - x.link.confirmed || y.link.count - x.link.count || x.order - y.order)
      .map(x => x.link);
    // 작은 묶음은 근거가 min 개에 못 미쳐도 가장 앞 역량 하나는 잇는다(묶음이 떠 있지 않게)
    const strong = list.filter(l => l.count >= min);
    return (strong.length ? strong : list.slice(0, 1)).slice(0, perCluster);
  });
}

/** 경험 지도 머리말(결론 한 문장): 가장 큰 묶음과 그 묶음이 가장 많이 근거가 된 역량. '사용자 리서치 활동에서 소통 근거가 4개 나왔어요'. 확인한 근거가 없으면 '확인 전'을 붙인다. */
export function graphHeadline(g: KnowledgeGraph): string {
  const top = g.clusters[0];
  if (!top) return '회고를 쓰면 활동 묶음이 생겨요';
  const link = clusterLinks(g, 1, 1).find(l => l.cluster === top.id);
  if (!link) return `${top.name} 활동 ${top.recordIds.length}개가 모였어요`;
  const label = AXES.find(a => a.id === link.axis)!.label;
  return `${top.name} 활동에서 ${label} 근거가 ${link.count}개 나왔어요${link.confirmed ? '' : ' · 확인 전'}`;
}

/** 강조한 선이 역량마다 몇 개 닿았나. 관계 이름을 선마다 붙이지 않고 허브 옆에 '근거 n' 으로 한 번만 쓴다. */
export function hubTags(g: KnowledgeGraph, hotEdges: Set<string>): { id: string; text: string }[] {
  const count = new Map<string, number>();
  for (const e of g.edges) if (e.kind === 'evidence' && hotEdges.has(e.id)) count.set(e.to, (count.get(e.to) ?? 0) + 1);
  return [...count].map(([id, n]) => ({ id, text: `${RELATION_LABEL.evidence} ${n}` }));
}
