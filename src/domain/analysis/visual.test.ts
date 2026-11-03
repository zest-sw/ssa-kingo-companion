import { describe, expect, it } from 'vitest';
import { discoveriesOf } from '../discoveries';
import { rec } from '../fixtures.test-util';
import type { Axis } from '../types';
import { buildFlow } from './flow';
import { buildStrengths, type Level } from './strengths';
import { buildTechTree } from './techtree';
import { discoveryPic, flowBars, flowHeadline, mapHeadline, mapPic, semesterShort, shortName, strengthDots, strengthHeadline, treeHeadline } from './visual';

const SELF: Record<Axis, Level> = { expertise: 'low', problem: 'low', communication: 'low', collaboration: 'low', self: 'low', creative: 'low' };
const recs = [
  rec('a', { did: 'listen', field: 'product', semester: '2026-1', title: '아주아주아주 긴 기록 이름' }),
  rec('b', { did: 'listen', field: 'product', semester: '2026-2', axes: ['communication', 'problem'] }),
  rec('c', { did: 'make', field: 'club', semester: '2026-2' })
];

describe('분석 요약 그림', () => {
  it('긴 이름은 자르고 학기는 줄여 쓴다', () => {
    expect(shortName('아주아주아주 긴 기록 이름', 9)).toBe('아주아주아주 긴…');
    expect(shortName('짧아요', 9)).toBe('짧아요');
    expect(semesterShort('2026-1')).toBe('26-1');
    expect(semesterShort('2026-여름')).toBe('26 여름');
  });
  it('테크 트리 머리말은 가장 많이 한 분야와 안 해 본 분야를 말한다', () => {
    const tree = buildTechTree({ records: recs, activities: [], candidates: [] });
    expect(treeHeadline(tree)).toBe('창업·기획 집중 · AI·데이터 미경험');
    expect(treeHeadline(buildTechTree({ records: [], activities: [], candidates: [] }))).toBe('회고를 쓰면 칸이 채워져요');
  });
  it('경험 지도는 최근 기록 max 개만 노드로 두고 같은 학기는 세로로 쌓는다', () => {
    const pic = mapPic(recs, {}, 2);
    expect(pic.nodes.map(n => n.id)).toEqual(['b', 'c']);
    expect(pic.nodes.map(n => n.row)).toEqual([0, 1]);
    expect(pic.rows).toBe(2);
    expect(mapHeadline(recs)).toBe('듣고 정리하기 → 기록 2');
    expect(mapHeadline([recs[0]])).toBe('같은 일을 한 기록을 기다려요');
  });
  it('경험 지도의 연결은 확인=실선, 추정=점선이고 아니라고 한 것은 뺀다', () => {
    const all = mapPic(recs, {});
    const edge = all.edges.find(e => e.id === 'a~b')!;
    expect(edge.confirmed).toBe(false);
    expect(mapPic(recs, { 'a~b': 'yes' }).edges.find(e => e.id === 'a~b')?.confirmed).toBe(true);
    expect(mapPic(recs, { 'a~b': 'no' }).edges.find(e => e.id === 'a~b')).toBeUndefined();
  });
  it('관심 흐름은 큰 조각에 이름을 붙이고 머리말은 몇 학기째인지 말한다', () => {
    const rows = buildFlow(recs, ['2026-1', '2026-2']);
    const bars = flowBars(rows);
    expect(bars[0].segments.filter(s => s.main)).toHaveLength(1);
    expect(bars[1].segments.filter(s => s.main)).toHaveLength(2);
    expect(bars[1].segments.find(s => s.main)?.name).toBe('창업·기획');
    expect(flowHeadline(rows)).toBe('26-1부터 창업·기획');
    expect(flowHeadline([])).toBe('회고를 쓰면 흐름이 보여요');
  });
  it('나의 강점은 기록 점과 내 생각 점을 따로 주고 다른 줄만 표시한다', () => {
    const rows = buildStrengths(recs, SELF);
    const dots = strengthDots(rows);
    expect(dots.find(d => d.axis === 'communication')).toMatchObject({ seen: 1, self: 1, differs: false });
    expect(strengthHeadline(buildStrengths([], SELF))).toBe('회고를 쓰면 역량이 보여요');
    expect(strengthHeadline(buildStrengths(recs, { ...SELF, communication: 'high' }))).toBe('소통: 기록 적음 · 내 생각 많음');
  });
  it('발견 도식은 짧은 질문과 근거 기록 이름을 준다', () => {
    const ds = discoveriesOf([rec('a', { did: 'make', title: '하나' }), rec('b', { did: 'make', title: '둘' }), rec('c', { did: 'make', title: '셋' }), rec('d', { did: 'make', title: '넷' })]);
    const pic = discoveryPic(ds[0], 3);
    expect(pic.question.endsWith('?')).toBe(true);
    expect(pic.evidence.length).toBeLessThanOrEqual(3);
    expect(pic.target).toBe('직접 만들기');
    expect(pic.evidence.length + pic.more).toBe(ds[0].evidence.length);
  });
});
