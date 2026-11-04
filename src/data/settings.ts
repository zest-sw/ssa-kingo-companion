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
/** 첫 화면(L1)에서 걷어 낸 원칙 문장을 여기 한 곳에 모은다. */
export const PRINCIPLE_LINES = [
  '적합도 점수는 쓰지 않아요.',
  '레벨·점수·순위는 없어요.',
  '신청은 언제나 내가 직접 눌러요.',
  '프로필은 기본 비공개예요. 분석은 나에게만 보여요.',
  '내가 맞다고 한 발견만 추천에 써요.',
  '필요한 정보만 보여 줘요.'
];

export const ABOUT_LINES = [
  '모든 활동, 기록, 학생 정보는 예시예요. 실제 학생 데이터가 아니에요.',
  '실제 AI, 학교 API, 챌린지스퀘어 연동은 없어요. 신청은 언제나 학생이 직접 해요.',
  '가입하면 빈 새 학생으로, 예시로 둘러보기는 예시 학생으로 시작해요. 고른 것·쓴 것은 이 브라우저에 남아요.',
  '예시 학생은 지어낸 소프트웨어학과 3학년이에요. 1학년엔 개발, 2학년엔 데이터·AI, 3학년엔 서비스 기획으로 좁혀 온 3년 치 기록이에요. 친구·선배 이름도 지어낸 이름이에요.',
  '추천 후보 개수, 역량 체계, 보드 상태 이름, 테크 트리 기준, 회고 알림 횟수는 아직 정하지 않은 예시 값이에요.',
  '채용 공고 요건은 2026.10.08 확인한 공개 공고 3건이고 직무 참고용이에요.'
];

/** 학교 데이터: 어디서 무엇을 읽고 어디에 쓰는지. 동의한 것만 연결한다(기준 문서 '추천에 쓰는 데이터'). 연동 방법은 아직 확인하지 못했다. */
export const SCHOOL_DATA: { id: string; title: string; from: string; reads: string; use: string }[] = [
  { id: 'gls', title: '학과·학년·졸업요건', from: 'GLS(학사 시스템)', reads: '학과, 학년, 시간표, 남은 졸업요건', use: '신청 대상과 일정 충돌 거르기, 졸업요건에 맞는 후보 모으기' },
  { id: 'icampus', title: '수강한 과목', from: 'i-Campus', reads: '수강한 과목 이름', use: '배운 것과 이어지는 기회 찾기. 과목을 추천하지는 않아요' },
  { id: 'cs', title: '비교과 신청·이수 내역', from: '챌린지스퀘어', reads: '신청, 참여, 수료 기록', use: '이미 한 프로그램 거르기, 기록 보관함에 \'학교 확인\'으로 채우기' }
];
