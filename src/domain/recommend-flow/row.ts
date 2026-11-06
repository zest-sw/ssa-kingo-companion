import type { Gain, GainKind, Program } from '../types';
import { gainsOf } from './opportunities';

// 얻는 것 중 그 기회에 더 뜻있는 것. 행 둘째 줄의 이유 고르기는 reasons.ts 가 맡는다.

/** 같은 숫자 없는 꼬리표끼리는 학생이 먼저 묻는 것부터. 숫자(금액·인원·시간)가 있으면 더 구체적이다. */
const SPECIFIC_ORDER: GainKind[] = ['money', 'job', 'mentor', 'output', 'people', 'cert', 'skill'];
const hasNumber = (g: Gain) => /\d/.test(g.label);

/** 얻는 것을 구체적인 것부터 n개. 종류가 겹치지 않게 고른다(가장 추천 카드는 둘). */
export function keyGains(p: Program, n: number): Gain[] {
  const rank = (g: Gain) => (hasNumber(g) ? 0 : SPECIFIC_ORDER.length) + SPECIFIC_ORDER.indexOf(g.kind);
  const sorted = [...gainsOf(p)].sort((a, b) => rank(a) - rank(b));
  return sorted.filter((g, i) => sorted.findIndex(x => x.kind === g.kind) === i).slice(0, n);
}

/** 얻는 것 중 가장 구체적인 하나. keyGain(포트폴리오 피드백) = '1:1 피드백 15분' */
export const keyGain = (p: Program): Gain | undefined => keyGains(p, 1)[0];
