import { progressOf, type ChallengeContext, type Progress, type RuleId } from './rules';

export type { ChallengeContext, Progress, RuleId } from './rules';

export type ChallengeDef = { id: string; rule: RuleId; hidden: boolean };
export type ChallengeResult<T extends ChallengeDef = ChallengeDef> = { def: T; progress: Progress; achieved: boolean };

export function evaluate<T extends ChallengeDef>(defs: T[], ctx: ChallengeContext): ChallengeResult<T>[] {
  return defs.map(def => {
    const progress = progressOf(def.rule, ctx);
    return { def, progress, achieved: progress.value >= progress.max };
  });
}

/** 숨은 과제는 막대를 보이지 않으니, 진행 중 칸은 드러난 과제만 센다. */
export const isInProgress = (r: ChallengeResult) => !r.achieved && !r.def.hidden && r.progress.value > 0;

/** 이번에 새로 달성한 것. seen 은 이미 알린 id. */
export const newlyAchieved = <T extends ChallengeDef>(results: ChallengeResult<T>[], seen: ReadonlySet<string>) =>
  results.filter(r => r.achieved && !seen.has(r.def.id));

/** 전시는 달성한 과제만 된다. 달성이 풀리거나 없는 id 는 목록에서 거른다. */
export const showcaseable = (results: ChallengeResult[], ids: string[]) => {
  const ok = new Set(results.filter(r => r.achieved).map(r => r.def.id));
  return ids.filter(id => ok.has(id));
};
