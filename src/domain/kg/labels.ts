import { KG_TAXONOMY, type KgTopic } from '../../data/kgTaxonomy';
import type { RecordItem } from '../types';
import type { LlmProvider } from './llm';
import { recordText, tokens } from './text';

// 묶음 이름 정하기. '사전 키워드 우선, 없으면 LLM 제안, 학생이 확인'(조사 문서 4절).
// 1) 묶음 글에서 c-TF-IDF(BERTopic)로 대표 단어를 뽑는다. 2) 사전 주제와 맞춘다. 3) 임계값을 못 넘으면 LLM 이름 후보.

export type NameSource = 'taxonomy' | 'llm';
export type ClusterName = { name: string; source: NameSource; topic?: string; keywords: string[]; terms: string[]; summary?: string };

/**
 * c-TF-IDF: 묶음 하나를 문서 하나로 보고 W(t,c) = tf(t,c)/|c| × log(1 + A / f(t)).
 * A 는 묶음 하나의 평균 낱말 수, f(t) 는 모든 묶음에서 t 가 나온 수. 여러 묶음에 흔한 말은 낮아진다.
 * 돌려주는 값: 묶음마다 무게 순 대표 단어(상위 n).
 */
export function cTfIdf(docs: string[][], n = 10): { term: string; w: number }[][] {
  const tf = docs.map(d => { const m = new Map<string, number>(); for (const t of d) m.set(t, (m.get(t) ?? 0) + 1); return m; });
  const f = new Map<string, number>();
  for (const m of tf) for (const [t, c] of m) f.set(t, (f.get(t) ?? 0) + c);
  const A = docs.reduce((s, d) => s + d.length, 0) / Math.max(1, docs.length);
  return tf.map((m, i) => [...m]
    .map(([term, c]) => ({ term, w: (c / Math.max(1, docs[i].length)) * Math.log(1 + A / f.get(term)!) }))
    .sort((a, b) => b.w - a.w || a.term.localeCompare(b.term))
    .slice(0, n));
}

const hits = (term: string, kw: string) => { const k = kw.replace(/\s+/g, ''); return term.includes(k) || (term.length >= 2 && k.startsWith(term)); };

/**
 * 사전 주제 하나와 묶음이 얼마나 맞나(0~1).
 * coverage: 사전 키워드가 하나라도 나온 활동 비율. term: 대표 단어 무게 중 그 주제 키워드에 맞는 몫. 둘의 평균.
 * 분야가 그 주제 분야인 활동 비율도 coverage 에 반영한다(기회 DB 와 같은 태그 체계).
 */
export function topicScore(topic: KgTopic, records: RecordItem[], terms: { term: string; w: number }[]) {
  const texts = records.map(r => recordText(r).replace(/\s+/g, ''));
  const found = topic.keywords
    .map(k => ({ k, n: texts.filter(t => t.includes(k.replace(/\s+/g, ''))).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const covered = records.filter((r, i) => topic.fields.includes(r.field) || topic.keywords.some(k => texts[i].includes(k.replace(/\s+/g, '')))).length;
  const coverage = covered / Math.max(1, records.length);
  const total = terms.reduce((s, t) => s + t.w, 0) || 1;
  const term = terms.filter(t => topic.keywords.some(k => hits(t.term, k))).reduce((s, t) => s + t.w, 0) / total;
  return { score: (coverage + term) / 2, keywords: found.map(x => x.k) };
}

/** 사전 이름을 쓰는 기준: 점수 0.5 이상, 맞은 키워드 2개 이상(활동 하나뿐인 묶음은 1개) */
export const MATCH = { score: 0.5, keywords: 2 } as const;

/**
 * 묶음마다 이름을 정한다. 큰 묶음부터 사전 주제를 하나씩 차지한다(두 묶음이 같은 이름을 갖지 않게).
 * 사전에 맞지 않으면 LLM 이 이름 후보를 낸다('AI 제안 이름'). LLM 도 못 지으면 대표 단어로 짓고 출처는 llm 으로 둔다(확인 전).
 */
export function nameClusters(groups: RecordItem[][], llm: LlmProvider): ClusterName[] {
  const docs = groups.map(rs => rs.flatMap(r => tokens(recordText(r))));
  const terms = cTfIdf(docs);
  const order = groups.map((g, i) => i).sort((a, b) => groups[b].length - groups[a].length || a - b);
  const used = new Set<string>();
  const out: ClusterName[] = new Array(groups.length);
  for (const i of order) {
    const rs = groups[i];
    const termList = terms[i].map(t => t.term);
    const need = rs.length === 1 ? 1 : MATCH.keywords;
    const best = KG_TAXONOMY
      .map((t, at) => ({ t, at, ...topicScore(t, rs, terms[i]) }))
      .filter(x => !used.has(x.t.id) && x.score >= MATCH.score && x.keywords.length >= need)
      .sort((a, b) => b.score - a.score || a.at - b.at)[0];
    if (best) {
      used.add(best.t.id);
      out[i] = { name: best.t.name, source: 'taxonomy', topic: best.t.id, keywords: best.keywords.slice(0, 3), terms: termList };
      continue;
    }
    const ai = llm.nameCluster(rs.map(r => r.id), termList);
    out[i] = ai
      ? { name: ai.name, source: 'llm', keywords: [], terms: termList, summary: ai.summary }
      : { name: termList[0] ? `${termList[0]} 활동` : '이름 없는 묶음', source: 'llm', keywords: [], terms: termList };
  }
  return out;
}
