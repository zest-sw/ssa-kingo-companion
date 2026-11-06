import { describe, expect, it } from 'vitest';
import { CATALOG } from '../data/catalog';
import { EMPTY_PROFILE } from '../data/seed';
import { DEFAULT_SETTINGS, NEW_STUDENT_STATE } from '../app/state';
import { buildCandidates } from './candidates';
import { canAdvance, firstReason, onboardingResult, stepDirection } from './onboarding';
import type { Profile } from './types';

const viewFor = (profile: Profile) => buildCandidates({
  catalog: CATALOG, week: NEW_STUDENT_STATE.week, profile, records: [], confirm: {}, settings: DEFAULT_SETTINGS,
  choices: {}, dislikedFields: [], preferEasier: false, last: null
});

describe('가입 인터뷰 단계', () => {
  it('관심 분야는 하나 이상 골라야 넘어가고, 시간·목표는 기본값으로 넘어간다', () => {
    expect(canAdvance(0, EMPTY_PROFILE)).toBe(false);
    expect(canAdvance(0, { ...EMPTY_PROFILE, interests: ['unknown'] })).toBe(true);
    expect(canAdvance(1, EMPTY_PROFILE)).toBe(true);
    expect(canAdvance(2, EMPTY_PROFILE)).toBe(true);
  });
  it('다음과 이전의 방향', () => {
    expect(stepDirection(0, 1)).toBe('next');
    expect(stepDirection(2, 1)).toBe('back');
  });
});

describe('가입을 마친 장면', () => {
  it('홈·추천과 같은 가장 추천을 고르고, 방금 고른 관심 분야 이유를 먼저 쓴다', () => {
    const view = viewFor({ ...EMPTY_PROFILE, interests: ['mentor'] });
    const r = onboardingResult(view);
    expect(r.top?.programId).toBe(view.primary?.p.id);
    expect(r.count).toBe(view.newCount);
    expect(r.count).toBeGreaterThan(0);
    expect(r.top?.reason).toBe('처음에 고른 관심 ‘멘토링’과 맞아요');
  });
  it('이유는 관심 → 목표 → 첫 이유 순서로 고르고 마침표 없이 끝낸다', () => {
    expect(firstReason([{ kind: 'energy', text: '에너지.' }, { kind: 'career', text: '목표와 이어져요.' }])).toBe('목표와 이어져요');
    expect(firstReason([{ kind: 'energy', text: '에너지가 올라가요.' }])).toBe('에너지가 올라가요');
    expect(firstReason([])).toBe('지금 신청할 수 있고 내 시간에 맞아요');
  });
  it('후보가 없으면 0개로 알린다', () => {
    expect(onboardingResult({ primary: undefined, newCount: 0 })).toEqual({ count: 0 });
  });
});
