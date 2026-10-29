import type { Activity, Profile, RecordItem } from '../domain/types';

// 앱을 처음 열었을 때의 예시 상태. 실제 학생 데이터가 아니다.

export const EMPTY_PROFILE: Profile = { interests: [], time: 3, format: 'any', goal: '', importCS: false };
export const EXAMPLE_PROFILE: Profile = { interests: ['research', 'product'], time: 3, format: 'any', goal: '서비스 기획 직무', importCS: false };

export const SEED_RECORDS: RecordItem[] = [
  { id: 'e1', v: 1, title: '팀 서비스 개선안', kind: '교과', date: '1학기 · 3월', field: 'product', did: 'organize', energy: 'same', quote: '의견을 한 문장으로 묶으니 다음 행동이 보였다.', note: '서로 다른 팀원 의견을 불편 상황과 원인으로 나누어 문제 문장을 정리했다.', axes: ['problem', 'communication', 'collaboration'], source: 'seed', semester: '2026-1', verification: 'self', visibility: 'me', useForRecommend: true },
  { id: 'e2', v: 1, title: '사용자 인터뷰 과제', kind: '프로젝트', date: '1학기 · 5월', field: 'research', did: 'listen', energy: 'up', quote: '왜 그렇게 했는지 다시 물어보니 내 가정이 달라졌다.', note: '질문지를 만들고 답변에서 반복되는 표현을 표시했다.', axes: ['expertise', 'communication', 'problem'], source: 'seed', semester: '2026-1', verification: 'self', visibility: 'me', useForRecommend: true },
  { id: 'e3', v: 1, title: '리서치 스터디', kind: '비교과', date: '여름 · 7월', field: 'research', did: 'ask', energy: 'same', quote: '좋은 질문은 답을 유도하지 않고 상황을 떠올리게 했다.', note: '서비스 리서치 사례를 읽고 답을 유도하지 않는 질문 예시를 모았다.', axes: ['expertise', 'self', 'communication'], source: 'seed', semester: '2026-여름', verification: 'self', visibility: 'me', useForRecommend: true },
  { id: 'e4', v: 1, title: '교내 디자인 해커톤', kind: '프로젝트', date: '2학기 · 9월', field: 'product', did: 'make', energy: 'up', quote: '같은 문제정의 틀을 다른 과업에서도 쓸 수 있었다.', note: '두 가지 해결안을 비교하고 클릭형 화면 초안을 만들었다.', axes: ['problem', 'creative', 'collaboration'], source: 'seed', semester: '2026-2', verification: 'school', visibility: 'me', useForRecommend: true },
  { id: 'e5', v: 1, title: '동아리 캠페인 기획', kind: '비교과', date: '2학기 · 9월', field: 'club', did: 'organize', energy: 'same', quote: '누가 무엇을 맡는지 정리하니 다시 이야기할 여유가 생겼다.', note: '팀원과 참여자의 의견을 묶고 역할·공유 일정을 정리했다.', axes: ['communication', 'collaboration', 'creative'], source: 'seed', semester: '2026-2', verification: 'self', visibility: 'me', useForRecommend: true },
  { id: 'e6', v: 1, title: '서비스 사용성 테스트', kind: '프로젝트', date: '2학기 · 10월', field: 'research', did: 'listen', energy: 'up', quote: '내 설명보다 사용자가 실제로 멈춘 지점이 중요한 근거였다.', note: '사용 과정을 관찰하고 막힌 지점을 물었다.', axes: ['expertise', 'problem', 'self'], source: 'seed', semester: '2026-2', verification: 'self', visibility: 'me', useForRecommend: true }
];

/** 내 활동 보드 예시 8건 (docs/design/mockups/activities-board.png) */
export const SEED_ACTIVITIES: Activity[] = [
  { id: 'a-swm', title: 'SW 마에스트로 연수생 모집', field: 'dev', status: 'preparing', schedule: '연수 2027년 1월부터', prep: { done: 2, total: 3 }, due: { label: '신청 마감', dday: 5 } },
  { id: 'a-tutor', title: 'SW 튜터 모집', field: 'mentor', status: 'preparing', schedule: '11월부터 매주 1회', prep: { done: 0, total: 1 }, due: { label: '사전 설문 마감 18:00', dday: 0 } },
  { id: 'a-global-camp', title: '글로벌 리더십 캠프', field: 'global', status: 'applied', schedule: '결과 발표 10월 30일' },
  { id: 'a-ai-club', title: 'AI 프로젝트 학회', field: 'ai', status: 'ongoing', schedule: '9월 4일 ~ 12월 10일 · 매주 목' },
  { id: 'a-startup-club', title: '창업 동아리', field: 'startup', status: 'ongoing', schedule: '9월 ~ 12월 · 격주 화' },
  { id: 'a-hackathon', title: '가을 데이터 해커톤', field: 'data', status: 'ended', schedule: '10월 11일 끝남' },
  { id: 'a-dataviz', title: '데이터 시각화 특강', field: 'data', status: 'recorded', schedule: '기록 보관함으로 옮겼어요' },
  { id: 'a-exchange', title: '교환학생 선발', field: 'global', status: 'declined', schedule: '다음 모집 2027-1학기' }
];
