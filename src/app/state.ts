import { activityFromProgram } from '../domain/activities';
import { pruneAnswers, type EdgeAnswers } from '../domain/analysis/map';
import type { Level } from '../domain/analysis/strengths';
import { dismissEffect } from '../domain/candidates';
import { nextConfirm } from '../domain/discoveries';
import type { InterviewDraft } from '../domain/interview/draft';
import { pruneByKeys } from '../domain/interview/prune';
import { activityOfRecord, recordedPatch, unrecordedPatch } from '../domain/interview/transitions';
import { prepProgress } from '../domain/recommend-flow/flow';
import type { RecruitPost } from '../domain/social';
import type { Activity, ActivityStatus, Axis, CandidateChoice, Confirm, Discovery, DislikeKind, Field, LastDone, NotifyPrefs, PrepItem, Profile, RecordItem, Settings, Visibility } from '../domain/types';
import { DID_AXES } from '../domain/vocab';
import { INITIAL_SELF } from '../data/analysis';
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
  /** 나중에 보기로 고른 후보의 다시 볼 날(1주차 첫날부터 센 날 번호). 이 날이 되면 다시 후보에 나온다 */
  laterUntil: Record<string, number>;
  dislikedFields: Field[];
  preferEasier: boolean;
  records: RecordItem[];
  /** 발견 확인(맞아요/아니에요)과 그때 본 근거 */
  confirm: Record<string, Confirm>;
  lastDone: LastDone | null;
  settings: Settings;
  /** 알림 설정(예시). 실제 발송은 없다 */
  notify: NotifyPrefs;
  visibility: Visibility;
  /** 채용 요건별 근거 기록 id */
  reqEvidence: Record<string, string[]>;
  /** 회고 인터뷰 초안. 활동 id 별. 회고 대기(ended) 활동의 것만 남는다 */
  drafts: Record<string, InterviewDraft>;
  /** 경험 지도 연결 확인(연결 id → 맞아요/아니에요) */
  edgeAnswers: EdgeAnswers;
  /** 나의 강점의 '내 생각' */
  selfLevels: Record<Axis, Level>;
  /** 도전 과제를 처음 달성한 시각(ms). 한 번 알린 과제는 다시 알리지 않는다 */
  challengeAt: Record<string, number>;
  /** 내가 올린 팀원 모집 글. 새 글이 앞이다 */
  recruitPosts: RecruitPost[];
};

export type Action =
  | { type: 'profile/save'; profile: Profile }
  | { type: 'profile/complete'; profile: Profile }
  | { type: 'candidate/choose'; programId: string; choice: CandidateChoice; reason?: DislikeKind; until?: number }
  | { type: 'candidate/clear'; programId: string }
  | { type: 'activity/update'; id: string; patch: Partial<Omit<Activity, 'id'>> }
  | { type: 'activity/setStatus'; id: string; status: ActivityStatus }
  | { type: 'activity/prepItems'; id: string; items: PrepItem[] }
  | { type: 'activity/remove'; id: string }
  | { type: 'record/add'; record: RecordItem; activityId?: string }
  | { type: 'record/update'; record: RecordItem }
  | { type: 'record/setFlags'; id: string; flags: Partial<Pick<RecordItem, 'visibility' | 'useForRecommend' | 'confirmedAxes'>> }
  | { type: 'record/delete'; id: string }
  | { type: 'draft/save'; activityId: string; draft: InterviewDraft }
  | { type: 'draft/clear'; activityId: string }
  | { type: 'discovery/confirm'; discovery: Discovery; status: 'yes' | 'no' }
  | { type: 'analysis/answers'; answers: EdgeAnswers }
  | { type: 'analysis/self'; self: Record<Axis, Level> }
  | { type: 'challenge/achieve'; ids: string[]; at: number }
  | { type: 'recruit/post'; post: RecruitPost }
  | { type: 'settings/toggle'; key: keyof Settings }
  | { type: 'notify/set'; patch: Partial<NotifyPrefs> }
  | { type: 'visibility/set'; patch: Partial<Visibility> }
  /** 되돌리기: 그 행동이 바꾼 조각만 이전 값으로 돌린다 */
  | { type: 'undo'; patch: Partial<AppState> }
  | { type: 'reset' };

export const DEFAULT_VISIBILITY: Visibility = { profilePublic: false, hallOfFameConsent: false, hiddenActivityIds: [], sharedRecordIds: [], showcaseChallengeIds: [] };

export const DEFAULT_SETTINGS: Settings = { discover: true, career: true };
export const DEFAULT_NOTIFY: NotifyPrefs = { newCandidates: true, dayBefore: true, retro: true, hour: 9 };

export const INITIAL_STATE: AppState = {
  week: 1,
  profile: EXAMPLE_PROFILE,
  onboarded: false,
  activities: SEED_ACTIVITIES,
  choices: {},
  laterUntil: {},
  dislikedFields: [],
  preferEasier: false,
  records: SEED_RECORDS,
  confirm: {},
  lastDone: null,
  settings: DEFAULT_SETTINGS,
  notify: DEFAULT_NOTIFY,
  visibility: DEFAULT_VISIBILITY,
  reqEvidence: INITIAL_REQ_EVIDENCE,
  drafts: {},
  edgeAnswers: {},
  selfLevels: INITIAL_SELF,
  challengeAt: {},
  recruitPosts: []
};

const without = <T,>(list: T[], x: T) => list.filter(v => v !== x);
const withItem = <T,>(list: T[], x: T) => (list.includes(x) ? list : [...list, x]);
const omit = <T,>(map: Record<string, T>, key: string) => {
  if (!(key in map)) return map;
  const { [key]: _gone, ...rest } = map;
  return rest;
};

/** 초안은 회고 대기 활동의 것만 남긴다. 기록됐거나 지운 활동의 초안은 함께 사라진다. */
const keepDrafts = (drafts: AppState['drafts'], activities: Activity[]) => pruneByKeys(drafts, activities.filter(a => a.status === 'ended').map(a => a.id));

const patchActivities = (state: AppState, activities: Activity[]): AppState => ({ ...state, activities, drafts: keepDrafts(state.drafts, activities) });

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'profile/save':
      return { ...state, profile: action.profile };
    case 'profile/complete':
      return { ...state, profile: action.profile, onboarded: true };

    case 'candidate/choose': {
      const p = PROGRAM_BY_ID[action.programId];
      if (!p) return state;
      const laterUntil = action.choice === 'later' && action.until !== undefined ? { ...state.laterUntil, [p.id]: action.until } : omit(state.laterUntil, p.id);
      const next: AppState = { ...state, choices: { ...state.choices, [p.id]: action.choice }, laterUntil };
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
    case 'candidate/clear':
      return { ...state, choices: omit(state.choices, action.programId), laterUntil: omit(state.laterUntil, action.programId) };

    case 'activity/update':
      return patchActivities(state, state.activities.map(a => (a.id === action.id ? { ...a, ...action.patch } : a)));
    case 'activity/setStatus':
      return patchActivities(state, state.activities.map(a => (a.id === action.id ? { ...a, status: action.status } : a)));
    case 'activity/prepItems':
      return { ...state, activities: state.activities.map(a => (a.id === action.id ? { ...a, prepItems: action.items, prep: prepProgress(action.items) } : a)) };
    case 'activity/remove': {
      const a = state.activities.find(x => x.id === action.id);
      if (!a) return state;
      // 그만둔 기회는 추천에 다시 올리지 않는다(관심 없음과 같게, 이유는 남기지 않는다).
      const choices = a.programId ? { ...state.choices, [a.programId]: 'dismissed' as const } : state.choices;
      return {
        ...state,
        activities: state.activities.filter(x => x.id !== a.id),
        choices,
        laterUntil: a.programId ? omit(state.laterUntil, a.programId) : state.laterUntil,
        drafts: omit(state.drafts, a.id),
        visibility: state.visibility.hiddenActivityIds.includes(a.id) ? { ...state.visibility, hiddenActivityIds: without(state.visibility.hiddenActivityIds, a.id) } : state.visibility
      };
    }

    case 'record/add': {
      const r = action.record;
      const activities = state.activities.map(a =>
        a.id === action.activityId ? { ...a, ...recordedPatch(r.id) }
        : r.programId && a.programId === r.programId ? { ...a, status: 'recorded' as const, recordId: r.id }
        : a);
      return { ...patchActivities(state, activities), records: [...state.records.filter(x => x.id !== r.id), r], lastDone: { recordId: r.id, title: r.title, field: r.field } };
    }
    case 'record/update':
      // 고칠 때마다 버전을 올려, 이 기록을 근거로 확인한 발견이 '근거 바뀜'이 되게 한다.
      return { ...state, records: state.records.map(x => (x.id === action.record.id ? { ...action.record, v: x.v + 1, axes: x.did === action.record.did ? x.axes : DID_AXES[action.record.did] } : x)) };
    case 'record/setFlags':
      return { ...state, records: state.records.map(x => (x.id === action.id ? { ...x, ...action.flags } : x)) };
    case 'record/delete': {
      const r = state.records.find(x => x.id === action.id);
      if (!r) return state;
      // 기록을 만든 활동은 다시 회고 대기로 돌아간다.
      const from = activityOfRecord(state.activities, r);
      const records = state.records.filter(x => x.id !== r.id);
      return {
        ...state,
        records,
        activities: from ? state.activities.map(a => (a.id === from.id ? { ...a, ...unrecordedPatch() } : a)) : state.activities,
        reqEvidence: Object.fromEntries(Object.entries(state.reqEvidence).map(([k, v]) => [k, without(v, r.id)])),
        lastDone: state.lastDone?.recordId === r.id ? null : state.lastDone,
        visibility: { ...state.visibility, sharedRecordIds: without(state.visibility.sharedRecordIds, r.id) },
        edgeAnswers: pruneAnswers(state.edgeAnswers, records.map(x => x.id))
      };
    }

    case 'draft/save':
      return { ...state, drafts: { ...state.drafts, [action.activityId]: action.draft } };
    case 'draft/clear':
      return { ...state, drafts: omit(state.drafts, action.activityId) };

    case 'discovery/confirm':
      return { ...state, confirm: nextConfirm(state.confirm, action.discovery, action.status) };
    case 'analysis/answers':
      return { ...state, edgeAnswers: action.answers };
    case 'analysis/self':
      return { ...state, selfLevels: action.self };
    case 'challenge/achieve': {
      const fresh = action.ids.filter(id => !(id in state.challengeAt));
      if (!fresh.length) return state;
      return { ...state, challengeAt: { ...state.challengeAt, ...Object.fromEntries(fresh.map(id => [id, action.at])) } };
    }
    case 'recruit/post':
      return { ...state, recruitPosts: [action.post, ...state.recruitPosts] };
    case 'settings/toggle':
      return { ...state, settings: { ...state.settings, [action.key]: !state.settings[action.key] } };
    case 'notify/set':
      return { ...state, notify: { ...state.notify, ...action.patch } };
    case 'visibility/set': {
      const visibility = { ...state.visibility, ...action.patch };
      // 비공개로 돌리면 명예의 전당 동의도 함께 거둔다.
      if (!visibility.profilePublic) visibility.hallOfFameConsent = false;
      return { ...state, visibility };
    }

    case 'undo':
      return { ...state, ...action.patch };
    case 'reset':
      return INITIAL_STATE;
  }
}

/** before 에서 after 로 가며 바뀐 조각만 before 값으로. 되돌리기가 그 사이 다른 조각의 변화를 지우지 않게 한다. */
export function changedSlices(before: AppState, after: AppState): Partial<AppState> {
  const keys = (Object.keys(before) as (keyof AppState)[]).filter(k => before[k] !== after[k]);
  return Object.fromEntries(keys.map(k => [k, before[k]])) as Partial<AppState>;
}

/** 액션 묶음을 적용한 결과와, 그 묶음을 한 번에 되돌리는 액션 */
export function applyWithUndo(before: AppState, actions: Action[]): { after: AppState; undo: Action } {
  const after = actions.reduce(reducer, before);
  return { after, undo: { type: 'undo', patch: changedSlices(before, after) } };
}
