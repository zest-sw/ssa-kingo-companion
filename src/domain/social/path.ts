import { levelOf, type Level } from '../analysis/level';
import type { Field } from '../types';

// 선배 활동 경로를 테크 트리처럼 짧게: 위에서 아래는 시간, 왼쪽에서 오른쪽은 심화 수준(입문 → 중급 → 심화).
// 단계는 테크 트리와 같은 규칙(levelOf)으로 정한다. 공개한 경로만 받는다.

export type PathStep = { title: string; field: Field; when: string; level?: Level };
export type PathNode = PathStep & { id: string; col: number };

export function pathNodes(path: PathStep[]): PathNode[] {
  return path.map((s, i) => ({ ...s, id: `step-${i}`, col: levelOf(s) - 1 }));
}

/** 그 사람이 경로를 공개했는지. 공개하지 않은 선배는 이름만 보이고 서랍이 열리지 않는다. */
export const canFollow = (p: { path?: PathStep[] }): p is { path: PathStep[] } => !!p.path && p.path.length > 0;
