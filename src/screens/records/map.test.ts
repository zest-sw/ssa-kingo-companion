import { describe, expect, it } from 'vitest';
import { SEED_RECORDS } from '../../data/seed';
import { mapDots, mapRows, mapTerms, previousTerm } from './map';

describe('previousTerm', () => {
  it('같은 해 안', () => { expect(previousTerm('2026-2')).toBe('2026-여름'); expect(previousTerm('2026-여름')).toBe('2026-1'); });
  it('해를 넘는다', () => expect(previousTerm('2026-1')).toBe('2025-2'));
});

describe('mapTerms', () => {
  it('기록이 없어도 지금 학기까지 세 칸', () => expect(mapTerms([], '2026-2').map(t => t.id)).toEqual(['2026-1', '2026-여름', '2026-2']));
  it('기록이 있는 학기가 더해지고 오래된 순이다', () => {
    const old = { ...SEED_RECORDS[0], semester: '2025-1' };
    expect(mapTerms([old], '2026-2').map(t => t.id)).toEqual(['2025-1', '2026-1', '2026-여름', '2026-2']);
  });
});

describe('mapRows', () => {
  it('다섯 분야는 늘 있다', () => expect(mapRows([]).map(r => r.id)).toEqual(['dev', 'ai', 'plan', 'mentor', 'global']));
  it('기타 기록이 있으면 줄이 생긴다', () => expect(mapRows([{ ...SEED_RECORDS[0], field: 'career' }]).at(-1)?.id).toBe('other'));
});

describe('mapDots', () => {
  const dots = mapDots(SEED_RECORDS);
  const terms = mapTerms(SEED_RECORDS, '2026-2').map(t => t.id);
  const rows = mapRows(SEED_RECORDS).map(r => r.id);
  it('기록 하나가 점 하나', () => expect(dots).toHaveLength(SEED_RECORDS.length));
  it('모든 점이 격자 안에 놓인다', () => {
    for (const d of dots) { expect(terms).toContain(d.col); expect(rows).toContain(d.row); }
  });
  it('학교 확인만 채운 점', () => {
    for (const r of SEED_RECORDS) expect(dots.find(d => d.id === r.id)?.filled).toBe(r.verification === 'school');
  });
});
