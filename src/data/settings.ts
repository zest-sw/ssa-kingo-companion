import type { IconName } from '../components';
import type { NotifyHour, NotifyPrefs } from '../domain/types';

// 설정 화면 문구. 알림은 예시 설정이고 실제 발송은 없다.

export type SettingsSection = 'profile' | 'visibility' | 'data' | 'notifications' | 'about';

export const SETTINGS_NAV: { id: SettingsSection; label: string; icon: IconName }[] = [
  { id: 'profile', label: '프로필·추천 조건', icon: 'user' },
  { id: 'visibility', label: '공개 범위', icon: 'eye' },
  { id: 'data', label: '데이터·개인정보', icon: 'database' },
  { id: 'notifications', label: '알림', icon: 'bell' },
  { id: 'about', label: '프로토타입 정보', icon: 'info' }
];

export const NOTIFY_ITEMS: { key: Exclude<keyof NotifyPrefs, 'hour'>; title: string; sub: string }[] = [
  { key: 'newCandidates', title: '새 추천 후보', sub: '새 후보가 생기면 하루 한 번 묶어서 알려요' },
  { key: 'dayBefore', title: '활동 전날', sub: '신청 마감과 활동 날짜 하루 전에 알려요' },
  { key: 'retro', title: '회고', sub: '활동이 끝날 때쯤 알려요. 한 활동에 최대 2번이에요' }
];

export const NOTIFY_HOURS: { id: `${NotifyHour}`; label: string }[] = [
  { id: '9', label: '오전 9시' },
  { id: '12', label: '낮 12시' },
  { id: '19', label: '저녁 7시' }
];

/** 데이터가 예시임을 밝히는 단 한 곳. 다른 화면에는 '예시' 안내를 따로 두지 않는다. */
export const ABOUT_LINES = [
  '모든 활동, 기록, 학생 정보는 예시예요. 실제 학생 데이터가 아니에요.',
  '실제 AI, 학교 API, 챌린지스퀘어 연동은 없어요. 신청은 언제나 학생이 직접 해요.',
  '새로고침하면 예시 상태로 돌아가요. 프로필, 공개 범위, 데이터·알림 설정, 추천에서 고른 것, 신청 준비, 쓰던 회고 초안, 분석에서 답한 것만 이 브라우저에 남아요.',
  '추천 후보 개수, 역량 체계, 보드 상태 이름, 테크 트리 기준, 회고 알림 횟수는 아직 정하지 않은 예시 값이에요.',
  '채용 공고 요건은 2026.10.08 확인한 공개 공고 3건이고 직무 참고용이에요.'
];
