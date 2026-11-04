import { josa } from '../text';
import type { ChallengeDef, ChallengeResult } from './index';
import type { RuleId } from './rules';

// 프로필의 도전 과제 진행 키워드와 '다음 과제'. 점수·퍼센트·순위는 만들지 않는다.

type Named = ChallengeDef & { name: string };

/** 남은 만큼을 세는 말. 여러 단계인 과제만 있으면 된다. */
const UNIT: Partial<Record<RuleId, string>> = { threePaths: '곳', firstPlaces: '곳', twoCampus: '곳' };

const left = (r: ChallengeResult<Named>) => r.progress.max - r.progress.value;

/** 드러난 과제 중 아직 못 이룬 것. 진행이 있는 것 먼저, 남은 게 적은 순. 숨은 과제는 이름을 모르니 넣지 않는다. */
export function nextChallenges<T extends Named>(results: ChallengeResult<T>[], limit = 3): ChallengeResult<T>[] {
  const open = results.filter(r => !r.achieved && !r.def.hidden);
  const doing = open.filter(r => r.progress.value > 0).sort((a, b) => left(a) - left(b));
  const idle = open.filter(r => r.progress.value === 0);
  return [...doing, ...idle].slice(0, limit);
}

/** 도전 과제 키워드 한 줄(15자 안팎): '달성 2 · ‘세 갈래 길’ 1곳 남음'. 진행 중인 과제가 없으면 시작할 한 걸음. */
export function progressKeyword<T extends Named>(results: ChallengeResult<T>[]): string {
  const done = results.filter(r => r.achieved).length;
  if (done === results.length) return `달성 ${done} · 모두 달성`;
  const near = nextChallenges(results, 1)[0];
  if (near && near.progress.value > 0) return `달성 ${done} · ‘${near.def.name}’ ${left(near)}${UNIT[near.def.rule] ?? '번'} 남음`;
  return done === 0 ? '회고 하나로 첫 달성' : `달성 ${done} · 다음은 ‘${near?.def.name ?? ''}’`;
}
