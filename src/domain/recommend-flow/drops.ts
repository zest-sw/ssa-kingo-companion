import { ddayOf } from '../recommend';
import type { Program } from '../types';

// 추천 L1 '고른 방법' 깔때기: 단계마다 어떤 활동이 빠졌는지. rank() 의 거르기 순서와 같아야 한다(테스트로 개수를 맞춰 본다).

export type StepId = 'pool' | 'open' | 'eligible' | 'fit' | 'fresh';
export type Drop = { p: Program; why: string };
export const STEP_LABEL: Record<StepId, string> = { pool: '전체 기회', open: '마감 전', eligible: '신청 대상', fit: '시간·방식', fresh: '추천' };
export const STEP_IDS: StepId[] = ['pool', 'open', 'eligible', 'fit', 'fresh'];
export const isStepId = (v: unknown): v is StepId => typeof v === 'string' && (STEP_IDS as string[]).includes(v);

export type DropCtx = { programs: Program[]; week: number; time: number; format: 'any' | 'online' | 'offline'; doneIds: string[]; excluded: string[] };

/** 단계별로 빠진 활동과 이유. 'pool' 은 이번 주 모집이 아니라서 처음부터 빠진 것. */
export function funnelDrops(c: DropCtx): Record<StepId, Drop[]> {
  const pool = c.programs.filter(p => p.weeks.includes(c.week));
  const open = pool.filter(p => ddayOf(p, c.week) >= 0);
  const eligible = open.filter(p => p.eligible);
  const fit = eligible.filter(p => p.hours <= c.time && (c.format === 'any' || p.format === c.format));
  const gone = (p: Program) => c.doneIds.includes(p.id) || c.excluded.includes(p.id);
  const minus = (from: Program[], to: Program[], why: (p: Program) => string): Drop[] => from.filter(p => !to.includes(p)).map(p => ({ p, why: why(p) }));
  return {
    pool: c.programs.filter(p => !pool.includes(p)).map(p => ({ p, why: '이번 주 모집이 아니에요' })),
    open: minus(pool, open, () => '마감이 지났어요'),
    eligible: minus(open, eligible, p => `${p.target}만 신청할 수 있어요`),
    fit: minus(eligible, fit, p => (p.hours > c.time ? `내 시간(${c.time}시간)보다 길어요` : '내가 고른 방식이 아니에요')),
    fresh: minus(fit, fit.filter(p => !gone(p)), p => (c.doneIds.includes(p.id) ? '이미 한 활동이에요' : '이미 골랐거나 미뤘어요'))
  };
}
