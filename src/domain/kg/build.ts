import { AXES, FIELD_GROUP } from '../vocab';
import type { Axis, RecordItem } from '../types';
import { buildMap, type EdgeAnswers } from '../analysis/map';
import { sortRecords } from '../analysis/semester';
import { liveAxes } from '../analysis/strengths';
import { NO_LLM, type LlmProvider } from './llm';
import { keywordsIn, recordText } from './text';

// 지식 그래프 '생성'. 기록이 바뀔 때만 다시 만든다. 읽기(묶음·중심성·링크 예측)는 analyze.ts 가 한다.
// 노드: 활동(기록), 역량, 분야. 엣지: 규칙 엣지 + LLM 엣지 + 학생이 확인한 엣지. 엣지마다 출처·신뢰도·이유를 남긴다.
// 같은 입력이면 늘 같은 그래프다(난수 없음, 기록은 학기 순서).

export type KgOrigin = 'rule' | 'llm' | 'student';
/**
 * 활동 ↔ 활동: field(같은 분야) · axis(같은 확인 역량) · follow(다음 학기 같은 줄기) · series(같은 주최·시리즈) · keyword(공유 키워드) · semantic(LLM 의미 관계) · student(학생이 이었다고 확인)
 * 활동 → 역량: evidence. 활동 → 분야: inField.
 */
export type KgEdgeType = 'field' | 'axis' | 'follow' | 'series' | 'keyword' | 'semantic' | 'student' | 'evidence' | 'inField';
export type KgEdge = { id: string; type: KgEdgeType; from: string; to: string; weight: number; origin: KgOrigin; confidence: number; reason: string };
export type KgNode =
  | { id: string; kind: 'record'; label: string; record: RecordItem }
  | { id: string; kind: 'axis'; label: string; axis: Axis }
  | { id: string; kind: 'field'; label: string };
/** 활동 쌍 하나에 모인 엣지. 묶음·중심성은 이 무게(weight 합)로 계산한다. id 는 '앞 기록~뒤 기록'(학기 순서) */
export type KgPair = { id: string; a: string; b: string; weight: number; parts: KgEdge[]; origin: KgOrigin };
export type Kg = { records: RecordItem[]; nodes: KgNode[]; edges: KgEdge[]; pairs: KgPair[] };

/**
 * 무게 규칙(활동 ↔ 활동). 묶음을 정하는 데만 쓰고 화면에 숫자로 내지 않는다.
 * - 같은 세부 분야 1.0, 분야 묶음만 같으면 0.5: 분야는 가장 흔한 공통점이라 혼자서는 묶음을 다 정하지 못하게 낮게 둔다.
 * - 같은 확인 역량 하나에 0.3(최대 0.9): 학생이 확인한 근거만 센다(AI 추정 근거로는 잇지 않는다).
 * - 다음 학기 같은 줄기 1.0: 같은 분야 묶음에서 바로 앞뒤 기록. 같은 일까지 이어 했으면 +0.5.
 * - 같은 주최·시리즈 1.5: 같은 기회(programId)이거나 제목 앞부분('SW 학습 멘토링 · ')이 같거나 한 제목이 다른 제목을 품을 때. 가장 확실한 연결.
 * - 공유 키워드 하나에 0.4(최대 1.2): 사전 키워드가 두 글에 함께 나올 때.
 * - LLM 의미 관계 1.5 × 신뢰도: 규칙이 못 보는 연결(회고 문장 사이). 확인 전이라 신뢰도로 깎는다.
 * - 학생이 확인 +1.5: 학생이 '맞아요' 한 연결은 가장 무겁다. '아니에요' 한 쌍은 엣지를 모두 뺀다.
 */
export const W = { field: 1, fieldGroup: 0.5, axis: 0.3, axisMax: 0.9, follow: 1, followDid: 0.5, series: 1.5, keyword: 0.4, keywordMax: 1.2, llm: 1.5, student: 1.5 } as const;

export const pairId = (a: string, b: string) => `${a}~${b}`;
export const axisId = (a: Axis) => `ax:${a}`;
const fieldId = (g: string) => `fd:${g}`;

/** 같은 시리즈: 같은 기회, 같은 제목 앞부분(가운뎃점 앞), 한 제목이 다른 제목을 품음 */
function sameSeries(a: RecordItem, b: RecordItem): boolean {
  if (a.programId && a.programId === b.programId) return true;
  const head = (t: string) => t.split('·')[0].trim();
  if (a.title.includes('·') && b.title.includes('·') && head(a.title) === head(b.title)) return true;
  const short = a.title.length <= b.title.length ? a.title : b.title, long = short === a.title ? b.title : a.title;
  return short.length >= 4 && long.includes(short);
}

export type BuildOptions = { answers?: EdgeAnswers; llm?: LlmProvider };

export function buildKg(records: RecordItem[], { answers = {}, llm = NO_LLM }: BuildOptions = {}): Kg {
  const sorted = sortRecords(records);
  const order = new Map(sorted.map((r, i) => [r.id, i]));
  const edges: KgEdge[] = [];
  const rr: KgEdge[] = [];
  const add = (a: RecordItem, b: RecordItem, type: KgEdgeType, weight: number, origin: KgOrigin, confidence: number, reason: string) => {
    const [x, y] = order.get(a.id)! < order.get(b.id)! ? [a.id, b.id] : [b.id, a.id];
    rr.push({ id: `${pairId(x, y)}#${type}`, type, from: x, to: y, weight, origin, confidence, reason });
  };

  // 규칙 엣지
  const kw = new Map(sorted.map(r => [r.id, [...new Set(keywordsIn(recordText(r)).map(k => k.keyword))]]));
  const confirmed = (r: RecordItem) => (r.confirmedAxes ?? []).filter(x => liveAxes(r).includes(x));
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j];
      if (a.field === b.field) add(a, b, 'field', W.field, 'rule', 1, '같은 분야');
      else if (FIELD_GROUP[a.field] === FIELD_GROUP[b.field]) add(a, b, 'field', W.fieldGroup, 'rule', 1, '같은 분야 묶음');
      const shared = confirmed(a).filter(x => confirmed(b).includes(x));
      if (shared.length) add(a, b, 'axis', Math.min(W.axisMax, shared.length * W.axis), 'rule', 1, `확인한 역량 ${shared.map(x => AXES.find(v => v.id === x)!.label).join('·')}`);
      if (sameSeries(a, b)) add(a, b, 'series', W.series, 'rule', 1, '같은 시리즈');
      const words = kw.get(a.id)!.filter(k => kw.get(b.id)!.includes(k));
      if (words.length) add(a, b, 'keyword', Math.min(W.keywordMax, words.length * W.keyword), 'rule', 1, `함께 나온 말 ${words.slice(0, 3).join('·')}`);
    }
  }
  const byId = new Map(sorted.map(r => [r.id, r]));
  for (const e of buildMap(sorted).edges) {
    if (!e.reasons.includes('field')) continue;
    const both = e.reasons.includes('did');
    add(byId.get(e.a)!, byId.get(e.b)!, 'follow', W.follow + (both ? W.followDid : 0), 'rule', 1, both ? '다음 활동에서 같은 일을 이어 함' : '다음 활동으로 이어짐');
  }
  // LLM 엣지
  for (const l of llm.links(sorted)) {
    const a = byId.get(l.a), b = byId.get(l.b);
    if (a && b) add(a, b, 'semantic', W.llm * l.confidence, 'llm', l.confidence, l.reason);
  }
  // 학생이 확인한 엣지(맞아요). 아니에요는 쌍째 뺀다
  for (const [id, v] of Object.entries(answers)) {
    const [x, y] = id.split('~');
    const a = byId.get(x), b = byId.get(y);
    if (v === 'yes' && a && b) add(a, b, 'student', W.student, 'student', 1, '내가 이어졌다고 확인');
  }

  const pairs = new Map<string, KgPair>();
  for (const e of rr) {
    const id = pairId(e.from, e.to);
    if (answers[id] === 'no') continue;
    const p = pairs.get(id) ?? { id, a: e.from, b: e.to, weight: 0, parts: [], origin: 'rule' as KgOrigin };
    p.weight = Math.round((p.weight + e.weight) * 100) / 100;
    p.parts.push(e);
    pairs.set(id, p);
  }
  for (const p of pairs.values()) p.origin = p.parts.some(e => e.origin === 'student') ? 'student' : p.parts.some(e => e.origin === 'llm') ? 'llm' : 'rule';
  edges.push(...[...pairs.values()].flatMap(p => p.parts));

  // 활동 → 역량(근거), 활동 → 분야
  for (const r of sorted) {
    for (const a of liveAxes(r)) {
      const yes = !!r.confirmedAxes?.includes(a);
      edges.push({ id: `${r.id}>${a}`, type: 'evidence', from: r.id, to: axisId(a), weight: 1, origin: yes ? 'student' : 'llm', confidence: yes ? 1 : 0.6, reason: yes ? '내가 확인한 근거' : 'AI 가 추정한 근거' });
    }
    edges.push({ id: `${r.id}>fd`, type: 'inField', from: r.id, to: fieldId(FIELD_GROUP[r.field]), weight: 1, origin: 'rule', confidence: 1, reason: '분야' });
  }
  const groups = [...new Set(sorted.map(r => FIELD_GROUP[r.field]))];
  const nodes: KgNode[] = [
    ...sorted.map(r => ({ id: r.id, kind: 'record' as const, label: r.title, record: r })),
    ...AXES.map(a => ({ id: axisId(a.id), kind: 'axis' as const, label: a.label, axis: a.id })),
    ...groups.map(g => ({ id: fieldId(g), kind: 'field' as const, label: g }))
  ];
  return { records: sorted, nodes, edges, pairs: [...pairs.values()] };
}

/** 출처별 활동 ↔ 활동 엣지 수('어떻게 만들었나'에 쓴다) */
export function edgeCounts(kg: Kg): Record<KgOrigin, number> {
  const out: Record<KgOrigin, number> = { rule: 0, llm: 0, student: 0 };
  for (const p of kg.pairs) for (const e of p.parts) out[e.origin]++;
  return out;
}

/** 쌍 하나의 '왜' 요약: 규칙 n · AI m */
export function pairWhy(p: KgPair): { rule: number; llm: number; student: number } {
  return { rule: p.parts.filter(e => e.origin === 'rule').length, llm: p.parts.filter(e => e.origin === 'llm').length, student: p.parts.filter(e => e.origin === 'student').length };
}
