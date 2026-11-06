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

export type ChallengeTrack = {
  /** 달성한 과제 수(숨은 과제도 달성하면 센다) */
  done: number;
  /** 다음 과제. 다 이뤘으면 없다 */
  next?: { name: string; when: string };
};

/**
 * 프로필의 도전 과제 진행 그림: 달성한 칸 + 다음 칸 하나와, 다음 과제가 언제 열리는지 한 줄.
 * 열리는 때는 정해진 날(note)이 먼저, 진행 중이면 남은 만큼, 시작 전이면 조건이다. 점수·레벨·희귀도는 만들지 않는다.
 */
export function challengeTrack<T extends Named & { condition?: string; note?: string }>(results: ChallengeResult<T>[]): ChallengeTrack {
  const done = results.filter(r => r.achieved).length;
  const near = nextChallenges(results, 1)[0];
  if (!near) return { done };
  const { def } = near;
  const when = def.note ?? (near.progress.value > 0 ? `${left(near)}${UNIT[def.rule] ?? '번'} 더 하면 열려요` : def.condition ?? '');
  return { done, next: { name: def.name, when } };
}
