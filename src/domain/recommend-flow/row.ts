import type { Gain, GainKind, Program } from '../types';
import { gainsOf } from './opportunities';
import { traceLine, type TraceNode } from './trace';

// 추천 행의 둘째 줄: 이유 한 줄과 얻는 것 중 그 기회에 더 뜻있는 하나.

/** 같은 숫자 없는 꼬리표끼리는 학생이 먼저 묻는 것부터. 숫자(금액·인원·시간)가 있으면 더 구체적이다. */
const SPECIFIC_ORDER: GainKind[] = ['money', 'job', 'mentor', 'output', 'people', 'cert', 'skill'];
const hasNumber = (g: Gain) => /\d/.test(g.label);

/** 얻는 것 중 가장 구체적인 하나. keyGain(포트폴리오 피드백) → '1:1 피드백 15분' */
export function keyGain(p: Program): Gain | undefined {
  const rank = (g: Gain) => (hasNumber(g) ? 0 : SPECIFIC_ORDER.length) + SPECIFIC_ORDER.indexOf(g.kind);
  return [...gainsOf(p)].sort((a, b) => rank(a) - rank(b))[0];
}

/** 내 기록·발견·진로·강점에 이어진 이유. 이게 있으면 이유가 얻는 것보다 그 학생에게 뜻있다. */
const RECORD_KINDS: TraceNode['kind'][] = ['energy', 'focus', 'career', 'strength'];

export type RowLine = { kind: 'why' | 'gain'; text: string };

/**
 * 행 둘째 줄. 기록에 이어진 이유가 있으면 그 이유, 아니면 얻는 것 하나.
 * 새 학생(기록 0)은 모든 행의 이유가 '넓게 둘러보려고 섞은 …'처럼 같아 차이가 없으니 얻는 것을 쓴다.
 */
export function rowLine(p: Program, node: TraceNode | undefined, newcomer: boolean): RowLine | undefined {
  const gain = keyGain(p);
  if (!newcomer && node && RECORD_KINDS.includes(node.kind)) return { kind: 'why', text: traceLine(node) };
  if (gain) return { kind: 'gain', text: gain.label };
  return node ? { kind: 'why', text: traceLine(node) } : undefined;
}
