import type { Axis, Did, Field, FieldGroup, Program, RecordItem } from '../types';
import { AXES, FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { buildMap, edgeState, type EdgeAnswers } from './map';
import { semesterKey, sortRecords } from './semester';
import { liveAxes, textOf } from './strengths';

// 경험 지도(v1.9): 지식 그래프. 역량은 허브, 활동(기록)은 작은 노드.
// 선은 두 가지다. 활동 →(근거)→ 역량, 활동 →(이어짐)→ 다음 활동. 관련 활동은 묶음(클러스터)으로 모은다.
// 묶음은 '이 활동들이 어떤 역량의 근거가 됐나'를 한 번에 보려고 만든다. 점수가 아니라 개수만 센다.

export type AxisNode = { id: string; kind: 'axis'; axis: Axis; label: string; evidence: number };
export type RecordNode = { id: string; kind: 'record'; record: RecordItem; label: string; group: FieldGroup; cluster: string };
export type GraphNode = AxisNode | RecordNode;
/** evidence: 활동 → 역량. follow: 앞 활동 → 뒤 활동(같은 일·같은 분야를 이어서 했다). confirmed 가 아니면 AI 추정이다. */
export type GraphEdge = { id: string; kind: 'evidence' | 'follow'; from: string; to: string; confirmed: boolean };
export type Cluster = { id: string; name: string; recordIds: string[] };
export type KnowledgeGraph = { nodes: GraphNode[]; edges: GraphEdge[]; clusters: Cluster[] };

export const RELATION_LABEL: Record<GraphEdge['kind'], string> = { evidence: '근거', follow: '이어짐' };
export const axisNodeId = (a: Axis) => `ax:${a}`;
/** 묶음 목록은 덩어리 안 항목 상한(5개)을 넘지 않는다. */
export const MAX_CLUSTERS = 5;

type Theme = { id: string; name: string };
const THEMES: Record<string, Theme> = {
  research: { id: 'research', name: '사용자 리서치' },
  plan: { id: 'plan', name: '서비스 기획' },
  data: { id: 'data', name: '데이터 분석' },
  devBasic: { id: 'devBasic', name: '개발 기초' },
  devMake: { id: 'devMake', name: '개발 프로젝트' },
  share: { id: 'share', name: '멘토링·나눔' },
  club: { id: 'club', name: '동아리 활동' },
  global: { id: 'global', name: '글로벌 교류' },
  career: { id: 'career', name: '진로 탐색' }
};
const THEME_ORDER = Object.keys(THEMES);

/** 처음 묶는 규칙: 세부 분야와 한 일. 개발은 '배운 것'과 '만든 것', '가르친 것'으로 나눈다. */
function themeOf(field: Field, did: Did): Theme {
  if (field === 'research') return THEMES.research;
  if (field === 'product' || field === 'startup') return THEMES.plan;
  if (field === 'data' || field === 'ai') return THEMES.data;
  if (field === 'dev') return did === 'present' ? THEMES.share : did === 'make' || did === 'idea' ? THEMES.devMake : THEMES.devBasic;
  if (field === 'mentor') return THEMES.share;
  if (field === 'club') return THEMES.club;
  if (field === 'global') return THEMES.global;
  return THEMES.career;
}

/** 두 활동이 얼마나 닮았나: 같은 분야 2, 같은 역량 하나에 1, 같은 일 1, 이어진 활동 3. 묶음을 합칠 때만 쓴다(화면에 내지 않는다). */
function likeness(a: RecordItem, b: RecordItem, linked: boolean) {
  const shared = liveAxes(a).filter(x => liveAxes(b).includes(x)).length;
  return (FIELD_GROUP[a.field] === FIELD_GROUP[b.field] ? 2 : 0) + shared + (a.did === b.did ? 1 : 0) + (linked ? 3 : 0);
}

/**
 * 같은 일을 같은 분야에서 이어서 한 활동끼리, 그리고 학생이 '맞아요' 한 연결만 '이어짐'으로 잇는다.
 * 같은 일만, 같은 분야만 겹친 것까지 그으면 선이 너무 많아진다.
 */
export function followEdges(records: RecordItem[], answers: EdgeAnswers): GraphEdge[] {
  return buildMap(records).edges
    .filter(e => edgeState(e, answers) === 'confirmed' || (e.reasons.includes('did') && e.reasons.includes('field') && edgeState(e, answers) !== 'rejected'))
    .map(e => ({ id: e.id, kind: 'follow' as const, from: e.a, to: e.b, confirmed: edgeState(e, answers) === 'confirmed' }));
}

/**
 * 관련 활동 묶음. 규칙으로 먼저 나누고(themeOf), 활동 하나뿐인 묶음은 가장 닮은 묶음에 합치고,
 * 묶음이 MAX_CLUSTERS 를 넘으면 작은 묶음부터 가장 닮은 묶음에 합친다. 같은 기록이면 늘 같은 결과다.
 * 합친 묶음이 모두 한 분야면 분야 이름(예: 개발), 아니면 큰 쪽 이름을 쓴다.
 */
export function clusterRecords(records: RecordItem[], follows: GraphEdge[] = []): Cluster[] {
  const linked = new Set(follows.map(e => `${e.from}~${e.to}`));
  const isLinked = (a: string, b: string) => linked.has(`${a}~${b}`) || linked.has(`${b}~${a}`);
  const byId = new Map(records.map(r => [r.id, r]));
  type Draft = { id: string; name: string; ids: string[] };
  let drafts: Draft[] = THEME_ORDER
    .map(t => ({ id: t, name: THEMES[t].name, ids: sortRecords(records).filter(r => themeOf(r.field, r.did).id === t).map(r => r.id) }))
    .filter(d => d.ids.length > 0);

  const sim = (x: Draft, y: Draft) => {
    let sum = 0;
    for (const a of x.ids) for (const b of y.ids) sum += likeness(byId.get(a)!, byId.get(b)!, isLinked(a, b));
    return sum / (x.ids.length * y.ids.length);
  };
  const merge = (small: Draft) => {
    const rest = drafts.filter(d => d !== small);
    const into = rest.reduce((best, d) => (sim(small, d) > sim(small, best) ? d : best), rest[0]);
    const ids = sortRecords([...into.ids, ...small.ids].map(i => byId.get(i)!)).map(r => r.id);
    const groups = new Set(ids.map(i => FIELD_GROUP[byId.get(i)!.field]));
    // 활동 하나를 받아들인 묶음은 제 이름을 지킨다. 두 묶음이 합쳐졌는데 한 분야뿐이면 분야 이름이 더 정확하다.
    const name = small.ids.length > 1 && groups.size === 1 ? GROUP_LABEL[[...groups][0]] : into.ids.length >= small.ids.length ? into.name : small.name;
    drafts = rest.map(d => (d === into ? { id: into.id, name, ids } : d));
  };
  // 작은 것부터. 같은 크기면 다른 묶음과 가장 닮은 것(합쳐도 어색하지 않은 것)부터.
  const smallest = (pool: Draft[]) => pool.reduce((a, b) => {
    if (b.ids.length !== a.ids.length) return b.ids.length < a.ids.length ? b : a;
    const best = (d: Draft) => Math.max(...drafts.filter(o => o !== d).map(o => sim(d, o)));
    return best(b) > best(a) ? b : a;
  });

  while (drafts.length > 1 && drafts.some(d => d.ids.length === 1)) merge(smallest(drafts.filter(d => d.ids.length === 1)));
  while (drafts.length > MAX_CLUSTERS) merge(smallest(drafts));
  return drafts
    .sort((a, b) => b.ids.length - a.ids.length || THEME_ORDER.indexOf(a.id) - THEME_ORDER.indexOf(b.id))
    .map(d => ({ id: d.id, name: d.name, recordIds: d.ids }));
}

/** 기록에서 지식 그래프를 만든다. '아니에요'라고 한 근거·연결은 뺀다. 역량 허브는 근거가 없어도 여섯 개 다 둔다. */
export function buildGraph(records: RecordItem[], answers: EdgeAnswers): KnowledgeGraph {
  const sorted = sortRecords(records);
  const follows = followEdges(sorted, answers);
  const clusters = clusterRecords(sorted, follows);
  const clusterOf = new Map(clusters.flatMap(c => c.recordIds.map(id => [id, c.id] as const)));
  const evidence: GraphEdge[] = sorted.flatMap(r => liveAxes(r).map(a => ({
    id: `${r.id}>${a}`, kind: 'evidence' as const, from: r.id, to: axisNodeId(a), confirmed: !!r.confirmedAxes?.includes(a)
  })));
  const axes: AxisNode[] = AXES.map(a => ({ id: axisNodeId(a.id), kind: 'axis', axis: a.id, label: a.label, evidence: evidence.filter(e => e.to === axisNodeId(a.id)).length }));
  const recs: RecordNode[] = sorted.map(r => ({ id: r.id, kind: 'record', record: r, label: r.title, group: FIELD_GROUP[r.field], cluster: clusterOf.get(r.id) ?? '' }));
  return { nodes: [...axes, ...recs], edges: [...evidence, ...follows], clusters };
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

/** 요약 카드 머리말: 가장 큰 묶음과 그 묶음이 가장 많이 근거가 된 역량. '사용자 리서치 → 소통 · 근거 4'. 확인한 근거가 없으면 '확인 전'을 붙인다. */
export function graphHeadline(g: KnowledgeGraph): string {
  const top = g.clusters[0];
  if (!top) return '회고를 쓰면 활동 묶음이 생겨요';
  const link = clusterLinks(g, 1, 1).find(l => l.cluster === top.id);
  if (!link) return `${top.name} · 활동 ${top.recordIds.length}개`;
  const label = AXES.find(a => a.id === link.axis)!.label;
  return `${top.name} → ${label} · 근거 ${link.count}${link.confirmed ? '' : ' · 확인 전'}`;
}

/** 강조한 선이 역량마다 몇 개 닿았나. 관계 이름을 선마다 붙이지 않고 허브 옆에 '근거 n' 으로 한 번만 쓴다. */
export function hubTags(g: KnowledgeGraph, hotEdges: Set<string>): { id: string; text: string }[] {
  const count = new Map<string, number>();
  for (const e of g.edges) if (e.kind === 'evidence' && hotEdges.has(e.id)) count.set(e.to, (count.get(e.to) ?? 0) + 1);
  return [...count].map(([id, n]) => ({ id, text: `${RELATION_LABEL.evidence} ${n}` }));
}
