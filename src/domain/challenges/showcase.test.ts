import { describe, expect, it } from 'vitest';
import { hiddenLeft, pickShowcase, SHOWCASE_MAX } from './showcase';
import { previousTerm, semesterReplay } from './replay';

describe('pickShowcase', () => {
  it('없으면 끝에 넣고, 있으면 뺀다', () => {
    expect(pickShowcase(['a'], 'b')).toEqual(['a', 'b']);
    expect(pickShowcase(['a', 'b'], 'a')).toEqual(['b']);
  });
  it(`${SHOWCASE_MAX}칸이 다 차면 더 넣지 않는다`, () => {
    expect(pickShowcase(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c']);
    expect(pickShowcase(['a', 'b', 'c'], 'c')).toEqual(['a', 'b']);
  });
});

describe('hiddenLeft', () => {
  const r = (id: string, hidden: boolean, achieved: boolean, hint?: string) => ({ def: { id, rule: 'firstRetro' as const, hidden, hint }, progress: { value: 0, max: 1 }, achieved });
  it('못 이룬 숨은 과제만 세고, 힌트가 있는 첫 과제의 힌트를 준다', () => {
    const out = hiddenLeft([r('a', false, false, '보임'), r('b', true, true, '이룸'), r('c', true, false), r('d', true, false, '다시')]);
    expect(out).toEqual({ left: 2, hint: '다시' });
  });
  it('힌트가 없으면 개수만', () => {
    expect(hiddenLeft([r('c', true, false)])).toEqual({ left: 1, hint: undefined });
  });
});

describe('semesterReplay', () => {
  const rec = (semester: string, field: 'dev' | 'ai' | 'club', did: 'make' | 'listen' | 'present', source: 'agent' | 'seed' = 'agent') => ({ semester, field, did, source });
  it('정규 학기만 거슬러 간다', () => {
    expect(previousTerm('2026-2')).toBe('2026-1');
    expect(previousTerm('2026-1')).toBe('2025-2');
  });
  it('지난 학기의 나와 기록·처음 해 본 분야·역할 종류를 센다', () => {
    const out = semesterReplay([
      rec('2025-2', 'dev', 'listen'),
      rec('2026-1', 'dev', 'make'), rec('2026-1', 'ai', 'listen'),
      rec('2026-여름', 'club', 'make'),
      rec('2026-2', 'club', 'present'), rec('2026-2', 'ai', 'make'), rec('2026-2', 'ai', 'make'),
      rec('2026-2', 'dev', 'listen', 'seed')
    ], '2026-2');
    expect(out?.before).toBe('2026-1');
    expect(out?.metrics).toEqual([
      { id: 'records', label: '기록', before: 2, now: 3 },
      // 2026-1 의 ai 는 처음, 2026-2 의 club 은 여름에 이미 해 봤다
      { id: 'newFields', label: '처음 해 본 분야', before: 1, now: 0 },
      { id: 'roles', label: '해 본 역할', before: 2, now: 2 }
    ]);
  });
  it('두 학기 모두 기록이 없으면 빈 상태', () => {
    expect(semesterReplay([rec('2024-1', 'dev', 'make')], '2026-2')).toBeUndefined();
  });
});
