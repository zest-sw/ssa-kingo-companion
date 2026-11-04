import { discoveriesOf } from '../domain/discoveries';
import type { Activity, Confirm, Profile, RecordItem, Visibility } from '../domain/types';

// 예시 학생(가상 인물). 실제 학생 데이터가 아니다. 인물 설명은 docs/product/example-student.md.
// 소프트웨어학과 3학년: 1학년엔 개발로 시작 → 2학년에 데이터·AI 로 넓힘 → 3학년에 서비스 기획·리서치로 좁혀 간다. 멘토링·글로벌은 조금.

export const EMPTY_PROFILE: Profile = { interests: [], time: 3, format: 'any', goal: '', importCS: false };
export const EXAMPLE_PROFILE: Profile = { interests: ['plan'], time: 3, format: 'any', goal: '서비스 기획 직무', importCS: false };

type Base = Pick<RecordItem, 'v' | 'source' | 'visibility' | 'useForRecommend'>;
const B: Base = { v: 1, source: 'agent', visibility: 'me', useForRecommend: true };

/**
 * 3년 동안 남긴 회고 24개. 학기 순서로 둔다.
 * level 은 심화 수준(1 입문 · 2 중급 · 3 심화). 글로벌은 온라인 교류(입문)에서 중급 없이 교환학생 도우미(심화)로 건너뛰었다.
 */
export const SEED_RECORDS: RecordItem[] = [
  // 2024-1 · 1학년 1학기: 개발 시작, 멘토링 멘티
  { ...B, id: 'r-py', title: '파이썬 기초 스터디', kind: '스터디', date: '1학기 · 4월', semester: '2024-1', field: 'dev', did: 'listen', level: 1, energy: 'same', quote: '따라 치기만 해서는 내 코드가 아니었다.', note: '매주 예제를 따라 치고 막힌 줄을 스터디원에게 물었다.', axes: ['expertise', 'self'], verification: 'self' },
  { ...B, id: 'r-mentee', title: 'SW 학습 멘토링 · 멘티', kind: '멘토링', date: '1학기 · 5월', semester: '2024-1', field: 'mentor', did: 'listen', level: 1, energy: 'same', quote: '선배가 어디서 막혔는지 먼저 물어봐 줘서 편했다.', note: '멘티로 참여해 과제 코드 리뷰를 받고 질문 목록을 정리했다.', axes: ['communication', 'self'], verification: 'school', card: { role: '멘티로 참여했어요' } },
  // 2024-여름
  { ...B, id: 'r-webcamp', title: '웹 개발 입문 캠프', kind: '캠프', date: '여름 · 7월', semester: '2024-여름', field: 'dev', did: 'make', level: 1, energy: 'up', quote: '화면이 움직이는 순간 처음으로 재미있었다.', note: '할 일 목록 웹 페이지를 혼자 만들어 마지막 날 시연했다.', axes: ['expertise', 'creative', 'problem'], confirmedAxes: ['expertise'], verification: 'school' },
  // 2024-2
  { ...B, id: 'r-appclub', title: '앱 개발 동아리 프로젝트', kind: '동아리', date: '2학기 · 10월', semester: '2024-2', field: 'dev', did: 'make', level: 2, energy: 'same', quote: '기능보다 누가 무엇을 만들지 정하는 게 더 오래 걸렸다.', note: '네 명이 동아리 출석 앱을 만들며 화면 두 개를 맡았다.', axes: ['expertise', 'collaboration', 'problem'], confirmedAxes: ['collaboration'], verification: 'self' },
  { ...B, id: 'r-algo', title: '알고리즘 스터디', kind: '스터디', date: '2학기 · 11월', semester: '2024-2', field: 'dev', did: 'ask', level: 1, energy: 'same', quote: '풀이보다 왜 막혔는지 묻는 시간이 더 도움이 됐다.', note: '매주 문제 두 개를 풀고 막힌 이유를 질문으로 바꿔 공유했다.', axes: ['problem', 'self', 'expertise'], rejectedAxes: ['self'], verification: 'self' },
  { ...B, id: 'r-oss', title: '오픈소스 첫 기여 챌린지', kind: '비교과', date: '2학기 · 12월', semester: '2024-2', field: 'dev', did: 'ask', level: 2, energy: 'same', quote: '이슈에 질문을 남기는 것부터 용기가 필요했다.', note: '문서 오타 이슈를 골라 질문을 남기고 수정 요청을 하나 보냈다.', axes: ['problem', 'communication'], rejectedAxes: ['communication'], verification: 'school' },
  // 2024-겨울
  { ...B, id: 'r-winterhack', title: '겨울 해커톤 · 학식 알림 봇', kind: '해커톤', date: '겨울 · 1월', semester: '2024-겨울', field: 'dev', did: 'make', level: 2, energy: 'up', quote: '친구들이 실제로 써 주니 밤샌 게 아깝지 않았다.', note: '학식 메뉴를 알려 주는 메신저 봇을 만들고 팀 발표 자료를 정리했다.', axes: ['collaboration', 'problem', 'creative'], confirmedAxes: ['problem', 'collaboration'], verification: 'school' },
  // 2025-1 · 2학년: 데이터·AI 로 넓힘
  { ...B, id: 'r-datalec', title: '데이터 분석 입문 특강', kind: '특강', date: '1학기 · 3월', semester: '2025-1', field: 'data', did: 'listen', level: 1, energy: 'same', quote: '숫자를 보기 전에 질문을 먼저 정하라는 말이 남았다.', note: '특강을 듣고 학교 공개 데이터로 질문 세 개를 적어 봤다.', axes: ['expertise', 'communication'], verification: 'school' },
  { ...B, id: 'r-mlstudy', title: '머신러닝 스터디', kind: '스터디', date: '1학기 · 4월', semester: '2025-1', field: 'ai', did: 'ask', level: 1, energy: 'same', quote: '모델 점수보다 데이터가 어디서 왔는지가 더 궁금했다.', note: '교재 한 장씩 맡아 정리하고 이해 안 된 부분을 질문으로 모았다.', axes: ['expertise', 'problem', 'self'], confirmedAxes: ['expertise'], verification: 'self' },
  { ...B, id: 'r-tutor', title: '앱 동아리 신입 튜터', kind: '동아리', date: '1학기 · 5월', semester: '2025-1', field: 'dev', did: 'present', level: 3, energy: 'up', quote: '설명하다 보니 내가 모르던 부분이 드러났다.', note: '신입 부원 다섯 명에게 화면 만드는 법을 세 번 나눠 설명했다.', axes: ['communication', 'self'], confirmedAxes: ['communication'], verification: 'self', card: { role: '튜터를 맡았어요' } },
  // 2025-여름
  { ...B, id: 'r-datacamp', title: '공공데이터 분석 캠프', kind: '캠프', date: '여름 · 7월', semester: '2025-여름', field: 'data', did: 'make', level: 2, energy: 'up', quote: '지도 위에 점을 찍자 팀원들이 같은 걸 보기 시작했다.', note: '버스 정류장 이용 데이터를 지도 한 장으로 그려 개선 지점을 짚었다.', axes: ['problem', 'creative', 'expertise'], confirmedAxes: ['problem'], verification: 'school' },
  { ...B, id: 'r-globalonline', title: '해외 대학 온라인 교류 수업', kind: '비교과', date: '여름 · 8월', semester: '2025-여름', field: 'global', did: 'listen', level: 1, energy: 'same', quote: '같은 앱을 나라마다 다르게 쓰는 게 신기했다.', note: '다른 나라 학생들과 자주 쓰는 앱 이야기를 나누고 차이를 표로 정리했다.', axes: ['communication', 'self'], rejectedAxes: ['self'], verification: 'school' },
  // 2025-2
  { ...B, id: 'r-aiidea', title: 'AI 서비스 아이디어 경진대회', kind: '대회', date: '2학기 · 10월', semester: '2025-2', field: 'ai', did: 'idea', level: 2, energy: 'up', quote: '기술보다 누가 왜 쓰는지 말할 때 심사위원이 고개를 들었다.', note: '강의 요약 챗봇 아이디어를 내고 사용 장면 세 컷을 그려 제안했다.', axes: ['creative', 'self', 'problem'], confirmedAxes: ['creative'], verification: 'school' },
  { ...B, id: 'r-surveyviz', title: '설문 데이터 시각화 프로젝트', kind: '프로젝트', date: '2학기 · 11월', semester: '2025-2', field: 'data', did: 'make', level: 2, energy: 'same', quote: '차트를 고를 때마다 누가 볼지를 먼저 떠올렸다.', note: '학과 설문 응답을 차트 네 장으로 만들어 학생회에 넘겼다.', axes: ['creative', 'problem'], verification: 'self' },
  { ...B, id: 'r-mentor', title: 'SW 학습 멘토링 · 멘토', kind: '멘토링', date: '2학기 · 11월', semester: '2025-2', field: 'mentor', did: 'present', level: 3, energy: 'up', quote: '1학년 때 내가 듣고 싶던 말을 해 줄 수 있었다.', note: '멘토로 신입생 세 명의 과제 질문을 받고 매주 풀이를 설명했다.', axes: ['communication', 'self', 'collaboration'], confirmedAxes: ['communication'], verification: 'school', card: { role: '멘토를 맡았어요' } },
  // 2026-1 · 3학년: 서비스 기획·리서치로 좁혀 감
  { ...B, id: 'e1', title: '팀 서비스 개선안', kind: '교과', date: '1학기 · 3월', semester: '2026-1', field: 'product', did: 'organize', level: 2, energy: 'same', quote: '의견을 한 문장으로 묶으니 다음 행동이 보였다.', note: '서로 다른 팀원 의견을 불편 상황과 원인으로 나누어 문제 문장을 정리했다.', axes: ['problem', 'communication', 'collaboration'], confirmedAxes: ['collaboration'], verification: 'self' },
  { ...B, id: 'r-planws', title: '서비스 기획 입문 워크숍', kind: '워크숍', date: '1학기 · 4월', semester: '2026-1', field: 'product', did: 'idea', level: 1, energy: 'down', quote: '아이디어보다 문제 문장을 먼저 쓰라는 게 어려웠다.', note: '학교 앱 불편 하나를 골라 문제 문장과 해결 아이디어 두 개를 냈다.', axes: ['creative', 'self'], verification: 'school' },
  { ...B, id: 'e2', title: '사용자 인터뷰 과제', kind: '프로젝트', date: '1학기 · 5월', semester: '2026-1', field: 'research', did: 'listen', level: 1, energy: 'up', quote: '왜 그렇게 했는지 다시 물어보니 내 가정이 달라졌다.', note: '질문지를 만들고 답변에서 반복되는 표현을 표시했다.', axes: ['expertise', 'communication', 'problem'], confirmedAxes: ['communication', 'problem'], verification: 'self' },
  // 2026-여름
  { ...B, id: 'e3', title: '리서치 스터디', kind: '비교과', date: '여름 · 7월', semester: '2026-여름', field: 'research', did: 'ask', level: 1, energy: 'same', quote: '좋은 질문은 답을 유도하지 않고 상황을 떠올리게 했다.', note: '서비스 리서치 사례를 읽고 답을 유도하지 않는 질문 예시를 모았다.', axes: ['expertise', 'self', 'communication'], verification: 'self' },
  { ...B, id: 'r-survey', title: '학생 식당 앱 이용 설문', kind: '프로젝트', date: '여름 · 8월', semester: '2026-여름', field: 'research', did: 'ask', level: 2, energy: 'same', quote: '질문 순서만 바꿔도 답이 달라졌다.', note: '질문 여섯 개짜리 설문을 두 번 고쳐 돌리고 응답을 불편 유형별로 묶었다.', axes: ['problem', 'communication', 'expertise'], verification: 'school' },
  { ...B, id: 'r-buddy', title: '글로벌 버디 · 교환학생 도우미', kind: '비교과', date: '여름 · 8월', semester: '2026-여름', field: 'global', did: 'organize', level: 3, energy: 'same', quote: '내가 당연하게 쓰던 학교 서비스가 낯선 사람에겐 미로였다.', note: '교환학생 두 명의 수강 신청과 학생증 발급 순서를 정리해 안내했다.', axes: ['collaboration', 'communication'], verification: 'school' },
  // 2026-2 · 지금 학기
  { ...B, id: 'e4', title: '교내 디자인 해커톤', kind: '프로젝트', date: '2학기 · 9월', semester: '2026-2', field: 'product', did: 'make', level: 2, energy: 'up', quote: '같은 문제정의 틀을 다른 과업에서도 쓸 수 있었다.', note: '두 가지 해결안을 비교하고 클릭형 화면 초안을 만들었다.', axes: ['problem', 'creative', 'collaboration'], confirmedAxes: ['creative'], verification: 'school' },
  { ...B, id: 'e5', title: '동아리 캠페인 기획', kind: '비교과', date: '2학기 · 9월', semester: '2026-2', field: 'club', did: 'organize', level: 2, energy: 'same', quote: '누가 무엇을 맡는지 정리하니 다시 이야기할 여유가 생겼다.', note: '팀원과 참여자의 의견을 묶고 역할·공유 일정을 정리했다.', axes: ['communication', 'collaboration', 'creative'], verification: 'self', source: 'manual' },
  { ...B, id: 'e6', title: '서비스 사용성 테스트', kind: '프로젝트', date: '2학기 · 10월', semester: '2026-2', field: 'research', did: 'listen', level: 2, energy: 'up', quote: '내 설명보다 사용자가 실제로 멈춘 지점이 중요한 근거였다.', note: '사용 과정을 관찰하고 막힌 지점을 물었다.', axes: ['expertise', 'problem', 'self'], verification: 'school' },
  { ...B, id: 'r-studytalk', title: '리서치 스터디 결과 발표', kind: '발표', date: '2학기 · 10월', semester: '2026-2', field: 'research', did: 'present', level: 3, energy: 'up', quote: '발표 뒤에 받은 질문이 다음 인터뷰 질문이 됐다.', note: '여름 스터디에서 모은 질문 예시를 10분 동안 발표하고 질문을 받았다.', axes: ['communication', 'self'], confirmedAxes: ['communication'], verification: 'self', source: 'manual' }
];

/** 내 활동 보드 예시 13건. 오늘(2026-10-13) 기준 마감 D-0 ~ D-17 */
export const SEED_ACTIVITIES: Activity[] = [
  { id: 'a-tutor', title: 'SW 튜터 모집', field: 'mentor', status: 'preparing', schedule: '11월부터 매주 1회', prep: { done: 0, total: 1 }, due: { label: '사전 설문 마감 18:00', dday: 0 } },
  { id: 'a-swm', title: 'SW 인재 연수 과정 모집', field: 'dev', status: 'preparing', schedule: '연수 2027년 1월부터', prep: { done: 2, total: 3 }, due: { label: '신청 마감', dday: 5 } },
  { id: 'a-pm-camp', title: '서비스 기획 실무 부트캠프', field: 'product', status: 'preparing', schedule: '11월 9일 ~ 12월 4일 · 주 2회', prep: { done: 1, total: 3 }, due: { label: '신청 마감', dday: 12 } },
  { id: 'a-ux-contest', title: '교내 UX 개선 공모전', field: 'research', status: 'applied', schedule: '결과 발표 11월 6일', due: { label: '기획서 제출', dday: 9 } },
  { id: 'a-global-camp', title: '글로벌 리더십 캠프', field: 'global', status: 'applied', schedule: '결과 발표 10월 30일' },
  { id: 'a-research-crew', title: '서비스 리서치 크루', field: 'research', status: 'ongoing', schedule: '9월 15일 ~ 11월 28일 · 매주 화' },
  { id: 'a-ai-club', title: 'AI 프로젝트 학회', field: 'ai', status: 'ongoing', schedule: '9월 4일 ~ 12월 10일 · 매주 목' },
  { id: 'a-startup-club', title: '창업 동아리', field: 'startup', status: 'ongoing', schedule: '9월 ~ 12월 · 격주 화' },
  { id: 'a-hackathon', title: '가을 데이터 해커톤', field: 'data', status: 'ended', schedule: '10월 11일 끝남' },
  { id: 'a-pm-talk', title: '기획자 직무 특강', field: 'career', status: 'ended', schedule: '10월 8일 끝남' },
  { id: 'a-opencampus', title: '오픈 캠퍼스 안내 봉사', field: 'club', status: 'ended', schedule: '10월 10일 끝남' },
  { id: 'a-design-hack', title: '교내 디자인 해커톤', field: 'product', status: 'recorded', schedule: '9월 19일 끝남 · 기록했어요', recordId: 'e4' },
  { id: 'a-usability', title: '서비스 사용성 테스트', field: 'research', status: 'recorded', schedule: '10월 2일 끝남 · 기록했어요', recordId: 'e6' },
  { id: 'a-exchange', title: '교환학생 선발', field: 'global', status: 'declined', schedule: '다음 모집 2027-1학기' }
];

/** 이미 '맞아요'라고 한 발견(추천 반영 중). 나머지 발견은 확인 전이다. */
const CONFIRMED_KEYS = ['up:listen', 'up:present'];
export const EXAMPLE_CONFIRM: Record<string, Confirm> = Object.fromEntries(
  discoveriesOf(SEED_RECORDS.filter(r => r.useForRecommend)).filter(d => CONFIRMED_KEYS.includes(d.key)).map(d => [d.key, { status: 'yes' as const, sig: d.sig }])
);

/** 예시 학생은 공개로 시작한다(예시라서). 새 학생 기본값은 비공개 그대로다. */
export const EXAMPLE_VISIBILITY: Visibility = {
  profilePublic: true,
  hallOfFameConsent: false,
  hiddenActivityIds: [],
  sharedRecordIds: ['e2', 'r-mentor'],
  showcaseChallengeIds: ['role-swap', 'explainer']
};

/** 예시 학생이 이미 달성한 도전 과제의 달성 시각. 들어오자마자 달성 토스트가 쏟아지지 않게 미리 둔다. */
const at = (iso: string) => Date.parse(`${iso}T12:00:00+09:00`);
export const EXAMPLE_CHALLENGE_AT: Record<string, number> = {
  'first-retro': at('2024-05-20'),
  'three-paths': at('2025-03-28'),
  'first-places': at('2024-12-18'),
  'explainer': at('2025-05-22'),
  'role-swap': at('2025-11-27')
};

/** 경험 지도에서 학생이 '맞아요'라고 한 연결(기록~기록). 나머지 선은 AI 추정(점선)이다. */
export const EXAMPLE_EDGE_ANSWERS: Record<string, 'yes' | 'no'> = { 'e2~e6': 'yes', 'e3~r-survey': 'yes', 'r-mentee~r-mentor': 'yes' };
