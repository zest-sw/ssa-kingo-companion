import type { Catalog, Direction, Job, Program, Req } from '../domain/types';

// 예시 기회와 채용 공고 요건. v0.7 에서 옮겼다. 채용 공고만 2026.10.08 직접 확인한 공개 공고이고 직무 참고용이다.

export const PROGRAMS: Program[] = [
  { id: 'p-interview', title: '사용자 인터뷰 실습 워크숍', host: '학생성장 비교과 (예시)', field: 'research', format: 'offline', when: '10.14(수) 18:30', hours: 2, durationLabel: '2시간', ddayW1: 2, weeks: [1], place: '인문사회과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: false, did: ['listen', 'ask'], level: 1, career: { req: 'auth-feedback', part: 'match' }, summary: '실제 사용자 한 명을 인터뷰하고 답변을 정리해 봐요.', otherDates: ['10.28(수) 18:30'] },
  { id: 'p-talk', title: '현직 UX 리서처 커리어 토크', host: '경력개발 비교과 (예시)', field: 'research', format: 'online', when: '10.22(목) 19:00', hours: 1.5, durationLabel: '1시간 30분', ddayW1: 7, weeks: [1, 2], place: '온라인', target: '전 학년', eligible: true, seatsKnown: true, did: ['listen', 'ask'], level: 1, career: { req: 'survey-research', part: 'match' }, summary: '리서처의 하루와 첫 프로젝트 이야기를 듣고 질문해요.' },
  { id: 'p-dataviz', title: '설문 결과로 말하기: 데이터 시각화 특강', host: '데이터 비교과 (예시)', field: 'data', format: 'online', when: '10.21(수) 19:00', hours: 1.5, durationLabel: '1시간 30분', ddayW1: 8, weeks: [1, 2], place: '온라인', target: '전 학년', eligible: true, seatsKnown: true, did: ['make', 'present'], level: 1, career: { req: 'auth-feedback', part: 'gap', gapLabel: '데이터' }, summary: '설문 응답을 표와 차트 한 장으로 바꿔 설명해요.' },
  { id: 'p-chatbot', title: 'AI 챗봇 대화 설계 체험', host: 'SW교육 비교과 (예시)', field: 'ai', format: 'offline', when: '10.15(목) 15:00', hours: 2, durationLabel: '2시간', ddayW1: 1, weeks: [1], place: '자연과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: true, did: ['make', 'ask'], level: 2, career: { req: 'chat-monitor', part: 'match' }, summary: '챗봇이 엉뚱하게 답한 대화를 찾아 고쳐 봐요.' },
  { id: 'p-portfolio', title: '포트폴리오 1:1 피드백', host: '경력개발 비교과 (예시)', field: 'career', format: 'online', when: '10.16(금) 16:00', hours: 1, durationLabel: '1시간', ddayW1: 3, weeks: [1], place: '온라인', target: '전 학년', eligible: true, seatsKnown: false, did: ['present'], level: 1, summary: '프로젝트 하나를 15분 동안 설명하고 피드백을 받아요.' },
  { id: 'p-writing', title: '경험을 문장으로: 자기소개 글쓰기', host: '글쓰기 비교과 (예시)', field: 'career', format: 'online', when: '10.17(토) 10:00', hours: 2, durationLabel: '2시간', ddayW1: 4, weeks: [1], place: '온라인', target: '전 학년', eligible: true, seatsKnown: true, did: ['present', 'organize'], level: 1, summary: '지난 활동 하나를 읽히는 문장으로 다듬어요.' },
  { id: 'p-pitch', title: '창업 아이디어 피칭 데이', host: '창업 비교과 (예시)', field: 'startup', format: 'offline', when: '10.23(금) 14:00', hours: 3, durationLabel: '3시간', ddayW1: 10, weeks: [1, 2], place: '인문사회과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: true, did: ['idea', 'present'], level: 2, summary: '아이디어 하나를 3분 동안 발표하고 질문을 받아요.' },
  { id: 'p-ideathon', title: '캠퍼스 서비스 개선 아이디어톤', host: '창업 비교과 (예시)', field: 'product', format: 'offline', when: '10.24(토) 10:00', hours: 6, durationLabel: '반나절', ddayW1: 9, weeks: [1, 2], place: '자연과학캠퍼스 (예시)', target: '전 학년 · 3인 팀', eligible: true, seatsKnown: true, did: ['idea', 'organize', 'make'], level: 2, career: { req: 'auth-collab', part: 'match' }, summary: '팀으로 학교 서비스 하나를 골라 개선안을 만들어요.' },
  { id: 'p-field', title: '학생 서비스 현장 인터뷰 프로젝트', host: '학생지원 비교과 (예시)', field: 'research', format: 'offline', when: '10.20(화)부터 4주', hours: 2, durationLabel: '4주 · 주 2시간', ddayW1: 6, weeks: [1], place: '인문사회과학캠퍼스 (예시)', target: '3학년 이상', eligible: false, seatsKnown: true, did: ['listen', 'organize', 'present'], level: 3, summary: '학교 서비스 이용자를 4주 동안 인터뷰해요.' },
  { id: 'p-usability', title: '앱 사용성 테스트 관찰 서포터즈', host: '정보통신 비교과 (예시)', field: 'research', format: 'offline', when: '10.13(화) 17:00', hours: 2, durationLabel: '2시간', ddayW1: -1, weeks: [1], place: '자연과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: true, did: ['listen', 'make'], level: 1, summary: '사용성 테스트를 옆에서 관찰하고 기록해요.' },
  { id: 'p-survey', title: '학내 설문 설계 실습', host: '학생성장 비교과 (예시)', field: 'research', format: 'offline', when: '10.21(수) 16:00', hours: 2, durationLabel: '2시간', ddayW1: 10, weeks: [2], place: '인문사회과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: false, did: ['ask', 'make'], level: 2, career: { req: 'survey-research', part: 'match' }, summary: '질문 다섯 개짜리 설문을 만들고 서로 고쳐 봐요.' },
  { id: 'p-coffee', title: '선배 기획자와 커피챗', host: '동문 멘토링 (예시)', field: 'career', format: 'offline', when: '10.22(목) 12:00', hours: 1, durationLabel: '1시간', ddayW1: 9, weeks: [2], place: '학생회관 (예시)', target: '전 학년', eligible: true, seatsKnown: false, did: ['listen', 'ask'], level: 1, summary: '기획 직무 선배에게 첫해에 한 일을 물어봐요.' },
  { id: 'p-dashboard', title: '지표 대시보드 입문 실습', host: '데이터 비교과 (예시)', field: 'data', format: 'online', when: '10.28(수) 19:00', hours: 2, durationLabel: '2시간', ddayW1: 16, weeks: [3], place: '온라인', target: '전 학년', eligible: true, seatsKnown: true, did: ['make', 'organize'], level: 2, career: { req: 'chat-dashboard', part: 'gap', gapLabel: '대시보드' }, summary: '공개 데이터로 지표 세 개를 정하고 대시보드를 만들어요.' },
  { id: 'p-uxstudy', title: 'UX 리서치 입문 스터디', host: '학생성장 비교과 (예시)', field: 'research', format: 'offline', when: '10.27(화) 18:00', hours: 1.5, durationLabel: '1시간 30분', ddayW1: 15, weeks: [3], place: '인문사회과학캠퍼스 (예시)', target: '전 학년', eligible: true, seatsKnown: true, did: ['ask', 'listen'], level: 1, career: { req: 'survey-research', part: 'match' }, summary: '리서치 사례 하나를 읽고 질문을 다시 써 봐요.' },
  { id: 'p-mentor', title: '지역 아동센터 학습 멘토링', host: '사회봉사 비교과 (예시)', field: 'club', format: 'offline', when: '10.29(목) 16:00', hours: 2, durationLabel: '2시간', ddayW1: 17, weeks: [3], place: '종로구 (예시)', target: '전 학년', eligible: true, seatsKnown: false, did: ['present', 'organize'], level: 1, summary: '초등학생 두 명의 숙제를 함께 봐 줘요.' }
];
export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p])) as Record<string, Program>;

export const JOBS: Job[] = [
  { id: 'job-auth', company: '카카오뱅크', short: '서비스 기획(인증)', title: '서비스 기획자 · 인증기획', url: 'https://recruit.kakaobank.com/jobs/257886', checkedAt: '2026.10.08', state: '모집 중 표기 · 경력 2년 이상 · 직무 참고' },
  { id: 'job-survey', company: '카카오뱅크', short: '서비스 기획(서베이)', title: '서비스 기획자 · 서베이 플랫폼', url: 'https://recruit.kakaobank.com/jobs/266664', checkedAt: '2026.10.08', state: '마감 시각 경과 · 직무 참고' },
  { id: 'job-chatbot', company: '카카오뱅크', short: 'AI 챗봇 운영', title: 'AI 상담 챗봇 운영 어시스턴트', url: 'https://recruit.kakaobank.com/jobs/268231', checkedAt: '2026.10.08', state: '모집 중 표기 · 체험형 인턴' }
];
export const REQS: Req[] = [
  { id: 'auth-feedback', job: 'job-auth', label: '데이터 또는 고객 피드백 기반 서비스 개선', kind: '필수' },
  { id: 'auth-collab', job: 'job-auth', label: '다양한 직군과 소통·협업', kind: '필수' },
  { id: 'auth-launch', job: 'job-auth', label: '신규 서비스 기획·상용화', kind: '우대' },
  { id: 'survey-research', job: 'job-survey', label: '리서치 또는 설문조사 수행', kind: '필수' },
  { id: 'survey-collab', job: 'job-survey', label: '협업하며 주도적으로 과제 진행', kind: '필수' },
  { id: 'survey-platform', job: 'job-survey', label: 'B2B·모바일 서비스 기획', kind: '필수' },
  { id: 'chat-monitor', job: 'job-chatbot', label: '챗봇 모니터링(오탐·폴백)', kind: '담당업무' },
  { id: 'chat-collab', job: 'job-chatbot', label: '커뮤니케이션·협업', kind: '필수' },
  { id: 'chat-office', job: 'job-chatbot', label: '오피스 도구 활용', kind: '필수' },
  { id: 'chat-sql', job: 'job-chatbot', label: 'Python·SQL 분석 도구', kind: '우대' },
  { id: 'chat-dashboard', job: 'job-chatbot', label: '지표 대시보드 관리', kind: '담당업무' }
];
export const DIRECTIONS: Direction[] = [
  { id: 'product', field: 'product', label: '서비스·프로덕트 기획', reqIds: ['auth-feedback', 'auth-collab', 'auth-launch'] },
  { id: 'research', field: 'research', label: '리서치 기반 기획', reqIds: ['survey-research', 'survey-collab', 'survey-platform'] },
  { id: 'data', field: 'data', label: '데이터 기반 분석', reqIds: ['chat-sql', 'chat-dashboard'] },
  { id: 'ai', field: 'ai', label: 'AI 서비스 운영', reqIds: ['chat-monitor', 'chat-collab', 'chat-office'] }
];
/** 요건별 근거 기록 id (예시) */
export const INITIAL_REQ_EVIDENCE: Record<string, string[]> = {
  'auth-feedback': ['e2', 'e4', 'e6'], 'auth-collab': ['e1', 'e5'], 'auth-launch': [], 'survey-research': ['e2', 'e3', 'e6'], 'survey-collab': ['e1', 'e5'],
  'survey-platform': [], 'chat-monitor': ['e6'], 'chat-collab': ['e1', 'e5'], 'chat-office': [], 'chat-sql': [], 'chat-dashboard': []
};

export const CATALOG: Catalog = { programs: PROGRAMS, jobs: JOBS, reqs: REQS, directions: DIRECTIONS };
