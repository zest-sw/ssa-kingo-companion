import { describe, expect, it } from 'vitest';
import { prog, rec } from '../fixtures.test-util';
import { buildStrengths } from '../analysis/strengths';
import { buildTechTree } from '../analysis/techtree';
import type { FieldGroup, RecordItem } from '../types';
import { pickGap } from './gap';

/** 창업·기획 입문·중급을 채워 두는 기록(건너뛴 단계가 먼저 잡히지 않게) */
const steps = [rec('s1', { field: 'research', did: 'listen', title: '특강', level: 1, semester: '2025-1' }), rec('s2', { field: 'research', did: 'ask', title: '설문', level: 2, semester: '2025-1' })];
const gapOf = (records: RecordItem[], goal: FieldGroup[], now = '2026-2') =>
  pickGap({ tree: buildTechTree({ records, activities: [], candidates: [] }), strengths: buildStrengths(records), records, goal, programs: [], now });

describe('pickGap: 경험의 빈 곳 먼저, 확인 전 근거는 맨 마지막', () => {
  it('목표 분야에서 팀을 이끈 적이 없으면 그것을 기회처럼 말한다', () => {
    const records = [
      ...steps,
      rec('a', { field: 'product', did: 'organize', title: '팀 과제', level: 2, semester: '2026-1' }),
      rec('b', { field: 'research', did: 'present', title: '결과 발표', level: 3, semester: '2026-2' })
    ];
    expect(gapOf(records, ['plan'])).toMatchObject({ kind: 'type', line: '아직 창업·기획 쪽에서 팀을 이끌어 본 적은 없어요', need: { group: 'plan', dids: ['organize'], minLevel: 2 } });
  });

  it('만든 것이 있는데 그 뒤로 사용자에게 듣거나 묻지 않았으면 검증의 빈 곳', () => {
    const records = [rec('a', { field: 'product', did: 'make', title: '해커톤', level: 2, semester: '2026-2' }), rec('b', { field: 'research', did: 'listen', title: '인터뷰', level: 1, semester: '2026-1' })];
    expect(gapOf(records, ['plan'])?.line).toBe('아직 만든 것을 사용자에게 직접 검증해 본 적은 없어요');
  });

  it('다른 분야를 한 번만 하고 이어지지 않았으면 그것을, 이번 학기 것은 빼고', () => {
    const base = [
      ...steps,
      rec('a', { field: 'product', did: 'organize', title: '리드', level: 3, semester: '2026-1' }),
      rec('b', { field: 'research', did: 'present', title: '발표', level: 3, semester: '2026-1' })
    ];
    expect(gapOf([...base, rec('g', { field: 'global', did: 'listen', title: '교류', level: 1, semester: '2025-2' })], ['plan'])?.line).toBe('글로벌은 한 번 해 보고 아직 이어지지 않았어요');
    expect(gapOf([...base, rec('g', { field: 'global', did: 'listen', title: '교류', level: 1, semester: '2026-2' })], ['plan'])?.kind).not.toBe('once');
  });

  it('경험의 빈 곳이 없을 때만 확인 전 근거를 말한다', () => {
    const records = [
      rec('a', { field: 'product', did: 'organize', title: '리드', level: 3, semester: '2026-1', axes: ['problem'] }),
      rec('b', { field: 'research', did: 'present', title: '발표', level: 3, semester: '2026-1', axes: ['problem'] }),
      rec('c', { field: 'research', did: 'ask', title: '조사', level: 3, semester: '2026-2', axes: ['problem'] })
    ];
    // 창업·기획 입문·중급을 건너뛰어 목표 분야의 건너뛴 단계가 먼저다
    expect(gapOf(records, ['plan'])?.kind).toBe('skipped');
    expect(gapOf([...steps, ...records], ['plan'])).toMatchObject({ kind: 'estimate', line: '문제해결 근거 3개는 아직 내 확인을 기다려요' });
  });

  it('건너뛴 단계는 그 단계의 기회만 채운다', () => {
    const records = [rec('a', { field: 'research', did: 'present', title: '발표', level: 3 })];
    const gap = gapOf(records, ['plan']);
    expect(gap?.need).toEqual({ group: 'plan', level: 1 });
    expect(prog('x', { field: 'research', level: 1 }).level).toBe(gap?.need?.level);
  });
});
