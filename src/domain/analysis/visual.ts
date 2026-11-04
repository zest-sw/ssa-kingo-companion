import type { Discovery, FieldGroup, RecordItem } from '../types';
import { josa } from '../text';
import { DID_LABEL, FIELD_GROUP, GROUP_LABEL } from '../vocab';
import type { FlowRow, FlowSegment } from './flow';
import { buildGraph, graphHeadline } from './graph';
import type { EdgeAnswers } from './map';
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

// 테크 트리 머리말은 난이도 규칙과 함께 techtree.ts 에 있다. 요약 화면은 여기서 가져간다.
export { treeHeadline, treeValue } from './techtree';

/** 경험 지도 머리말: 가장 큰 묶음과 그 묶음이 가장 많이 근거가 된 역량. '사용자 리서치 → 소통 · 근거 4' */
export const mapHeadline = (records: RecordItem[], answers: EdgeAnswers = {}): string =>
  records.length === 0 ? '회고를 쓰면 활동 묶음이 생겨요' : graphHeadline(buildGraph(records, answers));

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
