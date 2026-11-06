/**
 * 그림(경험 지도·테크 트리) 안 키보드 이동. 그림 전체가 Tab 한 번이고, 안에서는 방향키로 가까운 칸으로 옮긴다.
 * 화면 좌표(y 는 아래로 커짐)만 받는다. 그림마다 점을 모아 넘긴다.
 */
/** weight: 점수에 곱하는 값. 1 보다 크면 덜 고른다(경험 지도의 이어짐 선은 2: 방향키는 활동을 먼저 고른다) */
export type KeyPt = { id: string; x: number; y: number; weight?: number };
export type KeyDir = 'up' | 'down' | 'left' | 'right';

const DIRS: Record<string, KeyDir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
/** 'ArrowUp' → 'up'. 방향키가 아니면 undefined */
export const dirOfKey = (key: string): KeyDir | undefined => DIRS[key];

/** 옆 어긋남의 무게. 2 면 같은 거리라도 곧장 그 방향에 있는 칸을 먼저 고른다 */
const SIDE_WEIGHT = 2;

/**
 * from 에서 dir 쪽으로 가장 가까운 칸의 id. 그쪽에 아무것도 없으면 undefined(제자리에 머문다).
 * 먼저 45° 부채꼴 안에서 고르고, 없으면 그쪽 반평면 전체에서 고른다(멀리 비껴 있는 칸에도 갈 수 있게).
 * 점수 = (그 방향으로 간 거리 + 옆으로 어긋난 거리 × 2) × weight.
 */
export function nearestInDirection(points: KeyPt[], from: { x: number; y: number }, dir: KeyDir, skip?: string): string | undefined {
  const scored = points.flatMap(p => {
    if (p.id === skip) return [];
    const dx = p.x - from.x, dy = p.y - from.y;
    const ahead = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
    const side = Math.abs(dir === 'left' || dir === 'right' ? dy : dx);
    return ahead > 0.5 ? [{ id: p.id, ahead, side, score: (ahead + side * SIDE_WEIGHT) * (p.weight ?? 1) }] : [];
  });
  const pick = (list: typeof scored) => list.reduce<(typeof scored)[number] | undefined>((best, c) => (!best || c.score < best.score ? c : best), undefined);
  return (pick(scored.filter(c => c.side <= c.ahead)) ?? pick(scored))?.id;
}

/**
 * 묶음 사이 이동([ ]). at 은 지금 묶음 번호(묶음 밖이면 -1), inGroup 은 지금 칸이 묶음 이름 자체인지.
 * ']' 는 다음 묶음, '[' 는 앞 묶음. 묶음 안 칸에서 '[' 는 제 묶음 이름으로 먼저 간다. 끝에서는 돌아 처음으로.
 */
export function stepGroup(count: number, at: number, onName: boolean, delta: 1 | -1): number {
  if (count <= 0) return -1;
  if (at < 0) return delta > 0 ? 0 : count - 1;
  if (delta < 0 && !onName) return at;
  return (at + delta + count) % count;
}
