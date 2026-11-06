import { describe, expect, it } from 'vitest';
import { CATALOG, PROGRAM_BY_ID } from '../../data/catalog';
import { defaultLater } from './flow';
import { keyGain, rowLine } from './row';
import { DEFAULT_SEL, parseRecQuery, recQuery } from './url';

const p = (id: string) => PROGRAM_BY_ID[id];

describe('행 둘째 줄', () => {
  it('얻는 것 중 숫자가 있는 구체적인 것을 먼저 고른다', () => {
    const portfolio = CATALOG.programs.find(x => (x.gains ?? []).some(g => g.label === '1:1 피드백 15분'))!;
    expect(keyGain(portfolio)?.label).toBe('1:1 피드백 15분');
    expect(keyGain(p('p-interview'))?.label).toBe('인터뷰 정리 노트');
    expect(keyGain({ ...p('p-interview'), gains: [] })).toBeUndefined();
  });
  it('기록에 이어진 이유가 있으면 이유, 아니면 얻는 것', () => {
    const rec = { kind: 'energy' as const, label: '내 기록', detail: '사용성 테스트' };
    const novelty = { kind: 'novelty' as const, label: '탐색', detail: 'AI·데이터' };
    expect(rowLine(p('p-interview'), rec, false)).toEqual({ kind: 'why', text: '내 기록 ‘사용성 테스트’와 이어져요' });
    expect(rowLine(p('p-interview'), novelty, false)).toEqual({ kind: 'gain', text: '인터뷰 정리 노트' });
    expect(rowLine({ ...p('p-interview'), gains: [] }, novelty, false)?.kind).toBe('why');
  });
  it('새 학생은 행마다 다른 얻는 것을 보여 준다(이유가 모두 같아서)', () => {
    const novelty = { kind: 'novelty' as const, label: '탐색', detail: '처음 해 보는 AI·데이터' };
    const lines = CATALOG.programs.slice(0, 10).map(x => rowLine(x, novelty, true)?.text);
    expect(new Set(lines).size).toBeGreaterThan(5);
    expect(lines.every(t => !t?.startsWith('넓게 둘러보려고'))).toBe(true);
  });
});

describe('바로 미루기', () => {
  it('다음 주가 되면 다음 주, 아니면 마감 전 가장 늦은 날, 못 미루면 없음', () => {
    expect(defaultLater(14)?.days).toBe(7);
    expect(defaultLater(5)?.days).toBe(2);
    expect(defaultLater(1)).toBeUndefined();
  });
});

describe('추천 주소 상태', () => {
  it('읽고 쓰면 그대로, 기본값은 주소에서 뺀다', () => {
    const sel = { tab: 'all' as const, cat: 'edu' as const, sort: 'new' as const, open: 'p-interview' };
    const q = new URLSearchParams(Object.entries(recQuery(sel)).filter((e): e is [string, string] => !!e[1]));
    expect(parseRecQuery(q)).toEqual(sel);
    expect(recQuery(DEFAULT_SEL)).toEqual({ tab: undefined, cat: undefined, sort: undefined, open: undefined });
  });
  it('모르는 값은 기본값, 추천 활동 탭이면 칩·정렬을 주소에 안 남긴다', () => {
    expect(parseRecQuery(new URLSearchParams('tab=x&cat=zzz&sort=y'))).toEqual({ ...DEFAULT_SEL, open: undefined });
    expect(recQuery({ tab: 'picks', cat: 'edu', sort: 'new' }).cat).toBeUndefined();
  });
});
