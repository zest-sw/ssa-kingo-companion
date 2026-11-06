import { describe, expect, it } from 'vitest';
import { dirOfKey, nearestInDirection, stepGroup, type KeyPt } from './keyNav';

//   a(0,0)   b(100,0)   c(200,0)
//            d(100,80)
//                       e(260,300)
const PTS: KeyPt[] = [
  { id: 'a', x: 0, y: 0 }, { id: 'b', x: 100, y: 0 }, { id: 'c', x: 200, y: 0 },
  { id: 'd', x: 100, y: 80 }, { id: 'e', x: 260, y: 300 }
];
const at = (id: string) => PTS.find(p => p.id === id)!;
const go = (id: string, dir: Parameters<typeof nearestInDirection>[2]) => nearestInDirection(PTS, at(id), dir, id);

describe('그림 안 방향키 이동', () => {
  it('그 방향의 가장 가까운 칸으로 간다', () => {
    expect(go('a', 'right')).toBe('b');
    expect(go('b', 'right')).toBe('c');
    expect(go('b', 'down')).toBe('d');
    expect(go('d', 'up')).toBe('b');
    expect(go('c', 'left')).toBe('b');
  });

  it('곧장 그 방향에 있는 칸을 비껴 있는 칸보다 먼저 고른다', () => {
    // d 에서 오른쪽: c(100, -80) 와 e(160, 220). 부채꼴 안은 c 뿐
    expect(go('d', 'right')).toBe('c');
  });

  it('부채꼴 안에 없으면 그쪽 반평면에서 고르고, 그쪽에 아무것도 없으면 제자리', () => {
    // d 에서 아래: e 는 오른쪽으로 많이 비껴 있지만 아래쪽에 있는 유일한 칸
    expect(go('d', 'down')).toBe('e');
    expect(go('a', 'left')).toBeUndefined();
    expect(go('a', 'up')).toBeUndefined();
  });

  it('칸이 아닌 자리(묶음 이름)에서도 시작할 수 있다', () => {
    expect(nearestInDirection(PTS, { x: 90, y: 40 }, 'down')).toBe('d');
  });

  it('무게가 큰 칸(이어짐 선)은 가까워도 활동보다 나중에 고른다', () => {
    const pts: KeyPt[] = [{ id: 'line', x: 40, y: 0, weight: 2 }, { id: 'rec', x: 70, y: 0 }];
    expect(nearestInDirection(pts, { x: 0, y: 0 }, 'right')).toBe('rec');
    expect(nearestInDirection([pts[0], { id: 'far', x: 200, y: 0 }], { x: 0, y: 0 }, 'right')).toBe('line');
  });

  it('방향키 이름을 방향으로 바꾼다', () => {
    expect(dirOfKey('ArrowLeft')).toBe('left');
    expect(dirOfKey('Enter')).toBeUndefined();
  });
});

describe('묶음 사이 이동 [ ]', () => {
  it('] 는 다음 묶음, [ 는 앞 묶음, 끝에서는 돈다', () => {
    expect(stepGroup(3, 0, true, 1)).toBe(1);
    expect(stepGroup(3, 2, true, 1)).toBe(0);
    expect(stepGroup(3, 0, true, -1)).toBe(2);
  });

  it('묶음 안 칸에서 [ 는 제 묶음 이름으로 먼저 간다', () => {
    expect(stepGroup(3, 1, false, -1)).toBe(1);
    expect(stepGroup(3, 1, false, 1)).toBe(2);
  });

  it('묶음 밖(역량)에서는 처음이나 끝 묶음으로, 묶음이 없으면 -1', () => {
    expect(stepGroup(3, -1, false, 1)).toBe(0);
    expect(stepGroup(3, -1, false, -1)).toBe(2);
    expect(stepGroup(0, -1, false, 1)).toBe(-1);
  });
});
