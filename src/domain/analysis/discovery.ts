import { discState } from '../discoveries';
import type { Confirm, Discovery } from '../types';

/** 학생이 '맞아요'로 확인해서 지금 추천에 쓰는 발견 수. 근거가 바뀐 것(changed)은 세지 않는다. */
export const usedCount = (discoveries: Discovery[], confirm: Record<string, Confirm>) => discoveries.filter(d => discState(d, confirm) === 'yes').length;

/**
 * 확인할 발견을 한 장씩 보여 줄 때 다음 장. `fromKey` 다음부터 한 바퀴 돌며 아직 답하지 않은(isOpen) 첫 발견을 찾는다.
 * `fromKey` 자신은 건너뛴다(방금 답한 장으로 되돌아오지 않게). 남은 게 없으면 undefined.
 */
export function nextToAsk<T extends { key: string }>(list: T[], isOpen: (d: T) => boolean, fromKey?: string): T | undefined {
  const at = fromKey === undefined ? -1 : list.findIndex(d => d.key === fromKey);
  for (let i = 1; i <= list.length; i++) {
    const d = list[(at + i + list.length) % list.length];
    if (d.key !== fromKey && isOpen(d)) return d;
  }
  return undefined;
}
