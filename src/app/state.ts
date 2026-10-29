import { activityFromProgram } from '../domain/activities';
import { dismissEffect } from '../domain/candidates';
import { nextConfirm } from '../domain/discoveries';
import type { Activity, ActivityStatus, CandidateChoice, Confirm, Discovery, DislikeKind, Field, LastDone, Profile, RecordItem, Settings, Visibility } from '../domain/types';
import { DID_AXES } from '../domain/vocab';
import { INITIAL_REQ_EVIDENCE, PROGRAM_BY_ID } from '../data/catalog';
import { EXAMPLE_PROFILE, SEED_ACTIVITIES, SEED_RECORDS } from '../data/seed';

export type AppState = {
  /** 예시 기회 데이터의 주차(1~3). 마감 계산 기준 */
  week: number;
  profile: Profile;
  /** 가입 인터뷰를 마쳤는지 */
  onboarded: boolean;
  activities: Activity[];
  /** 후보별 학생의 선택. 고른 후보는 추천 목록에서 빠진다 */
  choices: Record<string, CandidateChoice>;
  dislikedFields: Field[];
  preferEasier: boolean;
  records: RecordItem[];
  /** 발견 확인(맞아요/아니에요)과 그때 본 근거 */
  confirm: Record<string, Confirm>;
  lastDone: LastDone | null;
  settings: Settings;
  visibility: Visibility;
  /** 채용 요건별 근거 기록 id */
  reqEvidence: Record<string, string[]>;
};

export type Action =
  | { type: 'profile/save'; profile: Profile }
  | { type: 'profile/complete'; profile: Profile }
  | { type: 'candidate/choose'; programId: string; choice: CandidateChoice; reason?: DislikeKind }
  | { type: 'candidate/clear'; programId: string }
  | { type: 'activity/update'; id: string; patch: Partial<Omit<Activity, 'id'>> }
  | { type: 'activity/setStatus'; id: string; status: ActivityStatus }
  | { type: 'record/add'; record: RecordItem }
  | { type: 'record/update'; record: RecordItem }
  | { type: 'record/setFlags'; id: string; flags: Partial<Pick<RecordItem, 'visibility' | 'useForRecommend'>> }
  | { type: 'record/delete'; id: string }
  | { type: 'discovery/confirm'; discovery: Discovery; status: 'yes' | 'no' }
  | { type: 'settings/toggle'; key: keyof Settings }
  | { type: 'visibility/set'; patch: Partial<Visibility> }
  | { type: 'restore'; state: AppState }
  | { type: 'reset' };

export const DEFAULT_VISIBILITY: Visibility = { profilePublic: false, hallOfFameConsent: false, hiddenActivityIds: [], sharedRecordIds: [], showcaseChallengeIds: [] };

export const INITIAL_STATE: AppState = {
  week: 1,
  profile: EXAMPLE_PROFILE,
  onboarded: false,
  activities: SEED_ACTIVITIES,
  choices: {},
  dislikedFields: [],
  preferEasier: false,
  records: SEED_RECORDS,
  confirm: {},
  lastDone: null,
  settings: { discover: true, career: true },
  visibility: DEFAULT_VISIBILITY,
  reqEvidence: INITIAL_REQ_EVIDENCE
};

const without = <T,>(list: T[], x: T) => list.filter(v => v !== x);
const withItem = <T,>(list: T[], x: T) => (list.includes(x) ? list : [...list, x]);

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile/save':
      return { ...state, profile: action.profile };
    case 'profile/complete':
      return { ...state, profile: action.profile, onboarded: true };

    case 'candidate/choose': {
      const p = PROGRAM_BY_ID[action.programId];
      if (!p) return state;
      const next: AppState = { ...state, choices: { ...state.choices, [p.id]: action.choice } };
      if (action.choice === 'preparing' && !state.activities.some(a => a.programId === p.id)) {
        next.activities = [...state.activities, activityFromProgram(p, state.week)];
      }
      if (action.choice === 'dismissed' && action.reason) {
        const fx = dismissEffect(action.reason, p);
        if (fx.dislikedField) next.dislikedFields = withItem(state.dislikedFields, fx.dislikedField);
        if (fx.preferEasier) next.preferEasier = true;
      }
      return next;
    }
    case 'candidate/clear': {
      const choices = { ...state.choices };
      delete choices[action.programId];
      return { ...state, choices };
    }

    case 'activity/update':
      return { ...state, activities: state.activities.map(a => (a.id === action.id ? { ...a, ...action.patch } : a)) };
    case 'activity/setStatus':
      return { ...state, activities: state.activities.map(a => (a.id === action.id ? { ...a, status: action.status } : a)) };

    case 'record/add': {
      const r = action.record;
      const activities = r.programId ? state.activities.map(a => (a.programId === r.programId ? { ...a, status: 'recorded' as const, recordId: r.id } : a)) : state.activities;
      return { ...state, records: [...state.records.filter(x => x.id !== r.id), r], activities, lastDone: { recordId: r.id, title: r.title, field: r.field } };
    }
    case 'record/update':
      // 고칠 때마다 버전을 올려, 이 기록을 근거로 확인한 발견이 '근거 바뀜'이 되게 한다.
      return { ...state, records: state.records.map(x => (x.id === action.record.id ? { ...action.record, v: x.v + 1, axes: x.did === action.record.did ? x.axes : DID_AXES[action.record.did] } : x)) };
    case 'record/setFlags':
      return { ...state, records: state.records.map(x => (x.id === action.id ? { ...x, ...action.flags } : x)) };
    case 'record/delete':
      return {
        ...state,
        records: state.records.filter(r => r.id !== action.id),
        reqEvidence: Object.fromEntries(Object.entries(state.reqEvidence).map(([k, v]) => [k, without(v, action.id)])),
        lastDone: state.lastDone?.recordId === action.id ? null : state.lastDone,
        visibility: { ...state.visibility, sharedRecordIds: without(state.visibility.sharedRecordIds, action.id) }
      };

    case 'discovery/confirm':
      return { ...state, confirm: nextConfirm(state.confirm, action.discovery, action.status) };
    case 'settings/toggle':
      return { ...state, settings: { ...state.settings, [action.key]: !state.settings[action.key] } };
    case 'visibility/set': {
      const visibility = { ...state.visibility, ...action.patch };
      // 비공개로 돌리면 명예의 전당 동의도 함께 거둔다.
      if (!visibility.profilePublic) visibility.hallOfFameConsent = false;
      return { ...state, visibility };
    }

    case 'restore':
      return action.state;
    case 'reset':
      return INITIAL_STATE;
  }
}
