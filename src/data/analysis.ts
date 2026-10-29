import type { Level } from '../domain/analysis/strengths';
import type { Axis } from '../domain/types';

// 나의 분석 화면의 예시 값. 실제 학생 데이터가 아니다.

/** 관심 흐름에 보여 줄 학기의 처음과 지금. 기록이 이 바깥에 있으면 학기 축이 늘어난다. */
export const SEMESTER_FROM = '2025-1';
export const SEMESTER_NOW = '2026-2';

/** 학생이 처음에 적어 둔 '내 생각'. 칩으로 고친다. */
export const INITIAL_SELF: Record<Axis, Level> = {
  expertise: 'mid', problem: 'mid', communication: 'high', collaboration: 'mid', self: 'low', creative: 'low'
};

/** 분석을 다시 돌리는 데 걸리는 시간(ms). 대형 모델이 비동기로 분석하는 걸 흉내 낸다. */
export const ANALYSIS_DELAY_MS = 1200;
/** 이 localStorage 키가 '1' 이면 다음 갱신이 실패한다(실패 상태 확인용). 다시 시도하면 지워진다. */
export const ANALYSIS_FAIL_KEY = 'ssa-analysis-fail';
