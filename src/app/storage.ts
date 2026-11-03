import { parseAnswers, pruneAnswers, type EdgeAnswers } from '../domain/analysis/map';
import { parseDrafts, type InterviewDraft } from '../domain/interview/draft';
import { FIELD_GROUP, GROUP_ORDER } from '../domain/vocab';
import type { Activity, Axis, CandidateChoice, Field, Interest, NotifyHour, NotifyPrefs, Profile, RecordItem, Settings, Visibility } from '../domain/types';
import { SEED_ACTIVITIES } from '../data/seed';
import { DEFAULT_NOTIFY, DEFAULT_SETTINGS, DEFAULT_VISIBILITY, INITIAL_STATE, NEW_STUDENT_STATE, type AppState } from './state';

// 학생이 고른 것만 브라우저에 남긴다: 프로필, 공개 설정, 데이터·알림 설정, 추천에서 고른 것, 신청 준비로 만든 활동, 쓰던 회고 초안, 분석에서 답한 것.
// 예시로 둘러볼 때는 예시 기록·예시 활동의 변화를 남기지 않는다(새로고침하면 예시 상태로). 새 학생은 자기가 쓴 기록도 남긴다.
const KEY = 'kingo-companion:v1';
/** 나의 분석이 따로 쓰던 옛 키. 읽어서 한 번 옮기고 지운다. self 는 없앤 '내 생각'(2026-11-03)이라 읽지 않고 지우기만 한다. */
const LEGACY_ANALYSIS = { answers: 'ssa-an:edge-answers', self: 'ssa-an:self-levels' };

export type Saved = {
  /** 예시 데이터로 보는 중인지. 없으면(옛 저장값) 예시로 본다 */
  demo?: boolean;
  profile: Profile;
  onboarded: boolean;
  visibility: Visibility;
  choices?: Record<string, CandidateChoice>;
  laterUntil?: Record<string, number>;
  dislikedFields?: Field[];
  preferEasier?: boolean;
  /** 예시가 아닌, 학생이 신청 준비로 만든 활동 */
  addedActivities?: Activity[];
  /** 새 학생이 쓴 기록. 예시로 볼 때는 남기지 않는다 */
  records?: RecordItem[];
  drafts?: Record<string, InterviewDraft>;
  edgeAnswers?: EdgeAnswers;
  settings?: Settings;
  notify?: NotifyPrefs;
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const SEED_IDS = new Set(SEED_ACTIVITIES.map(a => a.id));
const CHOICES: readonly unknown[] = ['preparing', 'later', 'dismissed'];

function readJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

/** 옛 저장값(세부 분야 'research' 등)은 분야 묶음으로 바꾼다. 모르는 값은 버린다. */
export function toInterests(raw: unknown[]): Interest[] {
  const out = raw.map(x => (x === 'unknown' || (GROUP_ORDER as unknown[]).includes(x) ? x : FIELD_GROUP[x as Field])).filter((x): x is Interest => typeof x === 'string');
  return [...new Set(out)];
}

/** 저장한 기록 하나가 화면이 쓸 수 있는 모양인지(필수 칸만 본다) */
const isRecord = (r: unknown): r is RecordItem =>
  isObj(r) && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.field === 'string' && typeof r.did === 'string' && typeof r.semester === 'string' && Array.isArray(r.axes);

const HOURS: readonly unknown[] = [9, 12, 19] satisfies NotifyHour[];

/** 기본값에 있는 켬/끔 키 중 불린인 것만 */
const pickFlags = (raw: unknown, base: object): Record<string, boolean> =>
  isObj(raw) ? Object.fromEntries(Object.keys(base).filter(k => typeof raw[k] === 'boolean').map(k => [k, raw[k] as boolean])) : {};

const pickRecord =<T,>(raw: unknown, ok: (v: unknown) => v is T): Record<string, T> =>
  isObj(raw) ? Object.fromEntries(Object.entries(raw).filter((e): e is [string, T] => ok(e[1]))) : {};

/** 저장한 값을 예시 상태(또는 새 학생 상태) 위에 얹는다. 모양이 틀린 조각은 버리고 기본값을 쓴다. */
export function restoreSaved(s: unknown, legacy: { answers?: unknown } = {}): AppState {
  if (!isObj(s) || !isObj(s.profile) || !Array.isArray(s.profile.interests)) return NEW_STUDENT_STATE;
  const saved = s as Saved;
  const demo = saved.demo !== false;
  const base = demo ? INITIAL_STATE : NEW_STUDENT_STATE;
  const records = demo ? base.records : (Array.isArray(saved.records) ? saved.records : []).filter(isRecord);
  const recordIds = new Set(records.map(r => r.id));
  // 남지 않은 기록에 이어진 활동은 회고 대기로 되돌린다(기록 없이 '기록됨'이 남지 않게).
  const added = (Array.isArray(saved.addedActivities) ? saved.addedActivities : [])
    .filter(a => isObj(a) && typeof a.id === 'string' && !SEED_IDS.has(a.id))
    .map(a => (a.status === 'recorded' && !(a.recordId && recordIds.has(a.recordId)) ? { ...a, status: 'ended' as const, recordId: undefined } : a));
  const activities = [...base.activities, ...added];
  const ended = new Set(activities.filter(a => a.status === 'ended').map(a => a.id));
  const answers = saved.edgeAnswers ?? legacy.answers;
  return {
    ...base,
    profile: { ...base.profile, ...saved.profile, interests: toInterests(saved.profile.interests) },
    onboarded: saved.onboarded === true,
    visibility: { ...DEFAULT_VISIBILITY, ...(isObj(saved.visibility) ? saved.visibility : {}) },
    settings: { ...DEFAULT_SETTINGS, ...pickFlags(saved.settings, DEFAULT_SETTINGS) },
    notify: { ...DEFAULT_NOTIFY, ...pickFlags(saved.notify, DEFAULT_NOTIFY), hour: isObj(saved.notify) && HOURS.includes(saved.notify.hour) ? (saved.notify.hour as NotifyHour) : DEFAULT_NOTIFY.hour },
    choices: pickRecord(saved.choices, (v): v is CandidateChoice => CHOICES.includes(v)),
    laterUntil: pickRecord(saved.laterUntil, (v): v is number => typeof v === 'number'),
    dislikedFields: Array.isArray(saved.dislikedFields) ? saved.dislikedFields : [],
    preferEasier: saved.preferEasier === true,
    activities,
    records,
    drafts: Object.fromEntries(Object.entries(parseDrafts(saved.drafts)).filter(([id]) => ended.has(id))),
    // 저장하지 않는 기록을 가리키던 연결 답은 버린다.
    edgeAnswers: pruneAnswers((answers !== undefined && parseAnswers(answers)) || {}, [...recordIds])
  };
}

export function toSaved(state: AppState): Saved {
  return {
    demo: state.demo,
    profile: state.profile, onboarded: state.onboarded, visibility: state.visibility,
    records: state.demo ? undefined : state.records,
    choices: state.choices, laterUntil: state.laterUntil, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier,
    addedActivities: state.activities.filter(a => !SEED_IDS.has(a.id)),
    drafts: state.drafts, edgeAnswers: state.edgeAnswers,
    settings: state.settings, notify: state.notify
  };
}

export function loadState(): AppState {
  try {
    const legacy = { answers: readJson(LEGACY_ANALYSIS.answers) ?? undefined, self: readJson(LEGACY_ANALYSIS.self) ?? undefined };
    const hasLegacy = legacy.answers !== undefined || legacy.self !== undefined;
    const saved = readJson(KEY);
    if (saved === null && !hasLegacy) return NEW_STUDENT_STATE;
    const state = restoreSaved(saved ?? { profile: INITIAL_STATE.profile, onboarded: false, visibility: DEFAULT_VISIBILITY }, legacy);
    if (hasLegacy) {
      saveState(state);
      clearLegacy();
    }
    return state;
  } catch {
    return NEW_STUDENT_STATE;
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
