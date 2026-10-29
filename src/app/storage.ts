import { parseAnswers, pruneAnswers, type EdgeAnswers } from '../domain/analysis/map';
import { parseSelf, type Level } from '../domain/analysis/strengths';
import { parseDrafts, type InterviewDraft } from '../domain/interview/draft';
import type { Activity, Axis, CandidateChoice, Field, Profile, Visibility } from '../domain/types';
import { SEED_ACTIVITIES } from '../data/seed';
import { DEFAULT_VISIBILITY, INITIAL_STATE, type AppState } from './state';

// 학생이 고른 것만 브라우저에 남긴다: 프로필, 공개 설정, 추천에서 고른 것, 신청 준비로 만든 활동, 쓰던 회고 초안, 분석에서 답한 것.
// 예시 기록·예시 활동의 변화는 남기지 않는다. 새로고침하면 예시 상태로 돌아간다.
const KEY = 'kingo-companion:v1';
/** 나의 분석이 따로 쓰던 옛 키. 읽어서 한 번 옮기고 지운다. */
const LEGACY_ANALYSIS = { answers: 'ssa-an:edge-answers', self: 'ssa-an:self-levels' };

export type Saved = {
  profile: Profile;
  onboarded: boolean;
  visibility: Visibility;
  choices?: Record<string, CandidateChoice>;
  laterUntil?: Record<string, number>;
  dislikedFields?: Field[];
  preferEasier?: boolean;
  /** 예시가 아닌, 학생이 신청 준비로 만든 활동 */
  addedActivities?: Activity[];
  drafts?: Record<string, InterviewDraft>;
  edgeAnswers?: EdgeAnswers;
  selfLevels?: Record<Axis, Level>;
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const SEED_IDS = new Set(SEED_ACTIVITIES.map(a => a.id));
const CHOICES: readonly unknown[] = ['preparing', 'later', 'dismissed'];

function readJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

const pickRecord = <T,>(raw: unknown, ok: (v: unknown) => v is T): Record<string, T> =>
  isObj(raw) ? Object.fromEntries(Object.entries(raw).filter((e): e is [string, T] => ok(e[1]))) : {};

/** 저장한 값을 예시 상태 위에 얹는다. 모양이 틀린 조각은 버리고 예시 값을 쓴다. */
export function restoreSaved(s: unknown, legacy: { answers?: unknown; self?: unknown } = {}): AppState {
  if (!isObj(s) || !isObj(s.profile) || !Array.isArray(s.profile.interests)) return INITIAL_STATE;
  const saved = s as Saved;
  // 저장하지 않는 기록에 이어진 활동은 회고 대기로 되돌린다(기록 없이 '기록됨'이 남지 않게).
  const added = (Array.isArray(saved.addedActivities) ? saved.addedActivities : [])
    .filter(a => isObj(a) && typeof a.id === 'string' && !SEED_IDS.has(a.id))
    .map(a => (a.status === 'recorded' ? { ...a, status: 'ended' as const, recordId: undefined } : a));
  const activities = [...INITIAL_STATE.activities, ...added];
  const ended = new Set(activities.filter(a => a.status === 'ended').map(a => a.id));
  const answers = saved.edgeAnswers ?? legacy.answers;
  const self = saved.selfLevels ?? legacy.self;
  return {
    ...INITIAL_STATE,
    profile: { ...INITIAL_STATE.profile, ...saved.profile },
    onboarded: saved.onboarded === true,
    visibility: { ...DEFAULT_VISIBILITY, ...(isObj(saved.visibility) ? saved.visibility : {}) },
    choices: pickRecord(saved.choices, (v): v is CandidateChoice => CHOICES.includes(v)),
    laterUntil: pickRecord(saved.laterUntil, (v): v is number => typeof v === 'number'),
    dislikedFields: Array.isArray(saved.dislikedFields) ? saved.dislikedFields : [],
    preferEasier: saved.preferEasier === true,
    activities,
    drafts: Object.fromEntries(Object.entries(parseDrafts(saved.drafts)).filter(([id]) => ended.has(id))),
    // 저장하지 않는 기록을 가리키던 연결 답은 버린다.
    edgeAnswers: pruneAnswers((answers !== undefined && parseAnswers(answers)) || {}, INITIAL_STATE.records.map(r => r.id)),
    selfLevels: (self !== undefined && parseSelf(self, INITIAL_STATE.selfLevels)) || INITIAL_STATE.selfLevels
  };
}

export function toSaved(state: AppState): Saved {
  return {
    profile: state.profile, onboarded: state.onboarded, visibility: state.visibility,
    choices: state.choices, laterUntil: state.laterUntil, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier,
    addedActivities: state.activities.filter(a => !SEED_IDS.has(a.id)),
    drafts: state.drafts, edgeAnswers: state.edgeAnswers, selfLevels: state.selfLevels
  };
}

export function loadState(): AppState {
  try {
    const legacy = { answers: readJson(LEGACY_ANALYSIS.answers) ?? undefined, self: readJson(LEGACY_ANALYSIS.self) ?? undefined };
    const hasLegacy = legacy.answers !== undefined || legacy.self !== undefined;
    const saved = readJson(KEY);
    if (saved === null && !hasLegacy) return INITIAL_STATE;
    const state = restoreSaved(saved ?? { profile: INITIAL_STATE.profile, onboarded: false, visibility: DEFAULT_VISIBILITY }, legacy);
    if (hasLegacy) {
      saveState(state);
      clearLegacy();
    }
    return state;
  } catch {
    return INITIAL_STATE;
  }
}

export function saveState(state: AppState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(toSaved(state)));
  } catch {
    // 사생활 보호 모드 등에서 막히면 이번 세션 메모리로만 쓴다.
  }
}

function clearLegacy() {
  try { Object.values(LEGACY_ANALYSIS).forEach(k => window.localStorage.removeItem(k)); } catch { /* 위와 같은 이유 */ }
}

export function clearSaved() {
  try { window.localStorage.removeItem(KEY); } catch { /* 위와 같은 이유 */ }
  clearLegacy();
}
