import type { Profile, Visibility } from '../domain/types';
import { DEFAULT_VISIBILITY, INITIAL_STATE, type AppState } from './state';

// 학생이 고른 것(프로필, 공개 설정)만 브라우저에 남긴다. 나머지는 새로고침하면 예시 상태로 돌아간다.
const KEY = 'kingo-companion:v1';

type Saved = { profile: Profile; onboarded: boolean; visibility: Visibility };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return INITIAL_STATE;
    const s: unknown = JSON.parse(raw);
    if (!isObj(s) || !isObj(s.profile) || !Array.isArray(s.profile.interests)) return INITIAL_STATE;
    const saved = s as Saved;
    return {
      ...INITIAL_STATE,
      profile: { ...INITIAL_STATE.profile, ...saved.profile },
      onboarded: saved.onboarded === true,
      visibility: { ...DEFAULT_VISIBILITY, ...(isObj(saved.visibility) ? saved.visibility : {}) }
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveState(state: AppState) {
  const saved: Saved = { profile: state.profile, onboarded: state.onboarded, visibility: state.visibility };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // 사생활 보호 모드 등에서 막히면 이번 세션 메모리로만 쓴다.
  }
}

export function clearSaved() {
  try { window.localStorage.removeItem(KEY); } catch { /* 위와 같은 이유 */ }
}
