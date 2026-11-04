import type { Discovery, FieldGroup, RecordItem } from '../types';
import { josa } from '../text';
import { DID_LABEL, FIELD_GROUP, GROUP_LABEL } from '../vocab';
import type { FlowRow, FlowSegment } from './flow';
import { buildMap, edgeState, type EdgeAnswers, type ExperienceMap } from './map';
import { semesterKey } from './semester';
import type { TechTree } from './techtree';

// 나의 분석 요약 그림이 그릴 모양과 머리말(키워드 한 줄). 그림은 여기서 나온 값을 그대로 그린다.

/** 긴 이름은 n 글자에서 자르고 …을 붙인다. 그림 안 직접 라벨용 */
export const shortName = (s: string, n: number) => { const c = Array.from(s); return c.length > n ? `${c.slice(0, n - 1).join('')}…` : s; };

/** '2026-1' → '26-1', '2026-여름' → '26 여름' */
export function semesterShort(s: string): string {
  const [y, k] = s.split('-');
  const yy = y.slice(2);
  return k === '1' || k === '2' ? `${yy}-${k}` : `${yy} ${k}`;
}

function topBy<T>(list: T[], n: (t: T) => number): T | undefined {
  return list.reduce<T | undefined>((a, b) => (!a || n(b) > n(a) ? b : a), undefined);
}

/** 테크 트리 머리말: '창업·기획 집중 · 개발 미경험'. 해 본 분야가 없으면 다음 할 일. */
export function treeHeadline(tree: TechTree): string {
  const rows = tree.rows.filter(r => r.group !== 'other');
  // '+n' 으로 접힌 노드도 센다. 많이 한 분야일수록 많이 접혀서, 보이는 노드만 세면 순서가 뒤집힌다.
  const own = (r: (typeof rows)[number]) => [...r.cells, ...r.folds.flatMap(f => f.cells)].filter(c => c.kind !== 'candidate').length;
  const done = rows.map(r => ({ r, n: own(r) })).filter(x => x.n > 0);
  const top = topBy(done, x => x.n);
  if (!top) return '회고를 쓰면 가지가 자라요';
  const blank = rows.find(r => r.unknown);
  return blank ? `${top.r.label} 집중 · ${blank.label} 미경험` : `${top.r.label} 집중`;
}

export function treeValue(tree: TechTree): string | undefined {
  const blank = tree.rows.filter(r => r.unknown && r.group !== 'other').length;
  return blank ? `안 해 본 분야 ${blank}곳` : undefined;
}

export type MapPicNode = { id: string; label: string; group: FieldGroup; col: number; row: number };
export type MapPicEdge = { id: string; a: string; b: string; confirmed: boolean };
export type MapPic = { nodes: MapPicNode[]; edges: MapPicEdge[]; semesters: string[]; rows: number };

/** 경험 지도 그림: 기록 노드 최대 max 개(라벨을 12px 이상으로 읽히게 4개)(가장 최근 것부터), 학기는 가로, 같은 학기 노드는 세로로. 아니라고 한 연결은 뺀다. */
export function mapPic(records: RecordItem[], answers: EdgeAnswers, max = 4, map: ExperienceMap = buildMap(records), labelMax = 8): MapPic {
  const picked = map.nodes.slice(-max);
  const semesters = [...new Set(picked.map(n => n.record.semester))].sort((a, b) => semesterKey(a) - semesterKey(b));
  const used: number[] = semesters.map(() => 0);
  const nodes = picked.map(n => {
    const col = semesters.indexOf(n.record.semester);
    return { id: n.id, label: shortName(n.record.title, labelMax), group: FIELD_GROUP[n.record.field], col, row: used[col]++ };
  });
  const ids = new Set(nodes.map(n => n.id));
  const edges = map.edges
    .filter(e => ids.has(e.a) && ids.has(e.b) && edgeState(e, answers) !== 'rejected')
    .map(e => ({ id: e.id, a: e.a, b: e.b, confirmed: edgeState(e, answers) === 'confirmed' }));
  return { nodes, edges, semesters, rows: Math.max(1, ...used) };
}

/** 경험 지도 머리말: '듣고 정리하기 → 기록 3'. 같은 일이 둘 이상이어야 이어졌다고 한다. */
export function mapHeadline(records: RecordItem[]): string {
  if (records.length === 0) return '회고를 쓰면 점이 이어져요';
  const count = new Map<string, number>();
  for (const r of records) count.set(r.did, (count.get(r.did) ?? 0) + 1);
  const [did, n] = [...count].sort((a, b) => b[1] - a[1])[0];
  return n < 2 ? '같은 일을 한 기록을 기다려요' : `${DID_LABEL[did as RecordItem['did']]} → 기록 ${n}`;
}

const LABEL_SHARE = 0.33;
export type FlowBar = { semester: string; label: string; total: number; segments: (FlowSegment & { name: string; main: boolean })[] };

/** 관심 흐름 그림: 학기마다 가로 누적 막대. 가장 큰 조각과 3분의 1 넘는 조각(main)에 분야 이름을 붙인다. */
export function flowBars(rows: FlowRow[]): FlowBar[] {
  return rows.map(r => {
    const top = topBy(r.segments, s => s.count);
    return { semester: r.semester, label: semesterShort(r.semester), total: r.total, segments: r.segments.map(s => ({ ...s, name: GROUP_LABEL[s.group], main: s === top || s.share >= LABEL_SHARE })) };
  });
}

/** 관심 흐름 머리말: '26-1부터 창업·기획'. 마지막 학기의 가장 큰 분야가 몇 학기째인지로 '부터'/'에는'을 가른다. */
export function flowHeadline(rows: FlowRow[]): string {
  const seen = rows.filter(r => r.total > 0);
  if (seen.length === 0) return '회고를 쓰면 흐름이 보여요';
  const topOf = (r: FlowRow) => topBy(r.segments, s => s.count)!.group;
  const last = seen[seen.length - 1];
  const group = topOf(last);
  let from = seen.length - 1;
  while (from > 0 && topOf(seen[from - 1]) === group) from--;
  return from < seen.length - 1 ? `${semesterShort(seen[from].semester)}부터 ${GROUP_LABEL[group]}` : `${semesterShort(last.semester)}에는 ${GROUP_LABEL[group]}`;
}

export type DiscoveryPic = { question: string; evidence: { id: string; label: string; full: string }[]; more: number; target: string };

/** 확인할 발견 한 장의 짧은 질문과 근거 기록 → 발견 도식 값. 근거는 최근 기록부터(기록이 쌓여도 지금의 나를 보여 주게) */
export function discoveryPic(d: Discovery, shown = 3): DiscoveryPic {
  const did = DID_LABEL[d.did];
  const question = d.kind === 'up' ? `${did}, 하면 힘이 나요?` : `${did}${josa(did, '을', '를')} 자주 맡나요?`;
  return { question, evidence: [...d.evidence].reverse().slice(0, shown).map(r => ({ id: r.id, label: shortName(r.title, 11), full: r.title })), more: Math.max(0, d.evidence.length - shown), target: did };
}
