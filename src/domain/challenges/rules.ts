import type { Activity, Program, RecordItem } from '../types';
import { FIELD_GROUP } from '../vocab';

/** 달성 계산에 쓰는 전역 상태 조각 */
export type ChallengeContext = { records: RecordItem[]; activities: Activity[]; programs: Record<string, Program> };
export type Progress = { value: number; max: number };

export type RuleId = 'firstRetro' | 'threePaths' | 'firstPlaces' | 'explainer' | 'semesterReview' | 'retry' | 'roleSwap' | 'twoCampus' | 'together';

const flag = (ok: boolean): Progress => ({ value: ok ? 1 : 0, max: 1 });
const capped = (n: number, max: number): Progress => ({ value: Math.min(n, max), max });

// 예시 기록(seed)은 학생이 남긴 기록이 아니다.
const written = (r: RecordItem) => r.source !== 'seed';
const joined = (a: Activity) => a.status === 'ended' || a.status === 'recorded';
const roleText = (r: RecordItem) => r.card?.role ?? '';

const RULES: Record<RuleId, (c: ChallengeContext) => Progress> = {
  firstRetro: c => flag(c.records.length > 0),
  threePaths: c => capped(new Set(c.records.map(r => FIELD_GROUP[r.field])).size, 3),
  // ponytail: 처음 이용하는 학교 기관인지 알 수 없어 끝낸 활동 수로 센다. 기관 정보가 붙으면 고친다.
  firstPlaces: c => capped(c.activities.filter(joined).length, 3),
  explainer: c => flag(c.records.some(r => r.did === 'present' || /발표|멘토|튜터/.test(roleText(r)))),
  // ponytail: 학기 회고 기능이 아직 없어 '학기 돌아보기' 종류의 기록이 생기면 달성으로 본다.
  semesterReview: c => flag(c.records.some(r => r.kind === '학기 돌아보기')),
  // ponytail: 활동에 학기 정보가 없어 '다음 학기'를 확인하지 못한다. 떨어진 뒤 같은 프로그램에 다시 지원한 활동이 있으면 달성으로 본다. 학기가 붙으면 고친다.
  retry: c => flag(c.activities.some(a => a.status === 'declined' && c.activities.some(b => b.id !== a.id && b.status !== 'declined' && ((a.programId && a.programId === b.programId) || a.title === b.title)))),
  roleSwap: c => flag(c.records.some(r => roleText(r).includes('멘티')) && c.records.some(r => roleText(r).includes('멘토'))),
  twoCampus: c => {
    const places = c.activities.filter(joined).map(a => (a.programId ? c.programs[a.programId]?.place ?? '' : ''));
    return capped([places.some(p => p.includes('인문사회과학')), places.some(p => p.includes('자연과학'))].filter(Boolean).length, 2);
  },
  // ponytail: 친구와 같은 활동을 했는지 알 방법이 없다. 친구 연동이 생기면 계산한다.
  together: () => flag(false)
};

// 예시 기록은 모든 과제 계산에서 뺀다. 학생이 남긴 기록만 센다.
export const progressOf = (rule: RuleId, ctx: ChallengeContext): Progress => RULES[rule]({ ...ctx, records: ctx.records.filter(written) });
