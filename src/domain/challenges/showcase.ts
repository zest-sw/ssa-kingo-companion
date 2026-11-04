import type { ChallengeDef, ChallengeResult } from './index';

// 프로필 쇼케이스(스팀 프로필 쇼케이스처럼 학생이 고른다). 총 개수·완료율은 만들지 않는다.

/** 전시 칸 수. 레벨에 따라 늘어나지 않는다. */
export const SHOWCASE_MAX = 3;

/** 고르기 서랍의 한 번 누름. 이미 있으면 빼고, 없으면 끝에 넣는다. 칸이 다 찼으면 그대로 둔다. */
export function pickShowcase(ids: string[], id: string, max = SHOWCASE_MAX): string[] {
  if (ids.includes(id)) return ids.filter(x => x !== id);
  return ids.length >= max ? ids : [...ids, id];
}

/** 숨은 과제 중 아직 못 이룬 것: 남은 개수와 보여 줄 힌트 한 줄(힌트가 있는 첫 과제). */
export function hiddenLeft<T extends ChallengeDef & { hint?: string }>(results: ChallengeResult<T>[]): { left: number; hint?: string } {
  const open = results.filter(r => r.def.hidden && !r.achieved);
  return { left: open.length, hint: open.find(r => r.def.hint)?.def.hint };
}
