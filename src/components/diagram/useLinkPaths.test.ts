import { describe, expect, it } from 'vitest';
import { linkPath } from './useLinkPaths';

describe('노드 잇는 선', () => {
  it('멀리 있는 노드로는 곧게 뻗다가 도착 앞 56px 에서만 휜다', () => {
    const d = linkPath({ right: 0, top: 0, height: 20 }, { left: 200, right: 260, top: 40, height: 20 });
    expect(d).toBe('M0 10 L144 10 C172 10 172 50 200 50');
  });
  it('가까우면 휘는 구간이 둘 사이 거리로 줄어든다', () => {
    expect(linkPath({ right: 0, top: 0, height: 20 }, { left: 20, right: 60, top: 0, height: 20 })).toBe('M0 10 L0 10 C10 10 10 10 20 10');
  });
  it('위아래로 겹치면 오른쪽 바깥으로 돌아간다', () => {
    expect(linkPath({ right: 100, top: 0, height: 20 }, { left: 40, right: 120, top: 40, height: 20 })).toBe('M100 10 C134 10 134 50 120 50');
  });
});
