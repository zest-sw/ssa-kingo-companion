import type { ChallengeDef, ChallengeResult } from './index';

// 배지 벽의 한 칸이 어떤 모양인지 정한다. 점수·레벨·퍼센트는 만들지 않는다.

/** done 채움 / doing 아래 얇은 진행 막대 / locked 숨김('?') / idle 아직 시작 전 */
export type WallState = 'done' | 'doing' | 'locked' | 'idle';

export function wallState(r: ChallengeResult<ChallengeDef>): WallState {
  if (r.achieved) return 'done';
  if (r.def.hidden) return 'locked';
  return r.progress.value > 0 ? 'doing' : 'idle';
}

/** 진행 막대 채움 비율 0~1. 막대는 진행 중인 칸에만 그린다. */
export const fillRatio = (r: ChallengeResult<ChallengeDef>) => (r.progress.max > 0 ? Math.min(1, Math.max(0, r.progress.value / r.progress.max)) : 0);

/** 희귀도는 모서리를 깎는 정도로 보여 준다. 0 둥근 사각, 1 모서리 깎음, 2 많이 깎음 */
export const RARITY_STEP = { common: 0, uncommon: 1, rare: 2 } as const;
