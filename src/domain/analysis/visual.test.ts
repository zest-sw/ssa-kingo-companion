import { SEED_RECORDS } from '../../data/seed';
import { describe, expect, it } from 'vitest';
import { discoveriesOf } from '../discoveries';
import { rec } from '../fixtures.test-util';
import { buildFlow } from './flow';
import { discoveryPic, flowBars, flowHeadline, mapHeadline, semesterShort, shortName } from './visual';

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
    expect(mapHeadline(SEED_RECORDS)).toBe('개발 → 협업 · 근거 2');
    expect(mapHeadline([])).toBe('회고를 쓰면 활동 묶음이 생겨요');
    expect(mapHeadline([rec('x', { field: 'research', did: 'listen', axes: ['communication'] })])).toBe('사용자 리서치 → 소통 · 근거 1 · 확인 전');
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
  it('발견 도식은 짧은 질문과 근거 기록 이름을 준다', () => {
    const ds = discoveriesOf([rec('a', { did: 'make', title: '하나' }), rec('b', { did: 'make', title: '둘' }), rec('c', { did: 'make', title: '셋' }), rec('d', { did: 'make', title: '넷' })]);
    const pic = discoveryPic(ds[0], 3);
    expect(pic.question.endsWith('?')).toBe(true);
    expect(pic.evidence.length).toBeLessThanOrEqual(3);
    expect(pic.target).toBe('직접 만들기');
    expect(pic.evidence.length + pic.more).toBe(ds[0].evidence.length);
  });
});
