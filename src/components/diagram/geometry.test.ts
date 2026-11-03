import { describe, expect, it } from 'vitest';
import { assignLanes, dateLabel, dayNumber, edgeAlign, fractionOf, funnelRatios, groupIndices, isoOf, layoutGrid, pickTicks, segmentPercents, spreadPoints } from './geometry';

const OCT = { start: '2026-10-01', end: '2026-10-31' };

describe('날짜 → x', () => {
  it('날짜 번호는 왕복한다', () => {
    expect(isoOf(dayNumber('2026-10-15'))).toBe('2026-10-15');
    expect(dayNumber('2026-11-01') - dayNumber('2026-10-31')).toBe(1);
  });
  it('범위 안 비율', () => {
    expect(fractionOf('2026-10-01', OCT)).toBe(0);
    expect(fractionOf('2026-10-31', OCT)).toBe(1);
    expect(fractionOf('2026-10-16', OCT)).toBe(0.5);
  });
  it('범위 밖은 0 미만·1 초과, 길이 0 범위는 0', () => {
    expect(fractionOf('2026-09-30', OCT)).toBeLessThan(0);
    expect(fractionOf('2026-11-30', OCT)).toBeGreaterThan(1);
    expect(fractionOf('2026-10-05', { start: '2026-10-05', end: '2026-10-05' })).toBe(0);
  });
  it('날짜 라벨', () => expect(dateLabel('2026-10-05')).toBe('10월 5일'));
});

describe('눈금', () => {
  it('넓으면 매일, 좁으면 성기게', () => {
    const two = { start: '2026-11-01', end: '2026-11-15' };
    expect(pickTicks(two, 1400)).toHaveLength(15);
    const narrow = pickTicks(two, 300, 64);
    expect(narrow.length).toBeLessThan(5);
    expect(narrow[0]).toBe('2026-11-01');
  });
  it('눈금 사이 간격은 최소 간격 이상', () => {
    for (const w of [600, 900, 1280, 1600]) {
      const t = pickTicks(OCT, w, 72);
      const gap = (fractionOf(t[1], OCT) - fractionOf(t[0], OCT)) * w;
      expect(gap).toBeGreaterThanOrEqual(72);
    }
  });
  it('폭이 0 이면 시작 하나', () => expect(pickTicks(OCT, 0)).toEqual(['2026-10-01']));
});

describe('줄 나누기', () => {
  it('겹치면 아래 줄, 떨어지면 같은 줄', () => {
    expect(assignLanes([{ from: 0, to: 0 }, { from: 10, to: 10 }, { from: 100, to: 100 }], 32)).toEqual([0, 1, 0]);
  });
  it('입력 순서와 상관없이 왼쪽부터 놓는다', () => {
    expect(assignLanes([{ from: 100, to: 100 }, { from: 0, to: 50 }, { from: 60, to: 80 }], 16)).toEqual([0, 0, 1]);
  });
  it('빈 입력', () => expect(assignLanes([], 8)).toEqual([]));
});

describe('한 활동 묶음', () => {
  it('같은 키는 한 묶음, 키 없는 것은 혼자', () => {
    const keys = ['p1', undefined, 'p1', 'p2'];
    expect(groupIndices(keys.length, i => keys[i])).toEqual([[0, 2], [1], [3]]);
  });
  it('가까운 점은 최소 간격만큼 벌리고 가운데는 그대로', () => {
    const dx = spreadPoints([100, 110], 32);
    expect(dx[0]).toBe(-11);
    expect(dx[1]).toBe(11);
  });
  it('충분히 떨어진 점과 점 하나는 그대로', () => {
    expect(spreadPoints([0, 100], 32)).toEqual([0, 0]);
    expect(spreadPoints([50], 32)).toEqual([0]);
  });
});

describe('격자 배치', () => {
  it('칸에 나눠 담고 모르는 행·열은 따로', () => {
    const items = [{ id: 'a', row: 'dev', col: '2026-1' }, { id: 'b', row: 'dev', col: '2026-1' }, { id: 'c', row: 'ai', col: '2026-2' }, { id: 'x', row: 'nope', col: '2026-1' }];
    const { cells, dropped } = layoutGrid(['dev', 'ai'], ['2026-1', '2026-2'], items);
    expect(cells[0][0].items.map(i => i.id)).toEqual(['a', 'b']);
    expect(cells[1][1].items.map(i => i.id)).toEqual(['c']);
    expect(cells[0][1].items).toEqual([]);
    expect(dropped.map(i => i.id)).toEqual(['x']);
  });
});

describe('깔때기', () => {
  it('가장 큰 단계가 1, 앞 단계에서 남은 비율', () => {
    const r = funnelRatios([40, 20, 10, 0]);
    expect(r.map(p => p.ratio)).toEqual([1, 0.5, 0.25, 0]);
    expect(r.map(p => p.keptFromPrev)).toEqual([undefined, 0.5, 0.5, 0]);
  });
  it('모두 0 이면 막대 0, 앞이 0 이면 남은 비율 없음', () => {
    expect(funnelRatios([0, 0]).map(p => [p.ratio, p.keptFromPrev])).toEqual([[0, undefined], [0, undefined]]);
  });
});

describe('분야 비율', () => {
  it('합은 늘 100', () => {
    for (const v of [[1, 1, 1], [3, 2, 2, 1], [97, 2, 1], [1, 0, 0]]) expect(segmentPercents(v).reduce((a, b) => a + b, 0)).toBe(100);
    expect(segmentPercents([1, 1, 1])).toEqual([34, 33, 33]);
  });
  it('합이 0 이면 모두 0', () => expect(segmentPercents([0, 0])).toEqual([0, 0]));
});

describe('가장자리 정렬', () => {
  it('양 끝은 안쪽으로', () => expect([edgeAlign(0), edgeAlign(0.5), edgeAlign(1)]).toEqual(['start', 'center', 'end']));
});
