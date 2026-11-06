import { SEED_RECORDS } from '../../data/seed';
import { describe, expect, it } from 'vitest';
import { discoveriesOf } from '../discoveries';
import { rec } from '../fixtures.test-util';
import { AXES } from '../vocab';
import { buildFlow } from './flow';
import { buildGraph, clusterLinks } from './graph';
import type { Strength } from './strengths';
import { discoveryPic, flowBars, mapHeadline, semesterShort, shortName, strengthGlance } from './visual';

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
  it('경험 지도 머리말은 가장 큰 묶음과 그 묶음이 가장 많이 근거가 된 역량', () => {
    // 예시 학생: 가장 큰 묶음 이름, 그 묶음의 첫 요약 선 역량, 그 선의 근거 수
    const g = buildGraph(SEED_RECORDS, {});
    const top = clusterLinks(g, 1, 1).find(l => l.cluster === g.clusters[0].id)!;
    const label = AXES.find(a => a.id === top.axis)!.label;
    expect(mapHeadline(SEED_RECORDS)).toBe(`${g.clusters[0].name} 활동에서 ${label} 근거가 ${top.count}개 나왔어요${top.confirmed ? '' : ' · 확인 전'}`);
    expect(mapHeadline([])).toBe('회고를 쓰면 활동 묶음이 생겨요');
    expect(mapHeadline([rec('x', { field: 'research', did: 'listen', axes: ['communication'] })])).toBe('사용자 리서치 활동에서 소통 근거가 1개 나왔어요 · 확인 전');
  });
  it('관심 흐름은 큰 조각에 이름을 붙이고 머리말은 몇 학기째인지 말한다', () => {
    const rows = buildFlow(recs, ['2026-1', '2026-2']);
    const bars = flowBars(rows);
    expect(bars[0].segments.filter(s => s.main)).toHaveLength(1);
    expect(bars[1].segments.filter(s => s.main)).toHaveLength(2);
    expect(bars[1].segments.find(s => s.main)?.name).toBe('창업·기획');
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

describe('나의 강점 칸 머리말', () => {
  const s = (axis: Strength['axis'], label: string, confirmed: number, n: number) => ({ axis, label, confirmed, evidence: Array.from({ length: n }) }) as unknown as Strength;
  it('확인 근거 수로 말하고, 확인 전이면 후보라고 밝힌다', () => {
    expect(strengthGlance([s('problem', '문제해결', 10, 12), s('communication', '소통', 3, 8)])).toEqual({ text: '문제해결 · 확인 근거 10개', estimated: false });
    expect(strengthGlance([s('problem', '문제해결', 0, 2)])).toEqual({ text: '강점 후보 문제해결 · 확인 전', estimated: true });
    expect(strengthGlance([]).text).toBe('회고를 쓰면 강점이 보여요');
  });
});
