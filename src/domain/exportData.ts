import type { AppState } from '../app/state';

/** 내려받기용 내 데이터. 학생이 입력한 것과 고른 것만 담는다. 발견·역량 근거 같은 분석 결과는 담지 않는다. */
export function exportMine(s: AppState): Record<string, unknown> {
  return {
    내려받은곳: '킹고 컴패니언 프로토타입(예시 데이터)',
    프로필: s.profile,
    활동: s.activities,
    기록: s.records,
    설정: s.settings,
    알림: s.notify,
    공개범위: s.visibility
  };
}

/** 사람이 읽을 수 있게 들여쓴 JSON 글 */
export const exportText = (s: AppState): string => JSON.stringify(exportMine(s), null, 2);
