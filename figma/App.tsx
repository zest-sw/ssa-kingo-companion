import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import '../styles/index.css';

/* 킹고 컴패니언 v0.7 · 에이전트 큐레이션 UX
   - 예시 데이터와 React 메모리 상태만 사용 (실제 AI·학교 API·챌린지스퀘어·저장소 미연결)
   - 핵심 루프: 받기 → 하기 → 남기기 → 알게 되기 */

type Tab = 'week' | 'records' | 'me';
type Did = 'listen' | 'ask' | 'organize' | 'make' | 'idea' | 'present';
type Energy = 'up' | 'same' | 'down';
type Field = 'research' | 'product' | 'data' | 'ai' | 'career' | 'startup' | 'club' | 'etc';
type Interest = Field | 'unknown';
type Axis = 'expertise' | 'problem' | 'communication' | 'collaboration' | 'self' | 'creative';
type Phase = 'suggest' | 'committed' | 'checkin' | 'skipped' | 'missed';
type Format = 'offline' | 'online' | 'any';
type Mode = 'explore' | 'focus';
type Profile = { interests: Interest[]; time: number; format: Format; importCS: boolean };
type RecordItem = { id: string; v: number; title: string; kind: string; date: string; field: Field; did: Did; energy: Energy; quote: string; note: string; axes: Axis[]; source: 'seed' | 'agent' | 'manual'; programId?: string };
type CareerLink = { req: string; part: 'match' | 'gap'; gapLabel?: string };
type Program = { id: string; title: string; host: string; field: Field; format: 'offline' | 'online'; when: string; hours: number; durationLabel: string; ddayW1: number; weeks: number[]; place: string; target: string; eligible: boolean; seatsKnown: boolean; did: Did[]; level: 1 | 2 | 3; career?: CareerLink; summary: string; otherDates?: string[] };
type ReasonKind = 'energy' | 'focus' | 'career' | 'novelty' | 'interest' | 'bridge';
type Reason = { kind: ReasonKind; text: string; source?: string; recordId?: string; url?: string };
type Scored = { p: Program; score: number; reasons: Reason[] };
type Funnel = { pool: number; open: number; eligible: number; fit: number; fresh: number };
type Discovery = { key: string; did: Did; kind: 'up' | 'freq'; statement: string; evidence: RecordItem[]; sig: string[] };
type DiscState = 'none' | 'yes' | 'no' | 'changed';
type Confirm = { status: 'yes' | 'no'; sig: string[] };
type LastDone = { recordId: string; title: string; field: Field };
type Settings = { discover: boolean; career: boolean };
type DislikeKind = 'time' | 'field' | 'done' | 'hard';
type Completion = { sentence: string; discoveryLine: string; discoveryKey?: string; careerLine?: string; recordId: string };
type SheetState = { type: 'why' } | { type: 'alts' } | { type: 'how' } | { type: 'dislike' } | { type: 'reflect' } | { type: 'record'; id: string } | { type: 'add' } | { type: 'data' } | { type: 'info' } | { type: 'memo' } | { type: 'reset' };
type Snap = { week: number; phase: Phase; pickedId: string | null; committedId: string | null; records: RecordItem[]; doneIds: string[]; excluded: string[]; dislikedFields: Field[]; preferEasier: boolean; confirm: Record<string, Confirm>; reqEvidence: Record<string, string[]>; lastDone: LastDone | null; settings: Settings; profile: Profile };
type Job = { id: string; company: string; short: string; title: string; url: string; checkedAt: string; state: string };
type Req = { id: string; job: string; label: string; kind: '필수' | '우대' | '담당업무' };
type Direction = { id: string; field: Field; label: string; reqIds: string[] };

/* ---------- 고정 데이터 (모두 예시, 채용 공고만 2026.10.08 직접 확인) ---------- */
const CS_URL = 'https://chsquare.skku.edu/challenge/nxui/index.html';
const DID_LIST: { id: Did; label: string }[] = [
  { id: 'listen', label: '듣고 정리하기' }, { id: 'ask', label: '질문하기' }, { id: 'organize', label: '의견 묶고 조율하기' },
  { id: 'make', label: '직접 만들기' }, { id: 'idea', label: '아이디어 내기' }, { id: 'present', label: '설명·발표하기' }
];
const DID_LABEL = Object.fromEntries(DID_LIST.map(d => [d.id, d.label])) as Record<Did, string>;
const ENERGY: { id: Energy; label: string; sub: string }[] = [
  { id: 'up', label: '더 생겼어요', sub: '또 해 보고 싶어요' }, { id: 'same', label: '그대로예요', sub: '괜찮았어요' }, { id: 'down', label: '좀 지쳤어요', sub: '다음엔 짧게 할래요' }
];
const ENERGY_SHORT: Record<Energy, string> = { up: '더 생김', same: '그대로', down: '지침' };
const ENERGY_SENTENCE: Record<Energy, string> = { up: '끝난 뒤 에너지가 더 생겼다', same: '에너지는 평소와 비슷했다', down: '끝난 뒤 조금 지쳤다' };
const FIELD_LABEL: Record<Field, string> = { research: 'UX·리서치', product: '서비스 기획', data: '데이터', ai: 'AI', career: '진로·취업 준비', startup: '창업', club: '동아리·봉사', etc: '기타' };
const INTEREST_OPTIONS: { id: Interest; label: string }[] = [
  { id: 'research', label: 'UX·리서치' }, { id: 'product', label: '서비스 기획' }, { id: 'data', label: '데이터' }, { id: 'ai', label: 'AI' },
  { id: 'career', label: '진로·취업 준비' }, { id: 'startup', label: '창업' }, { id: 'unknown', label: '아직 모르겠어요' }
];
const TIME_OPTIONS = [
  { value: 1.5, label: '1시간 안팎', sub: '짧은 특강·상담 위주' }, { value: 3, label: '2~3시간', sub: '워크숍 한 번 정도' }, { value: 8, label: '반나절도 괜찮아요', sub: '해커톤·현장 활동까지' }
];
const FORMAT_OPTIONS: { value: Format; label: string; sub: string }[] = [
  { value: 'any', label: '상관없어요', sub: '둘 다 추천해 주세요' }, { value: 'offline', label: '직접 만나서', sub: '캠퍼스 활동 위주' }, { value: 'online', label: '온라인으로', sub: '이동 없이 참여' }
];
const UP_STATEMENT: Record<Did, string> = {
  listen: '사람 이야기를 듣고 정리할 때 에너지가 올라가요', ask: '질문을 바꿔 가며 답을 찾을 때 에너지가 올라가요', organize: '의견을 묶고 조율할 때 에너지가 올라가요',
  make: '직접 만들어 볼 때 에너지가 올라가요', idea: '아이디어를 낼 때 에너지가 올라가요', present: '설명하고 발표할 때 에너지가 올라가요'
};
const FREQ_STATEMENT: Record<Did, string> = {
  listen: '듣고 정리하는 역할을 자주 맡아요', ask: '질문을 만드는 역할을 자주 맡아요', organize: '흩어진 의견을 묶는 역할을 자주 맡아요',
  make: '직접 만드는 역할을 자주 맡아요', idea: '아이디어를 내는 역할을 자주 맡아요', present: '설명·발표 역할을 자주 맡아요'
};
const DID_AXES: Record<Did, Axis[]> = { listen: ['communication', 'expertise'], ask: ['problem', 'communication'], organize: ['collaboration', 'communication'], make: ['creative', 'problem'], idea: ['creative', 'self'], present: ['communication', 'self'] };
const QUOTE_HINTS: Record<Did, string[]> = {
  listen: ['다시 물어보니 답이 달라졌다', '상대 말을 요약해서 확인했다', '생각보다 듣는 게 어려웠다'],
  ask: ['질문 하나를 바꾸니 대화가 풀렸다', '유도 질문을 피하려고 애썼다', '물어볼 게 계속 생겼다'],
  organize: ['의견을 한 문장으로 묶었다', '역할을 나누니 속도가 붙었다', '조율하느라 내 의견은 못 냈다'],
  make: ['직접 만들어 보니 이해가 됐다', '생각보다 시간이 오래 걸렸다', '다른 사람 피드백이 도움이 됐다'],
  idea: ['엉뚱한 아이디어가 채택됐다', '아이디어를 좁히는 게 어려웠다', '다른 사람 아이디어에 덧붙였다'],
  present: ['설명하면서 생각이 정리됐다', '질문에 바로 답하기 어려웠다', '다음엔 더 짧게 말하고 싶다']
};
const AXES: { id: Axis; label: string }[] = [
  { id: 'expertise', label: '전문성' }, { id: 'problem', label: '문제해결' }, { id: 'communication', label: '소통' },
  { id: 'collaboration', label: '협업' }, { id: 'self', label: '자기주도' }, { id: 'creative', label: '창의성' }
];
const SEED_RECORDS: RecordItem[] = [
  { id: 'e1', v: 1, title: '팀 서비스 개선안', kind: '교과', date: '1학기 · 3월', field: 'product', did: 'organize', energy: 'same', quote: '의견을 한 문장으로 묶으니 다음 행동이 보였다.', note: '서로 다른 팀원 의견을 불편 상황과 원인으로 나누어 문제 문장을 정리했다.', axes: ['problem', 'communication', 'collaboration'], source: 'seed' },
  { id: 'e2', v: 1, title: '사용자 인터뷰 과제', kind: '프로젝트', date: '1학기 · 5월', field: 'research', did: 'listen', energy: 'up', quote: '왜 그렇게 했는지 다시 물어보니 내 가정이 달라졌다.', note: '질문지를 만들고 답변에서 반복되는 표현을 표시했다.', axes: ['expertise', 'communication', 'problem'], source: 'seed' },
  { id: 'e3', v: 1, title: '리서치 스터디', kind: '비교과', date: '여름 · 7월', field: 'research', did: 'ask', energy: 'same', quote: '좋은 질문은 답을 유도하지 않고 상황을 떠올리게 했다.', note: '서비스 리서치 사례를 읽고 답을 유도하지 않는 질문 예시를 모았다.', axes: ['expertise', 'self', 'communication'], source: 'seed' },
  { id: 'e4', v: 1, title: '교내 디자인 해커톤', kind: '프로젝트', date: '2학기 · 9월', field: 'product', did: 'make', energy: 'up', quote: '같은 문제정의 틀을 다른 과업에서도 쓸 수 있었다.', note: '두 가지 해결안을 비교하고 클릭형 화면 초안을 만들었다.', axes: ['problem', 'creative', 'collaboration'], source: 'seed' },
  { id: 'e5', v: 1, title: '동아리 캠페인 기획', kind: '비교과', date: '2학기 · 9월', field: 'club', did: 'organize', energy: 'same', quote: '누가 무엇을 맡는지 정리하니 다시 이야기할 여유가 생겼다.', note: '팀원과 참여자의 의견을 묶고 역할·공유 일정을 정리했다.', axes: ['communication', 'collaboration', 'creative'], source: 'seed' },
  { id: 'e6', v: 1, title: '서비스 사용성 테스트', kind: '프로젝트', date: '2학기 · 10월', field: 'research', did: 'listen', energy: 'up', quote: '내 설명보다 사용자가 실제로 멈춘 지점이 중요한 근거였다.', note: '사용 과정을 관찰하고 막힌 지점을 물었다.', axes: ['expertise', 'problem', 'self'], source: 'seed' }
];
const PROGRAMS: Program[] = [
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
const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map(p => [p.id, p])) as Record<string, Program>;
const JOBS: Job[] = [
  { id: 'job-auth', company: '카카오뱅크', short: '서비스 기획(인증)', title: '서비스 기획자 · 인증기획', url: 'https://recruit.kakaobank.com/jobs/257886', checkedAt: '2026.10.08', state: '모집 중 표기 · 경력 2년 이상 · 직무 참고' },
  { id: 'job-survey', company: '카카오뱅크', short: '서비스 기획(서베이)', title: '서비스 기획자 · 서베이 플랫폼', url: 'https://recruit.kakaobank.com/jobs/266664', checkedAt: '2026.10.08', state: '마감 시각 경과 · 직무 참고' },
  { id: 'job-chatbot', company: '카카오뱅크', short: 'AI 챗봇 운영', title: 'AI 상담 챗봇 운영 어시스턴트', url: 'https://recruit.kakaobank.com/jobs/268231', checkedAt: '2026.10.08', state: '모집 중 표기 · 체험형 인턴' }
];
const JOB_BY_ID = Object.fromEntries(JOBS.map(j => [j.id, j])) as Record<string, Job>;
const REQS: Req[] = [
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
const REQ_BY_ID = Object.fromEntries(REQS.map(r => [r.id, r])) as Record<string, Req>;
const DIRECTIONS: Direction[] = [
  { id: 'product', field: 'product', label: '서비스·프로덕트 기획', reqIds: ['auth-feedback', 'auth-collab', 'auth-launch'] },
  { id: 'research', field: 'research', label: '리서치 기반 기획', reqIds: ['survey-research', 'survey-collab', 'survey-platform'] },
  { id: 'data', field: 'data', label: '데이터 기반 분석', reqIds: ['chat-sql', 'chat-dashboard'] },
  { id: 'ai', field: 'ai', label: 'AI 서비스 운영', reqIds: ['chat-monitor', 'chat-collab', 'chat-office'] }
];
const INITIAL_REQ_EVIDENCE: Record<string, string[]> = {
  'auth-feedback': ['e2', 'e4', 'e6'], 'auth-collab': ['e1', 'e5'], 'auth-launch': [], 'survey-research': ['e2', 'e3', 'e6'], 'survey-collab': ['e1', 'e5'],
  'survey-platform': [], 'chat-monitor': ['e6'], 'chat-collab': ['e1', 'e5'], 'chat-office': [], 'chat-sql': [], 'chat-dashboard': []
};
const DISLIKES: { id: DislikeKind; label: string; effect: string; toast: string }[] = [
  { id: 'time', label: '시간이 안 맞아요', effect: '이 활동을 빼고 다시 골라요', toast: '이 활동을 빼고 다시 골랐어요.' },
  { id: 'field', label: '관심 없는 분야예요', effect: '이 분야는 덜 추천해요', toast: '이 분야는 덜 추천할게요. 다시 골랐어요.' },
  { id: 'done', label: '이미 해 본 활동이에요', effect: '목록에서 빼요', toast: '해 본 활동으로 빼고 다시 골랐어요.' },
  { id: 'hard', label: '너무 어려워 보여요', effect: '입문 활동부터 추천해요', toast: '입문 활동 위주로 다시 골랐어요.' }
];
const KIND_LABEL: Record<ReasonKind, string> = { energy: '내 기록', focus: '확인한 발견', career: '진로', novelty: '탐색', interest: '관심', bridge: '지난주 반영' };
const STATE_TEXT: Record<DiscState, string> = { none: '아직 확인 전이에요', yes: '맞다고 했어요 · 추천에 반영 중', no: '아니라고 했어요 · 추천에 쓰지 않아요', changed: '근거가 바뀌었어요 · 다시 확인해 주세요' };
const LOOP = ['받기', '하기', '남기기', '알게 되기'];
const EMPTY_PROFILE: Profile = { interests: [], time: 3, format: 'any', importCS: false };
const EXAMPLE_PROFILE: Profile = { interests: ['research', 'product'], time: 3, format: 'any', importCS: false };
const WEEK_LABEL = ['10월 12일 월요일', '10월 19일 월요일', '10월 26일 월요일', '11월 2일 월요일'];

/* ---------- 계산 ---------- */
const hasBatchim = (w: string) => { const c = w.trim().charCodeAt(w.trim().length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const josa = (w: string, withB: string, noB: string) => (hasBatchim(w) ? withB : noB);
const ddayOf = (p: Program, week: number) => p.ddayW1 - 7 * (week - 1);
const ddayText = (d: number) => (d <= 0 ? '오늘까지' : `D-${d}`);
const timeLabel = (t: number) => TIME_OPTIONS.find(o => o.value === t)?.label ?? `${t}시간`;
const sigOf = (rs: RecordItem[]) => rs.map(r => `${r.id}@${r.v}`).sort();
const sentenceOf = (r: RecordItem, p?: Program) => `${r.title}${p ? `(${p.durationLabel})` : ''}에서 ‘${DID_LABEL[r.did]}’${josa(DID_LABEL[r.did], '을', '를')} 주로 했고, ${ENERGY_SENTENCE[r.energy]}.`;

function discoveriesOf(records: RecordItem[]): Discovery[] {
  const out: Discovery[] = [];
  for (const d of DID_LIST) {
    const all = records.filter(r => r.did === d.id);
    const ups = all.filter(r => r.energy === 'up');
    if (ups.length >= 2) out.push({ key: `up:${d.id}`, did: d.id, kind: 'up', statement: UP_STATEMENT[d.id], evidence: ups, sig: sigOf(ups) });
    else if (all.length >= 2) out.push({ key: `freq:${d.id}`, did: d.id, kind: 'freq', statement: FREQ_STATEMENT[d.id], evidence: all, sig: sigOf(all) });
  }
  return out.sort((a, b) => b.evidence.length - a.evidence.length);
}
const directionsOf = (profile: Profile) => DIRECTIONS.filter(d => profile.interests.includes(d.field));

type RankCtx = { week: number; profile: Profile; records: RecordItem[]; doneIds: string[]; excluded: string[]; dislikedFields: Field[]; preferEasier: boolean; mode: Mode; focusDids: Did[]; rejectedDids: Did[]; careerOn: boolean; reflectOn: boolean; last: LastDone | null };
function rank(ctx: RankCtx): { scored: Scored[]; funnel: Funnel } {
  const pool = PROGRAMS.filter(p => p.weeks.includes(ctx.week));
  const open = pool.filter(p => ddayOf(p, ctx.week) >= 0);
  const eligible = open.filter(p => p.eligible);
  const fit = eligible.filter(p => p.hours <= ctx.profile.time && (ctx.profile.format === 'any' || p.format === ctx.profile.format));
  const fresh = fit.filter(p => !ctx.doneIds.includes(p.id) && !ctx.excluded.includes(p.id));
  const tried = new Set(ctx.records.map(r => r.field));
  const upDids = new Set(ctx.reflectOn ? ctx.records.filter(r => r.energy === 'up').map(r => r.did).filter(d => !ctx.rejectedDids.includes(d)) : []);
  const downDids = new Set(ctx.reflectOn ? ctx.records.filter(r => r.energy === 'down').map(r => r.did) : []);
  const unknown = ctx.profile.interests.includes('unknown');
  const dirs = directionsOf(ctx.profile);
  const scored = fresh.map(p => {
    let score = 0; const reasons: Reason[] = [];
    const energyDid = p.did.find(d => upDids.has(d));
    if (energyDid) {
      score += 2;
      const rec = [...ctx.records].reverse().find(r => r.energy === 'up' && r.did === energyDid);
      if (rec) reasons.push({ kind: 'energy', text: `${rec.title}에서 ‘${DID_LABEL[energyDid]}’ 뒤 에너지가 더 생겼다고 남겼어요.`, source: `기록 보기 · ${rec.title}`, recordId: rec.id });
    }
    if (p.did.some(d => downDids.has(d))) score -= 1.5;
    if (ctx.mode === 'focus') {
      const f = p.did.find(d => ctx.focusDids.includes(d));
      if (f) { score += 2; reasons.push({ kind: 'focus', text: `맞다고 확인한 발견 ‘${UP_STATEMENT[f]}’에 맞춰 골랐어요.` }); }
    }
    if (ctx.careerOn && p.career) {
      const req = REQ_BY_ID[p.career.req]; const job = JOB_BY_ID[req.job];
      if (dirs.some(d => d.reqIds.includes(req.id))) {
        score += p.career.part === 'gap' ? 1.5 : 1;
        reasons.push({ kind: 'career', text: p.career.part === 'gap' ? `${job.company} ${job.short} 공고의 ‘${req.label}’ 요건에서 아직 기록이 없는 ${p.career.gapLabel} 쪽을 채워요.` : `${job.company} ${job.short} 공고의 ‘${req.label}’ 요건과 이어져요.`, source: `공고 원문 보기 · ${job.checkedAt} 확인`, url: job.url });
      }
    }
    if (ctx.mode === 'explore' && !tried.has(p.field)) { score += unknown ? 2 : 1; reasons.push({ kind: 'novelty', text: `아직 해 보지 않은 ‘${FIELD_LABEL[p.field]}’ 분야예요. 넓게 탐색하는 중이라 섞었어요.` }); }
    if (ctx.profile.interests.includes(p.field)) { score += 3; reasons.push({ kind: 'interest', text: `처음에 고른 관심 ‘${FIELD_LABEL[p.field]}’${josa(FIELD_LABEL[p.field], '과', '와')} 맞아요.` }); }
    if (ctx.dislikedFields.includes(p.field)) score -= 4;
    if (ctx.preferEasier && p.level > 1) score -= 2;
    if (ctx.last && p.field === ctx.last.field) score -= 2;
    if (ctx.last && p.field !== ctx.last.field) reasons.push({ kind: 'bridge', text: `지난주 ‘${ctx.last.title}’ 기록을 반영해, 같은 분야는 한 주 쉬고 다른 분야를 섞었어요.` });
    if (ddayOf(p, ctx.week) <= 3) score += 0.3;
    return { p, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return { scored, funnel: { pool: pool.length, open: open.length, eligible: eligible.length, fit: fit.length, fresh: fresh.length } };
}
const MAIN_ORDER: ReasonKind[] = ['energy', 'focus', 'career', 'novelty', 'interest'];
const mainReason = (rs: Reason[]) => MAIN_ORDER.map(k => rs.find(r => r.kind === k)).find(Boolean);
const sortedReasons = (rs: Reason[]) => [...rs].sort((a, b) => [...MAIN_ORDER, 'bridge'].indexOf(a.kind) - [...MAIN_ORDER, 'bridge'].indexOf(b.kind)).slice(0, 4);
function pickAlternatives(scored: Scored[], base: Program): Scored[] {
  const rest = scored.filter(s => s.p.id !== base.id);
  const a1 = rest[0]; if (!a1) return [];
  const a2 = rest.slice(1).find(s => s.p.field !== base.field && s.p.field !== a1.p.field) ?? rest[1];
  return a2 ? [a1, a2] : [a1];
}
function diffLabel(a: Program, base: Program, tried: Set<Field>, interests: Interest[]) {
  if (a.field !== base.field && !tried.has(a.field)) return `새로운 분야 · ${FIELD_LABEL[a.field]}`;
  if (a.hours < base.hours) return `더 가볍게 · ${a.format !== base.format && a.format === 'online' ? '온라인 ' : ''}${a.durationLabel}`;
  if (a.format !== base.format) return a.format === 'online' ? '온라인으로' : '직접 만나서';
  if (a.level > base.level) return '한 단계 도전';
  if (interests.includes(a.field)) return `관심 분야 · ${FIELD_LABEL[a.field]}`;
  return `다른 일정 · ${a.when}`;
}

/* ---------- 작은 컴포넌트 ---------- */
type IconName = 'calendar' | 'clock' | 'flag' | 'check' | 'info' | 'x' | 'chevron' | 'down' | 'week' | 'records' | 'me' | 'plus' | 'leaf' | 'back' | 'external' | 'bell';
const ICON_PATHS: Record<IconName, ReactNode> = {
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></>,
  flag: <path d="M5.5 21V4.5m0 0h11l-2.2 4 2.2 4h-11"/>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5"/>,
  info: <><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></>,
  x: <path d="M6 6l12 12M18 6L6 18"/>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  down: <path d="M6 9l6 6 6-6"/>,
  week: <><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4M9 14.5l2 2 4-4"/></>,
  records: <><rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v10.5h14V9M10 13h4"/></>,
  me: <><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  leaf: <><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l8-8"/></>,
  back: <path d="M15 6l-6 6 6 6"/>,
  external: <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></>
};
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{ICON_PATHS[name]}</svg>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('h2')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return; }
      if (e.key !== 'Tab' || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])')];
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1]; const active = document.activeElement;
      if (e.shiftKey && (active === first || active === box.current.querySelector('h2'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; if (previous && document.contains(previous)) previous.focus(); };
  }, []);
  return (
    <div className="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={box}>
        <div className="sheet-head">
          <h2 id={id} tabIndex={-1}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="stepper" aria-label="이번 주 흐름">
      {LOOP.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'now' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="bar" aria-hidden="true"/>
          <span className="lbl">{i < current && <span className="sr-only">완료 </span>}{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Facts({ p, week, place }: { p: Program; week: number; place?: boolean }) {
  return (
    <dl className="facts">
      <div><dt><Icon name="calendar" size={16}/>언제</dt><dd>{p.when}</dd></div>
      <div><dt><Icon name="clock" size={16}/>얼마나</dt><dd>{p.durationLabel} · {p.format === 'online' ? '온라인' : '오프라인'}</dd></div>
      {place ? <div><dt><Icon name="flag" size={16}/>어디서</dt><dd>{p.place}</dd></div> : <div><dt><Icon name="flag" size={16}/>마감</dt><dd>{ddayText(ddayOf(p, week))}</dd></div>}
    </dl>
  );
}

function Onboarding({ initial, editing, onDone, onExample, onCancel }: { initial: Profile; editing: boolean; onDone: (p: Profile) => void; onExample: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(initial);
  const [working, setWorking] = useState(false);
  const head = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    head.current?.focus({ preventScroll: true });
  }, [step, working]);
  useEffect(() => {
    if (!working) return;
    const t = window.setTimeout(() => onDone(draft), 1500);
    return () => window.clearTimeout(t);
  }, [working]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: Interest) => setDraft(d => {
    if (id === 'unknown') return { ...d, interests: d.interests.includes('unknown') ? [] : ['unknown'] };
    const base = d.interests.filter(x => x !== 'unknown');
    if (base.includes(id)) return { ...d, interests: base.filter(x => x !== id) };
    return base.length >= 3 ? d : { ...d, interests: [...base, id] };
  });
  const finish = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (editing || reduce) onDone(draft); else setWorking(true);
  };
  const pool = PROGRAMS.filter(p => p.weeks.includes(1)).length;
  if (working) {
    return (
      <main className="onb working" aria-live="polite">
        <h1 ref={head} tabIndex={-1}>이번 주 활동을 고르는 중이에요</h1>
        <ul className="work-list">
          <li><Icon name="check" size={18}/>모집 중인 활동 {pool}개 확인</li>
          <li><Icon name="check" size={18}/>신청 대상·마감·내 시간 맞춰 보기</li>
          <li><Icon name="check" size={18}/>내 기록과 관심으로 하나 고르기</li>
        </ul>
        <button type="button" className="text-btn" onClick={() => onDone(draft)}>바로 보기</button>
      </main>
    );
  }
  return (
    <main className="onb">
      <div className="onb-top">
        <span className="brand"><span className="brand-mark"><Icon name="leaf" size={18}/></span>킹고 컴패니언</span>
        <span className="onb-count">{step + 1} / 3</span>
      </div>
      {step === 0 && !editing && <p className="onb-intro">찾고 비교하는 일은 제가 할게요.<br/>세 가지만 알려 주세요.</p>}
      {step === 0 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1}>요즘 관심 가는 걸 골라 주세요</h1>
          <p className="sub">최대 3개 · 몰라도 괜찮아요</p>
          <div className="chips" role="group" aria-labelledby="onb-q">
            {INTEREST_OPTIONS.map(o => <button key={o.id} type="button" className="chip" aria-pressed={draft.interests.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</button>)}
          </div>
        </section>
      )}
      {step === 1 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1}>한 주에 비교과에 쓸 수 있는 시간은요?</h1>
          <p className="sub">이보다 긴 활동은 추천에서 빼 둘게요</p>
          <div className="options" role="group" aria-labelledby="onb-q">
            {TIME_OPTIONS.map(o => <button key={o.value} type="button" className="option" aria-pressed={draft.time === o.value} onClick={() => setDraft({ ...draft, time: o.value })}><b>{o.label}</b><span>{o.sub}</span></button>)}
          </div>
        </section>
      )}
      {step === 2 && (
        <section aria-labelledby="onb-q">
          <h1 id="onb-q" ref={head} tabIndex={-1}>어떤 방식이 편해요?</h1>
          <p className="sub">나중에 언제든 바꿀 수 있어요</p>
          <div className="options" role="group" aria-labelledby="onb-q">
            {FORMAT_OPTIONS.map(o => <button key={o.value} type="button" className="option" aria-pressed={draft.format === o.value} onClick={() => setDraft({ ...draft, format: o.value })}><b>{o.label}</b><span>{o.sub}</span></button>)}
          </div>
          <label className="check-row">
            <input type="checkbox" checked={draft.importCS} onChange={() => setDraft({ ...draft, importCS: !draft.importCS })}/>
            <span><b>챌린지스퀘어 이수 내역으로 시작하기 (선택)</b><small>동의하면 지난 비교과를 기록으로 가져와요. 데모에서는 예시 기록 6개를 써요.</small></span>
          </label>
        </section>
      )}
      <div className="onb-actions">
        {step > 0 ? <button type="button" className="ghost" onClick={() => setStep(step - 1)}>이전</button> : editing ? <button type="button" className="ghost" onClick={onCancel}>취소</button> : null}
        <button type="button" className="primary" disabled={step === 0 && draft.interests.length === 0} onClick={() => (step < 2 ? setStep(step + 1) : finish())}>{step < 2 ? '다음' : editing ? '저장하고 다시 고르기' : '이번 주 추천 받기'}</button>
      </div>
      {step === 0 && !editing && <button type="button" className="text-btn center" onClick={onExample}>예시 학생으로 바로 보기</button>}
    </main>
  );
}

function ReflectSheet({ program, completion, onSave, onNext, onSee, onClose }: { program: Program; completion: Completion | null; onSave: (did: Did, energy: Energy, quote: string) => void; onNext: () => void; onSee: () => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [did, setDid] = useState<Did | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [quote, setQuote] = useState('');
  const q = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (step > 0 || completion) q.current?.focus(); }, [step, completion]);
  const ordered = [...program.did, ...DID_LIST.map(d => d.id).filter(d => !program.did.includes(d))];
  const save = (text: string) => { if (did && energy) onSave(did, energy, text.trim()); };
  return (
    <Sheet title={completion ? '기록 완료' : '30초 기록'} onClose={onClose}>
      {!completion && (
        <>
          <div className="progress" aria-hidden="true"><span style={{ width: `${((step + 1) / 3) * 100}%` }}/></div>
          <p className="step-count">{program.title} · {step + 1} / 3</p>
          {step === 0 && (
            <div className="q" role="group" aria-labelledby="rq0">
              <h3 id="rq0" className="q-title" ref={q} tabIndex={-1}>가장 많이 한 일은 뭐였나요?</h3>
              <div className="chips">{ordered.map(id => <button key={id} type="button" className="chip" aria-pressed={did === id} onClick={() => { setDid(id); setStep(1); }}>{DID_LABEL[id]}</button>)}</div>
            </div>
          )}
          {step === 1 && (
            <div className="q" role="group" aria-labelledby="rq1">
              <h3 id="rq1" className="q-title" ref={q} tabIndex={-1}>끝나고 에너지는 어땠어요?</h3>
              <div className="options">{ENERGY.map(e => <button key={e.id} type="button" className="option" aria-pressed={energy === e.id} onClick={() => { setEnergy(e.id); setStep(2); }}><b>{e.label}</b><span>{e.sub}</span></button>)}</div>
            </div>
          )}
          {step === 2 && did && (
            <div className="q">
              <h3 className="q-title" ref={q} tabIndex={-1}>기억에 남는 한마디가 있다면 (선택)</h3>
              <div className="chips small" role="group" aria-label="예시 문장">{QUOTE_HINTS[did].map(h => <button key={h} type="button" className="chip" aria-pressed={quote === h} onClick={() => setQuote(quote === h ? '' : h)}>{h}</button>)}</div>
              <label className="sr-only" htmlFor="reflect-quote">한마디 직접 쓰기</label>
              <textarea id="reflect-quote" rows={2} value={quote} onChange={e => setQuote(e.target.value)} placeholder="직접 적어도 돼요"/>
              <button type="button" className="primary" onClick={() => save(quote)}>저장하기</button>
              <button type="button" className="text-btn center" onClick={() => save('')}>건너뛰고 저장</button>
            </div>
          )}
          {step > 0 && <button type="button" className="text-btn" onClick={() => setStep(step - 1)}><Icon name="back" size={16}/>이전 질문</button>}
        </>
      )}
      {completion && (
        <div className="complete">
          <Stepper current={4}/>
          <h3 className="q-title" ref={q} tabIndex={-1}>제가 이렇게 정리해 뒀어요</h3>
          <ul className="done-list">
            <li><span className="dl-k">기록</span><span>{completion.sentence}</span></li>
            <li><span className="dl-k">발견</span><span>{completion.discoveryLine}</span></li>
            {completion.careerLine && <li><span className="dl-k">진로</span><span>{completion.careerLine}</span></li>}
            <li><span className="dl-k">다음</span><span>다음 주 추천에 이 기록을 반영했어요.</span></li>
          </ul>
          <button type="button" className="primary" onClick={onNext}>다음 주 추천 보기</button>
          <button type="button" className="ghost wide" onClick={onSee}>발견 확인하러 가기</button>
        </div>
      )}
    </Sheet>
  );
}

function RecordSheet({ record, program, linked, onClose, onSave, onDelete }: { record: RecordItem; program?: Program; linked: Discovery[]; onClose: () => void; onSave: (r: RecordItem) => void; onDelete: (id: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [did, setDid] = useState<Did>(record.did);
  const [energy, setEnergy] = useState<Energy>(record.energy);
  const [quote, setQuote] = useState(record.quote);
  const [askDelete, setAskDelete] = useState(false);
  return (
    <Sheet title={record.title} onClose={onClose}>
      <p className="sheet-lead">{record.kind} · {record.date}{record.source === 'agent' ? ' · 추천으로 참여' : ''}</p>
      {!edit && (
        <>
          <dl className="kv">
            {program && <div><dt>활동 소개</dt><dd>{program.summary} {program.host}</dd></div>}
            <div><dt>가장 많이 한 일</dt><dd>{DID_LABEL[record.did]}</dd></div>
            <div><dt>끝난 뒤 에너지</dt><dd>{ENERGY.find(e => e.id === record.energy)?.label}</dd></div>
            {record.quote && <div><dt>남긴 말</dt><dd>“{record.quote}”</dd></div>}
            {record.note && <div><dt>한 일</dt><dd>{record.note}</dd></div>}
            <div><dt>자동 정리 문장</dt><dd>{sentenceOf(record, program)}</dd></div>
          </dl>
          {linked.length > 0 && <p className="fine">발견 ‘{linked.map(l => l.statement).join('’, ‘')}’의 근거예요. 고치거나 지우면 발견을 다시 계산해요.</p>}
          {askDelete ? (
            <div className="confirm-box" role="alert">
              <p>지우면 이 기록에서 나온 발견 근거와 진로 연결도 함께 빠져요.</p>
              <div className="row"><button type="button" className="ghost" onClick={() => setAskDelete(false)}>취소</button><button type="button" className="danger" onClick={() => onDelete(record.id)}>지우기</button></div>
            </div>
          ) : (
            <div className="row"><button type="button" className="ghost" onClick={() => setEdit(true)}>고치기</button><button type="button" className="ghost" onClick={() => setAskDelete(true)}>지우기</button></div>
          )}
        </>
      )}
      {edit && (
        <div className="edit">
          <h3 className="mini-h" id="edit-did">가장 많이 한 일</h3>
          <div className="chips" role="group" aria-labelledby="edit-did">{DID_LIST.map(d => <button key={d.id} type="button" className="chip" aria-pressed={did === d.id} onClick={() => setDid(d.id)}>{d.label}</button>)}</div>
          <h3 className="mini-h" id="edit-energy">끝난 뒤 에너지</h3>
          <div className="chips" role="group" aria-labelledby="edit-energy">{ENERGY.map(e => <button key={e.id} type="button" className="chip" aria-pressed={energy === e.id} onClick={() => setEnergy(e.id)}>{e.label}</button>)}</div>
          <label className="mini-h" htmlFor="edit-quote">남긴 말</label>
          <textarea id="edit-quote" rows={2} value={quote} onChange={e => setQuote(e.target.value)}/>
          <div className="row"><button type="button" className="ghost" onClick={() => setEdit(false)}>취소</button><button type="button" className="primary slim" onClick={() => onSave({ ...record, did, energy, quote: quote.trim() })}>저장</button></div>
        </div>
      )}
    </Sheet>
  );
}

function AddSheet({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, did: Did, energy: Energy, quote: string) => void }) {
  const [title, setTitle] = useState('');
  const [did, setDid] = useState<Did | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [quote, setQuote] = useState('');
  const ready = title.trim().length > 0 && did && energy;
  return (
    <Sheet title="직접 기록 추가" onClose={onClose}>
      <p className="sheet-lead">추천 밖에서 한 활동도 같은 방식으로 남겨요.</p>
      <label className="mini-h" htmlFor="add-title">활동 이름</label>
      <input id="add-title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 학과 학술제 발표"/>
      <h3 className="mini-h" id="add-did">가장 많이 한 일</h3>
      <div className="chips" role="group" aria-labelledby="add-did">{DID_LIST.map(d => <button key={d.id} type="button" className="chip" aria-pressed={did === d.id} onClick={() => setDid(d.id)}>{d.label}</button>)}</div>
      <h3 className="mini-h" id="add-energy">끝난 뒤 에너지</h3>
      <div className="chips" role="group" aria-labelledby="add-energy">{ENERGY.map(e => <button key={e.id} type="button" className="chip" aria-pressed={energy === e.id} onClick={() => setEnergy(e.id)}>{e.label}</button>)}</div>
      <label className="mini-h" htmlFor="add-quote">한마디 (선택)</label>
      <textarea id="add-quote" rows={2} value={quote} onChange={e => setQuote(e.target.value)}/>
      <button type="button" className="primary" disabled={!ready} onClick={() => { if (did && energy) onAdd(title.trim(), did, energy, quote.trim()); }}>기록에 추가</button>
    </Sheet>
  );
}

function AxisLens({ records }: { records: RecordItem[] }) {
  const total = Math.max(records.length, 1); const cx = 140; const cy = 118; const R = 78;
  const pt = (i: number, k: number) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]; };
  const counts = AXES.map(a => records.filter(r => r.axes.includes(a.id)).length);
  const ring = (k: number) => AXES.map((_, i) => pt(i, k).join(',')).join(' ');
  return (
    <div className="axis">
      <svg viewBox="0 0 280 240" role="img" aria-label={`6축 기록 분포. ${AXES.map((a, i) => `${a.label} ${counts[i]}개`).join(', ')}. 전체 기록 ${records.length}개.`}>
        {[1, 0.66, 0.33].map(k => <polygon key={k} points={ring(k)} className="grid"/>)}
        {AXES.map((a, i) => { const [x, y] = pt(i, 1); return <line key={a.id} x1={cx} y1={cy} x2={x} y2={y} className="grid"/>; })}
        <polygon points={AXES.map((_, i) => pt(i, counts[i] / total).join(',')).join(' ')} className="area"/>
        {AXES.map((a, i) => { const [x, y] = pt(i, 1.27); return <text key={a.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="axis-label">{a.label} {counts[i]}</text>; })}
      </svg>
      <p className="fine">반경은 그 축에 연결된 기록 수 ÷ 전체 기록 수예요. 능력 점수나 순위가 아니에요.</p>
    </div>
  );
}

function DataSheet({ settings, importCS, onToggle, onToggleImport, onExport, onDeleteAll, onClose }: { settings: Settings; importCS: boolean; onToggle: (k: keyof Settings) => void; onToggleImport: () => void; onExport: () => void; onDeleteAll: () => void; onClose: () => void }) {
  const [ask, setAsk] = useState(false);
  return (
    <Sheet title="데이터·개인정보" onClose={onClose}>
      <ul className="toggles">
        <li><label><input type="checkbox" checked={settings.discover} onChange={() => onToggle('discover')}/><span><b>회고로 발견 만들기</b><small>끄면 회고 내용을 발견과 추천에 쓰지 않고, 기록으로만 보관해요.</small></span></label></li>
        <li><label><input type="checkbox" checked={settings.career} onChange={() => onToggle('career')}/><span><b>채용 공고 요건과 연결</b><small>공고는 모두가 보는 공통 정보, 내 기록과의 연결은 나만 봐요.</small></span></label></li>
        <li><label><input type="checkbox" checked={importCS} onChange={onToggleImport}/><span><b>챌린지스퀘어 이수 내역 가져오기</b><small>학교 동의 절차가 필요해요. 데모에서는 바뀌는 것이 없어요.</small></span></label></li>
      </ul>
      {ask ? (
        <div className="confirm-box" role="alert">
          <p>기록·발견·진로 연결을 모두 지울까요? 바로 되돌릴 수 있어요.</p>
          <div className="row"><button type="button" className="ghost" onClick={() => setAsk(false)}>취소</button><button type="button" className="danger" onClick={onDeleteAll}>모두 지우기</button></div>
        </div>
      ) : (
        <div className="row"><button type="button" className="ghost" onClick={onExport}>내 기록 내보내기</button><button type="button" className="ghost" onClick={() => setAsk(true)}>기록 모두 지우기</button></div>
      )}
      <p className="fine">내 기록·회고·발견은 다른 학생의 추천에 쓰지 않아요. 지우면 발견과 진로 연결에서도 함께 빠져요.</p>
    </Sheet>
  );
}

/* ---------- 앱 ---------- */
export default function App() {
  const [stage, setStage] = useState<'onboarding' | 'app'>('onboarding');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [tab, setTab] = useState<Tab>('week');
  const [week, setWeek] = useState(1);
  const [phase, setPhase] = useState<Phase>('suggest');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [committedId, setCommittedId] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordItem[]>(SEED_RECORDS);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [dislikedFields, setDislikedFields] = useState<Field[]>([]);
  const [preferEasier, setPreferEasier] = useState(false);
  const [confirm, setConfirm] = useState<Record<string, Confirm>>({});
  const [reqEvidence, setReqEvidence] = useState<Record<string, string[]>>(INITIAL_REQ_EVIDENCE);
  const [lastDone, setLastDone] = useState<LastDone | null>(null);
  const [settings, setSettings] = useState<Settings>({ discover: true, career: true });
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string; undo?: Snap } | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [openDirection, setOpenDirection] = useState<string | null>(null);
  const [showAxes, setShowAxes] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.undo ? 8000 : 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* 파생 상태 */
  const discoveries = settings.discover ? discoveriesOf(records) : [];
  const discState = (d: Discovery): DiscState => { const c = confirm[d.key]; if (!c) return 'none'; return c.sig.every(s => d.sig.includes(s)) ? c.status : 'changed'; };
  const confirmedDids = discoveries.filter(d => discState(d) === 'yes').map(d => d.did);
  const rejectedDids = discoveries.filter(d => discState(d) === 'no').map(d => d.did);
  const mode: Mode = confirmedDids.length ? 'focus' : 'explore';
  const ranking = rank({ week, profile, records, doneIds, excluded, dislikedFields, preferEasier, mode, focusDids: confirmedDids, rejectedDids, careerOn: settings.career, reflectOn: settings.discover, last: lastDone });
  const primary = (pickedId ? ranking.scored.find(s => s.p.id === pickedId) : undefined) ?? ranking.scored[0];
  const alts = primary ? pickAlternatives(ranking.scored, primary.p) : [];
  const committed = committedId ? PROGRAM_BY_ID[committedId] : undefined;
  const committedScored: Scored | undefined = committed ? ranking.scored.find(s => s.p.id === committed.id) ?? { p: committed, score: 0, reasons: [] } : undefined;
  const tried = new Set(records.map(r => r.field));
  const focusTarget = phase === 'suggest' ? primary : committedScored;
  const ended = ranking.funnel.pool === 0;

  /* 되돌리기 */
  const snap = (): Snap => ({ week, phase, pickedId, committedId, records, doneIds, excluded, dislikedFields, preferEasier, confirm, reqEvidence, lastDone, settings, profile });
  const restore = (s: Snap) => {
    setWeek(s.week); setPhase(s.phase); setPickedId(s.pickedId); setCommittedId(s.committedId); setRecords(s.records); setDoneIds(s.doneIds); setExcluded(s.excluded);
    setDislikedFields(s.dislikedFields); setPreferEasier(s.preferEasier); setConfirm(s.confirm); setReqEvidence(s.reqEvidence); setLastDone(s.lastDone); setSettings(s.settings); setProfile(s.profile);
  };
  const notify = (msg: string, undo?: Snap) => setToast({ id: Date.now(), msg, undo });
  const toTop = () => window.scrollTo({ top: 0 });

  /* 행동 */
  const openSheet = (s: SheetState) => { setToast(null); setSheet(s); };
  const advanceWeek = () => { setToast(null); setWeek(w => w + 1); setPhase('suggest'); setPickedId(null); setCommittedId(null); setCompletion(null); toTop(); };
  const closeSheet = () => { if (sheet?.type === 'reflect' && completion) advanceWeek(); setSheet(null); };
  const commit = () => { if (!primary) return; const s = snap(); setCommittedId(primary.p.id); setPhase('committed'); toTop(); notify('일정에 담았어요. 신청만 하면 나머지는 제가 챙길게요.', s); };
  const cancelCommit = () => { const s = snap(); setCommittedId(null); setPhase('suggest'); notify('취소했어요. 다시 골라 둘게요.', s); };
  const skipWeek = () => { const s = snap(); setPhase('skipped'); notify('이번 주는 쉬어요. 다음 주 월요일에 다시 골라 둘게요.', s); };
  const markMissed = () => { const s = snap(); setPhase('missed'); notify('괜찮아요. 기록은 남기지 않을게요.', s); };
  const swap = (id: string) => { const s = snap(); setPickedId(id); setSheet(null); toTop(); notify('이번 주 추천을 바꿨어요.', s); };
  const dislike = (kind: DislikeKind) => {
    if (!primary) return;
    const s = snap(); const p = primary.p;
    setExcluded(x => (x.includes(p.id) ? x : [...x, p.id]));
    if (kind === 'field') setDislikedFields(x => (x.includes(p.field) ? x : [...x, p.field]));
    if (kind === 'hard') setPreferEasier(true);
    setPickedId(null); setSheet(null); toTop();
    notify(DISLIKES.find(d => d.id === kind)?.toast ?? '반영했어요.', s);
  };
  const openApply = () => notify('예시 활동이라 실제 신청 화면이 없어요. 실서비스에서는 챌린지스퀘어의 이 프로그램 신청 화면으로 바로 이어져요.');
  const saveReflection = (did: Did, energy: Energy, quote: string) => {
    if (!committed) return;
    const p = committed; const id = `r-${p.id}`;
    const rec: RecordItem = { id, v: 1, title: p.title, kind: '비교과', date: p.when.split(' ')[0], field: p.field, did, energy, quote, note: '', axes: DID_AXES[did], source: 'agent', programId: p.id };
    const next = [...records.filter(r => r.id !== id), rec];
    const before = settings.discover ? discoveriesOf(records) : [];
    const after = settings.discover ? discoveriesOf(next) : [];
    const hit = after.find(d => d.evidence.some(e => e.id === id));
    let discoveryLine: string; let discoveryKey: string | undefined;
    if (!settings.discover) discoveryLine = '발견 만들기를 꺼 둬서 기록만 저장했어요.';
    else if (hit) {
      const prev = before.find(d => d.key === hit.key); discoveryKey = hit.key;
      discoveryLine = prev ? `‘${hit.statement}’ 근거가 ${prev.evidence.length}개에서 ${hit.evidence.length}개로 늘었어요.` : `새 발견이 생겼어요. ‘${hit.statement}’`;
    } else discoveryLine = `‘${DID_LABEL[did]}’ 기록이 하나 더 쌓이면 발견으로 알려 드릴게요.`;
    let careerLine: string | undefined;
    if (p.career) {
      const req = REQ_BY_ID[p.career.req]; const job = JOB_BY_ID[req.job];
      setReqEvidence(m => ({ ...m, [req.id]: [...(m[req.id] ?? []).filter(x => x !== id), id] }));
      if (settings.career) careerLine = p.career.part === 'gap' ? `${job.company} ${job.short} 공고 ‘${req.label}’ 요건의 ${p.career.gapLabel} 쪽 근거로 이었어요.` : `${job.company} ${job.short} 공고 ‘${req.label}’ 요건의 근거로 이었어요.`;
    }
    setRecords(next); setDoneIds(d => (d.includes(p.id) ? d : [...d, p.id])); setLastDone({ recordId: id, title: p.title, field: p.field });
    setCompletion({ sentence: sentenceOf(rec, p), discoveryLine, discoveryKey, careerLine, recordId: id });
    setHighlightKey(discoveryKey ?? null);
  };
  const seeDiscovery = () => { advanceWeek(); setSheet(null); setTab('me'); };
  const confirmDisc = (d: Discovery, status: 'yes' | 'no') => {
    const s = snap(); const current = discState(d);
    if (current === status) { setConfirm(c => { const n = { ...c }; delete n[d.key]; return n; }); notify('확인을 취소했어요.', s); return; }
    setConfirm(c => ({ ...c, [d.key]: { status, sig: d.sig } }));
    notify(status === 'yes' ? '맞다고 저장했어요. 이 방향으로 좁혀서 추천할게요.' : '아니라고 저장했어요. 추천에 쓰지 않을게요.', s);
  };
  const saveRecord = (r: RecordItem) => {
    const s = snap();
    setRecords(rs => rs.map(x => (x.id === r.id ? { ...r, v: x.v + 1, axes: x.did === r.did ? x.axes : DID_AXES[r.did] } : x)));
    setSheet(null); notify('기록을 고쳤어요. 이 기록을 쓰는 발견은 다시 확인해 주세요.', s);
  };
  const deleteRecord = (id: string) => {
    const s = snap();
    setRecords(rs => rs.filter(r => r.id !== id));
    setReqEvidence(m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.filter(x => x !== id)])));
    if (lastDone?.recordId === id) setLastDone(null);
    setSheet(null); notify('기록을 지웠어요. 발견과 진로 연결에서도 뺐어요.', s);
  };
  const addRecord = (title: string, did: Did, energy: Energy, quote: string) => {
    const s = snap();
    setRecords(rs => [...rs, { id: `m-${Date.now()}`, v: 1, title, kind: '직접 추가', date: '이번 학기', field: 'etc', did, energy, quote, note: '', axes: DID_AXES[did], source: 'manual' }]);
    setSheet(null); notify('기록에 추가했어요.', s);
  };
  const toggleSetting = (k: keyof Settings) => {
    const s = snap(); const on = !settings[k];
    setSettings(x => ({ ...x, [k]: on }));
    notify(k === 'discover' ? (on ? '발견 만들기를 켰어요.' : '발견 만들기를 껐어요. 추천에도 쓰지 않아요.') : on ? '채용 공고 연결을 켰어요.' : '채용 공고 연결을 껐어요.', s);
  };
  const toggleImport = () => { const s = snap(); setProfile(p => ({ ...p, importCS: !p.importCS })); notify('실서비스에서는 학교 동의 절차 뒤 이수 내역을 가져와요. 데모에서는 바뀌는 것이 없어요.', s); };
  const deleteAll = () => {
    const s = snap();
    setRecords([]); setConfirm({}); setLastDone(null); setReqEvidence(Object.fromEntries(Object.keys(INITIAL_REQ_EVIDENCE).map(k => [k, [] as string[]])));
    setSheet(null); notify('기록을 모두 지웠어요.', s);
  };
  const resetAll = () => {
    setStage('onboarding'); setEditingProfile(false); setProfile(EMPTY_PROFILE); setTab('week'); setWeek(1); setPhase('suggest'); setPickedId(null); setCommittedId(null);
    setRecords(SEED_RECORDS); setDoneIds([]); setExcluded([]); setDislikedFields([]); setPreferEasier(false); setConfirm({}); setReqEvidence(INITIAL_REQ_EVIDENCE);
    setLastDone(null); setSettings({ discover: true, career: true }); setSheet(null); setCompletion(null); setToast(null); setHighlightKey(null); setOpenEvidence(null); setOpenDirection(null); setShowAxes(false); setShowHidden(false);
  };
  const goTab = (t: Tab) => { if (tab === 'me' && t !== 'me') setHighlightKey(null); setTab(t); toTop(); };
  useEffect(() => {
    if (stage === 'app' && !sheet) heading.current?.focus({ preventScroll: true });
  }, [stage, tab, phase, week]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 화면: 온보딩 */
  if (stage === 'onboarding') {
    return (
      <div className="app">
        <Onboarding
          key={editingProfile ? 'edit' : 'new'}
          initial={profile}
          editing={editingProfile}
          onDone={p => { setProfile(p); setStage('app'); setPickedId(null); if (editingProfile) notify('관심과 시간을 바꿔 이번 주 추천을 다시 골랐어요.'); setEditingProfile(false); setTab('week'); }}
          onExample={() => { setProfile(EXAMPLE_PROFILE); setStage('app'); }}
          onCancel={() => { setEditingProfile(false); setStage('app'); }}/>
      </div>
    );
  }

  /* 화면: 이번 주 */
  const headline = ended ? '이번 학기 예시는 여기까지예요' : phase === 'committed' ? '이번 주 할 일이 정해졌어요' : phase === 'checkin' ? '어제 활동, 30초만 남겨요' : phase === 'skipped' ? '이번 주는 쉬어 가요' : phase === 'missed' ? '괜찮아요, 다음 기회가 있어요' : primary ? '이번 주는 이것 하나면 돼요' : '지금 조건에 맞는 활동이 없어요';
  const stepIndex = phase === 'committed' ? 1 : phase === 'checkin' ? 2 : 0;
  const showStepper = !ended && (phase === 'committed' || phase === 'checkin' || (phase === 'suggest' && !!primary));
  const renderWeek = () => (
    <>
      <header className="screen-head">
        <p className="eyebrow">{phase === 'checkin' && committed ? `${committed.when.split(' ')[0]} 활동 다음 날 · 기록할 시간` : `${WEEK_LABEL[week - 1] ?? `${week}주차`} · 이번 주 브리핑`}</p>
        <h1 ref={heading} tabIndex={-1}>{headline}</h1>
        {phase === 'suggest' && primary && (
          <p className="agent-line">모집 중 {ranking.funnel.pool}개를 확인해, 조건이 맞는 {ranking.funnel.fresh}개 중에서 골랐어요. <button type="button" className="inline-link" onClick={() => openSheet({ type: 'how' })}>어떻게 골랐나요</button></p>
        )}
      </header>
      {showStepper && <Stepper current={stepIndex}/>}
      {phase === 'suggest' && lastDone && week > 1 && <p className="done-line"><Icon name="check" size={16}/>지난주 ‘{lastDone.title}’ 기록 완료</p>}
      {ended && (
        <article className="card">
          <p className="summary">예시 활동을 모두 둘러봤어요. 쌓인 기록과 발견은 ‘기록’과 ‘나’에서 볼 수 있어요.</p>
          <button type="button" className="primary" onClick={() => goTab('me')}>지금까지의 발견 보기</button>
          <div className="row"><button type="button" className="ghost" onClick={() => openSheet({ type: 'reset' })}>처음부터 다시 보기</button></div>
        </article>
      )}
      {!ended && phase === 'suggest' && primary && (
        <article className="card rec" aria-labelledby="rec-title">
          <div className="tags">
            <span className="tag">이번 주 추천</span>
            <span className="tag neutral">{mode === 'explore' ? '넓게 탐색 중' : '좁혀 가는 중'}</span>
            {lastDone && primary.reasons.some(r => r.kind === 'bridge') && <span className="tag neutral">지난주 기록 반영</span>}
          </div>
          <h2 id="rec-title">{primary.p.title}</h2>
          <p className="summary">{primary.p.summary}</p>
          {mainReason(primary.reasons) && (
            <div className="reason">
              <p>{mainReason(primary.reasons)?.text}</p>
              <button type="button" className="link-btn" onClick={() => openSheet({ type: 'why' })}>왜 이 활동인가요<Icon name="chevron" size={16}/></button>
            </div>
          )}
          <Facts p={primary.p} week={week}/>
          <p className={`status ${primary.p.seatsKnown ? 'ok' : 'warn'}`}><Icon name={primary.p.seatsKnown ? 'check' : 'info'} size={16}/>{primary.p.seatsKnown ? '신청 대상·일정·정원 확인 완료' : '신청 대상·일정 확인 완료 · 정원은 신청할 때 확인'}</p>
          <button type="button" className="primary" onClick={commit}>이걸로 할게요</button>
          <div className="row">
            <button type="button" className="ghost" onClick={() => openSheet({ type: 'alts' })} disabled={!alts.length}>다른 선택지 {alts.length}개</button>
            <button type="button" className="ghost" onClick={skipWeek}>이번 주는 쉴래요</button>
          </div>
        </article>
      )}
      {!ended && phase === 'suggest' && !primary && (
        <article className="card">
          <p className="summary">시간이나 방식 조건을 조금 넓히면 찾을 수 있어요.</p>
          <button type="button" className="primary" onClick={() => { const s = snap(); setProfile(p => ({ ...p, time: 8, format: 'any' })); notify('시간·방식 조건을 넓혀 다시 골랐어요.', s); }}>조건 넓혀서 다시 고르기</button>
          <div className="row"><button type="button" className="ghost" onClick={skipWeek}>이번 주는 쉬기</button></div>
        </article>
      )}
      {!ended && phase === 'committed' && committed && (
        <>
          <article className="card">
            <div className="tags"><span className="tag">예정</span></div>
            <h2>{committed.title}</h2>
            <Facts p={committed} week={week} place/>
            <div className="todo">
              <p><b>남은 일 하나</b> 챌린지스퀘어에서 신청하기</p>
              <button type="button" className="primary" onClick={openApply}>신청 화면 열기<Icon name="external" size={18}/></button>
            </div>
            <p className="status ok"><Icon name="bell" size={16}/>수강확정 여부와 전날 저녁 알림은 제가 챙길게요.</p>
            <div className="row"><button type="button" className="ghost" onClick={() => openSheet({ type: 'why' })}>왜 이 활동이었죠</button><button type="button" className="ghost" onClick={cancelCommit}>취소하기</button></div>
          </article>
          <div className="demo-strip"><span className="demo-tag">데모</span><span>시간을 건너뛰어 활동 다음 날을 봐요.</span><button type="button" onClick={() => { setToast(null); setPhase('checkin'); toTop(); }}>활동 다음 날로 이동</button></div>
        </>
      )}
      {!ended && phase === 'checkin' && committed && (
        <article className="card accent">
          <div className="tags"><span className="tag warm">기록할 활동</span></div>
          <h2>{committed.title}, 어땠어요?</h2>
          <p className="summary">탭 세 번이면 기록과 발견, 다음 추천까지 정리돼요.</p>
          <button type="button" className="primary" onClick={() => { setCompletion(null); openSheet({ type: 'reflect' }); }}>30초 기록하기</button>
          <div className="row"><button type="button" className="ghost" onClick={markMissed}>못 갔어요</button></div>
        </article>
      )}
      {!ended && phase === 'skipped' && (
        <article className="card">
          <p className="summary">쉬어도 괜찮아요. 다음 주 월요일 아침에 다시 하나 골라 둘게요.</p>
          <div className="demo-strip inline"><span className="demo-tag">데모</span><button type="button" onClick={advanceWeek}>다음 주로 넘어가기</button></div>
          <div className="row"><button type="button" className="ghost" onClick={() => setPhase('suggest')}>그래도 이번 주 추천 볼래요</button></div>
        </article>
      )}
      {!ended && phase === 'missed' && (
        <article className="card">
          <p className="summary">비슷한 기회가 오면 먼저 알려 드릴게요. 다녀오지 않은 활동은 기록에 남기지 않아요.</p>
          <button type="button" className="primary" onClick={advanceWeek}>다음 주 추천 보기</button>
        </article>
      )}
    </>
  );

  /* 화면: 기록 */
  const upCount = records.filter(r => r.energy === 'up').length;
  const renderRecords = () => (
    <>
      <header className="screen-head">
        <p className="eyebrow">이번 학기</p>
        <div className="head-row"><h1 ref={heading} tabIndex={-1}>내 기록</h1><button type="button" className="ghost small" onClick={() => openSheet({ type: 'add' })}><Icon name="plus" size={16}/>직접 추가</button></div>
        <p className="sub">기록 {records.length}개 · 에너지가 생긴 활동 {upCount}개. 추천으로 다녀온 활동은 자동으로 쌓여요.</p>
      </header>
      {records.length === 0 && <p className="empty">아직 기록이 없어요. 이번 주 추천을 다녀오면 자동으로 쌓여요.</p>}
      <ul className="rec-list">
        {[...records].reverse().map(r => (
          <li key={r.id}>
            <button type="button" className="rec-item" onClick={() => openSheet({ type: 'record', id: r.id })}>
              <span className="rec-meta">{r.kind} · {r.date}{r.source === 'agent' && <span className="tag tiny">추천으로 참여</span>}</span>
              <span className="rec-title">{r.title}</span>
              <span className="rec-tags"><span className="tag neutral">{DID_LABEL[r.did]}</span><span className={`tag energy-${r.energy}`}>에너지 {ENERGY_SHORT[r.energy]}</span></span>
              {r.quote && <span className="rec-quote">“{r.quote}”</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  );

  /* 화면: 나 */
  const visibleDisc = discoveries.filter(d => discState(d) !== 'no');
  const hiddenDisc = discoveries.filter(d => discState(d) === 'no');
  const dirs = directionsOf(profile);
  const discoveryCard = (d: Discovery) => {
    const st = discState(d); const open = openEvidence === d.key;
    return (
      <article key={d.key} className={`card disc${highlightKey === d.key ? ' flash' : ''}${st === 'no' ? ' muted' : ''}`}>
        <div className="tags"><span className="tag">{d.kind === 'up' ? '에너지 발견' : '역할 발견'}</span><span className="tag neutral">근거 {d.evidence.length}개</span>{highlightKey === d.key && <span className="tag warm">방금 업데이트</span>}</div>
        <h3 className="disc-text">{d.statement}</h3>
        <p className={`disc-state ${st}`}>{STATE_TEXT[st]}</p>
        <div className="row three">
          <button type="button" className="ghost" aria-pressed={st === 'yes'} onClick={() => confirmDisc(d, 'yes')}>맞아요</button>
          <button type="button" className="ghost" aria-pressed={st === 'no'} onClick={() => confirmDisc(d, 'no')}>아니에요</button>
          <button type="button" className="ghost" aria-expanded={open} onClick={() => setOpenEvidence(open ? null : d.key)}>근거 보기</button>
        </div>
        {open && (
          <ul className="evidence">
            {d.evidence.map(r => <li key={r.id}><button type="button" className="inline-link" onClick={() => openSheet({ type: 'record', id: r.id })}>{r.title}</button><span> · {DID_LABEL[r.did]} · 에너지 {ENERGY_SHORT[r.energy]}</span></li>)}
          </ul>
        )}
      </article>
    );
  };
  const directionCard = (d: Direction) => {
    const rows = d.reqIds.map(id => { const req = REQ_BY_ID[id]; const count = (reqEvidence[id] ?? []).filter(rid => records.some(r => r.id === rid)).length; return { req, count, job: JOB_BY_ID[req.job] }; });
    const hit = rows.filter(r => r.count > 0).length; const gap = rows.find(r => r.count === 0); const open = openDirection === d.id;
    return (
      <article key={d.id} className="card dir">
        <div className="tags"><span className="tag neutral">처음에 고른 관심</span></div>
        <h3 className="dir-title">{d.label}</h3>
        <p className="summary">공고 요건 {rows.length}개 중 내 기록이 닿은 것 {hit}개{gap ? ` · 다음에 채울 것: ${gap.req.label}` : ''}</p>
        <button type="button" className="ghost wide" aria-expanded={open} onClick={() => setOpenDirection(open ? null : d.id)}>공고 근거 {open ? '접기' : '보기'}</button>
        {open && (
          <ul className="req-list">
            {rows.map(r => (
              <li key={r.req.id}>
                <p><span className={`tag ${r.count ? '' : 'neutral'}`}>{r.req.kind}</span> <b>{r.req.label}</b></p>
                <p className="req-count">{r.count ? `내 기록 ${r.count}개` : '아직 기록 없음'}</p>
                <a href={r.job.url} target="_blank" rel="noreferrer">{r.job.company} {r.job.title} · {r.job.checkedAt} 확인 · {r.job.state}<Icon name="external" size={14}/></a>
              </li>
            ))}
            <li className="fine">학교 활동을 실무 경력으로 보지 않아요. 경력·자격 요건은 원문에서 따로 확인해야 해요.</li>
          </ul>
        )}
      </article>
    );
  };
  const renderMe = () => (
    <>
      <header className="screen-head">
        <p className="eyebrow">나에 대해</p>
        <h1 ref={heading} tabIndex={-1}>지금까지 알게 된 것</h1>
        <p className="sub">기록 {records.length}개에서 찾은 가설이에요. 맞는지 알려 주면 다음 추천이 달라져요.</p>
      </header>
      <p className="mode-line"><b>{mode === 'explore' ? '넓게 탐색 중' : '좁혀 가는 중'}</b> · {mode === 'explore' ? '맞다고 한 발견이 생기면 그 방향으로 좁혀서 추천해요.' : '맞다고 한 발견에 맞춰 추천을 좁히고 있어요.'}</p>
      {!settings.discover ? <p className="empty">발견 만들기를 꺼 두었어요. 데이터·개인정보에서 다시 켤 수 있어요.</p> : visibleDisc.length === 0 && hiddenDisc.length === 0 ? <p className="empty">같은 종류의 기록이 2개 이상 쌓이면 첫 발견을 알려 드릴게요.</p> : visibleDisc.map(discoveryCard)}
      {hiddenDisc.length > 0 && <button type="button" className="text-btn" aria-expanded={showHidden} onClick={() => setShowHidden(!showHidden)}>아니라고 한 발견 {hiddenDisc.length}개 {showHidden ? '접기' : '보기'}</button>}
      {showHidden && hiddenDisc.map(discoveryCard)}
      {settings.career && (
        <section className="section" aria-labelledby="dir-h">
          <h2 className="sec-h" id="dir-h">가까워지는 방향</h2>
          {dirs.length ? dirs.map(directionCard) : <p className="empty">관심 분야를 고르면 실제 채용 공고 요건과 내 기록을 이어서 보여 드려요.</p>}
        </section>
      )}
      <section className="section" aria-labelledby="more-h">
        <h2 className="sec-h" id="more-h">더 보기</h2>
        <ul className="menu-list">
          <li><button type="button" aria-expanded={showAxes} onClick={() => setShowAxes(!showAxes)}><span>6축으로 기록 분포 보기</span><Icon name="down" size={18}/></button>{showAxes && <AxisLens records={records}/>}</li>
          <li><button type="button" onClick={() => { setEditingProfile(true); setStage('onboarding'); }}><span>관심·시간 다시 고르기<small>{profile.interests.map(i => (i === 'unknown' ? '아직 모르겠어요' : FIELD_LABEL[i])).join(', ') || '선택 없음'} · {timeLabel(profile.time)}</small></span><Icon name="chevron" size={18}/></button></li>
          <li><button type="button" onClick={() => openSheet({ type: 'data' })}><span>데이터·개인정보</span><Icon name="chevron" size={18}/></button></li>
          <li><button type="button" onClick={() => openSheet({ type: 'memo' })}><span>설계 메모<small>팀 리뷰용 · 적용한 HCI 원리</small></span><Icon name="chevron" size={18}/></button></li>
          <li><button type="button" onClick={() => openSheet({ type: 'info' })}><span>프로토타입 정보</span><Icon name="chevron" size={18}/></button></li>
          <li><button type="button" onClick={() => openSheet({ type: 'reset' })}><span>처음부터 다시 보기</span><Icon name="chevron" size={18}/></button></li>
        </ul>
      </section>
    </>
  );

  /* 시트 */
  const renderSheet = () => {
    if (!sheet) return null;
    if (sheet.type === 'why' && focusTarget) {
      const p = focusTarget.p; const d = ddayOf(p, week);
      const checks = [
        { label: '대상', text: `${p.target} · 신청할 수 있어요`, ok: p.eligible },
        { label: '시간', text: `${p.when} · ${p.durationLabel} · 고른 시간(${timeLabel(profile.time)}) 안`, ok: true },
        { label: '마감', text: ddayText(d), ok: true },
        { label: '정원', text: p.seatsKnown ? '여유 있음 (확인 시점 기준)' : '목록에 표시되지 않아 신청 화면에서 확인해야 해요', ok: p.seatsKnown },
        ...(p.otherDates?.length ? [{ label: '중복', text: `같은 프로그램의 다른 날짜 ${p.otherDates.length}개(${p.otherDates.join(', ')})는 하나로 묶었어요`, ok: true }] : [])
      ];
      return (
        <Sheet title="왜 이 활동인가요?" onClose={closeSheet}>
          <p className="sheet-lead">{p.title}</p>
          <h3 className="mini-h">내 기록과 방향</h3>
          {focusTarget.reasons.length ? (
            <ul className="reasons">
              {sortedReasons(focusTarget.reasons).map((r, i) => (
                <li key={i}>
                  <span className={`r-kind ${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                  <p>{r.text}</p>
                  {r.source && (r.url ? <a className="r-src" href={r.url} target="_blank" rel="noreferrer">{r.source}<Icon name="external" size={14}/></a> : r.recordId ? <button type="button" className="inline-link r-src" onClick={() => openSheet({ type: 'record', id: r.recordId ?? '' })}>{r.source}</button> : <p className="r-src">{r.source}</p>)}
                </li>
              ))}
            </ul>
          ) : <p className="fine">이 활동과 바로 이어지는 기록은 아직 없어요.</p>}
          <h3 className="mini-h">미리 확인한 것</h3>
          <ul className="checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : 'warn'}><Icon name={c.ok ? 'check' : 'info'} size={16}/><span><b>{c.label}</b> {c.text}</span></li>)}</ul>
          <p className="fine">추천은 기록에 근거한 가설이에요. 이 데모는 실제 AI가 아닌 화면 안의 규칙으로 골라요.</p>
          {phase === 'suggest' && <button type="button" className="ghost wide" onClick={() => openSheet({ type: 'dislike' })}>이런 추천은 줄여 주세요</button>}
        </Sheet>
      );
    }
    if (sheet.type === 'alts' && primary) {
      return (
        <Sheet title="다른 선택지" onClose={closeSheet}>
          <p className="sheet-lead">이번 주 추천과 다른 점만 적었어요.</p>
          {alts.map(a => (
            <article key={a.p.id} className="alt">
              <span className="tag">{diffLabel(a.p, primary.p, tried, profile.interests)}</span>
              <h3>{a.p.title}</h3>
              <p className="summary">{a.p.summary}</p>
              <p className="alt-meta">{a.p.when} · {a.p.durationLabel} · {ddayText(ddayOf(a.p, week))}</p>
              <button type="button" className="ghost wide" onClick={() => swap(a.p.id)}>이걸로 바꾸기</button>
            </article>
          ))}
          <div className="sheet-foot">
            <a className="inline-link" href={CS_URL} target="_blank" rel="noreferrer">챌린지스퀘어에서 전체 목록 보기<Icon name="external" size={14}/></a>
            <button type="button" className="inline-link" onClick={() => openSheet({ type: 'dislike' })}>이 추천이 별로예요</button>
          </div>
        </Sheet>
      );
    }
    if (sheet.type === 'how') {
      const f = ranking.funnel;
      return (
        <Sheet title="이번 주 추천을 고른 방법" onClose={closeSheet}>
          <ol className="funnel">
            <li><b>{f.pool}</b><span>이번 주 모집 중인 활동 (예시)</span></li>
            <li><b>{f.open}</b><span>마감이 지난 활동 빼기</span></li>
            <li><b>{f.eligible}</b><span>신청 대상이 아닌 활동 빼기</span></li>
            <li><b>{f.fit}</b><span>고른 시간·방식에 안 맞는 활동 빼기</span></li>
            <li><b>{f.fresh}</b><span>이미 했거나 별로라고 한 활동 빼기</span></li>
            <li className="final"><b>1</b><span>관심·에너지·진로 근거로 하나 고르고, 다른 선택지 2개는 접어 두기</span></li>
          </ol>
          <p className="fine">실서비스에서는 챌린지스퀘어·학과 공지·비교과 가이드를 매일 확인하고, 날짜만 다른 같은 프로그램은 하나로 합쳐요.</p>
          <p className="fine">참고: 2026.10.08 SKKU 비교과 가이드에 표시된 학부생 참여 가능 프로그램은 61개예요. 챌린지스퀘어 목록은 로그인해야 보여요.</p>
        </Sheet>
      );
    }
    if (sheet.type === 'dislike' && primary) {
      return (
        <Sheet title="어떤 점이 별로였나요?" onClose={closeSheet}>
          <p className="sheet-lead">{primary.p.title}</p>
          <div className="options">{DISLIKES.map(o => <button key={o.id} type="button" className="option" onClick={() => dislike(o.id)}><b>{o.label}</b><span>{o.effect}</span></button>)}</div>
        </Sheet>
      );
    }
    if (sheet.type === 'reflect' && committed) {
      return <ReflectSheet program={committed} completion={completion} onSave={saveReflection} onNext={closeSheet} onSee={seeDiscovery} onClose={closeSheet}/>;
    }
    if (sheet.type === 'record') {
      const r = records.find(x => x.id === sheet.id);
      if (!r) return null;
      return <RecordSheet key={`${r.id}@${r.v}`} record={r} program={r.programId ? PROGRAM_BY_ID[r.programId] : undefined} linked={discoveries.filter(d => d.evidence.some(e => e.id === r.id))} onClose={closeSheet} onSave={saveRecord} onDelete={deleteRecord}/>;
    }
    if (sheet.type === 'add') return <AddSheet onClose={closeSheet} onAdd={addRecord}/>;
    if (sheet.type === 'data') return <DataSheet settings={settings} importCS={profile.importCS} onToggle={toggleSetting} onToggleImport={toggleImport} onExport={() => notify('데모에서는 내보내기 파일을 만들지 않아요. 실서비스에서는 기록 전체를 파일로 받아요.')} onDeleteAll={deleteAll} onClose={closeSheet}/>;
    if (sheet.type === 'info') {
      return (
        <Sheet title="프로토타입 정보" onClose={closeSheet}>
          <ul className="plain">
            <li>v0.7 · 에이전트 큐레이션 UX예요. v0.6(경험·채용 연결)은 별도 파일로 남겨 뒀어요.</li>
            <li>활동 15개와 기록 6개는 예시예요. 실제 신청 링크가 없어요. 예시 학생은 2학년이에요.</li>
            <li>추천과 발견은 화면 안의 규칙으로 움직여요. 실제 AI·학교 API·챌린지스퀘어와 연결하지 않았어요.</li>
            <li>채용 공고 요건은 2026.10.08 직접 확인한 카카오뱅크 공개 공고 3건이에요. 직무 참고용이에요.</li>
            <li>새로고침하면 처음 상태로 돌아가요. 저장소나 외부 전송은 쓰지 않아요.</li>
          </ul>
        </Sheet>
      );
    }
    if (sheet.type === 'memo') {
      const memo = [
        ['한 번에 하나', 'Hick–Hyman 법칙, 선택 과부하(Iyengar & Lepper 2000)', '추천 1개를 먼저 보여 주고, 다른 선택지는 2개까지만 접어 둬요.'],
        ['작업 기억 덜 쓰기', '인지부하 이론(Sweller 1988), 작업 기억 4±1(Cowan 2001)', '카드 하나에 이유 1줄과 사실 3개만 둬요. 안내 문구는 시트 안으로 옮겼어요.'],
        ['기억보다 알아보기', 'Nielsen 휴리스틱 6', '회고는 빈칸 대신 고르는 칩 3번이에요.'],
        ['상태와 마무리', 'Norman의 평가 간극, Shneiderman 황금률(종결·되돌리기)', '4단계 흐름을 보여 주고, 기록 뒤 바뀐 것을 3줄로 알려요. 대부분의 행동은 되돌릴 수 있어요.'],
        ['에이전트 투명성', 'Human-AI 상호작용 가이드라인(Amershi et al. 2019), 혼합 주도(Horvitz 1999)', '‘왜 이 활동인가요’, ‘고른 방법’, ‘별로예요’로 이유를 보이고 바로 고칠 수 있게 했어요.'],
        ['자율성', '자기결정성 이론(Ryan & Deci 2000), 기본값 효과', '추천은 기본값일 뿐, 바꾸기·쉬기가 언제나 한 번에 돼요.'],
        ['조용한 알림', 'Calm Technology(Weiser & Brown 1996), Fogg 행동 모델', '월요일 브리핑과 활동 다음 날 회고, 주 2번만 알려요.']
      ];
      return (
        <Sheet title="설계 메모 · 적용한 HCI 원리" onClose={closeSheet}>
          <ul className="memo">{memo.map(([t, theory, applied]) => <li key={t}><b>{t}</b><span className="memo-theory">{theory}</span><span>{applied}</span></li>)}</ul>
        </Sheet>
      );
    }
    if (sheet.type === 'reset') {
      return (
        <Sheet title="처음부터 다시 볼까요?" onClose={closeSheet}>
          <p className="sheet-lead">관심 고르기부터 다시 시작해요. 이 데모의 기록과 선택은 모두 처음으로 돌아가요.</p>
          <div className="row"><button type="button" className="ghost" onClick={closeSheet}>취소</button><button type="button" className="danger" onClick={resetAll}>처음부터 다시 보기</button></div>
        </Sheet>
      );
    }
    return null;
  };

  const tabs: { id: Tab; label: string; icon: IconName }[] = [{ id: 'week', label: '이번 주', icon: 'week' }, { id: 'records', label: '기록', icon: 'records' }, { id: 'me', label: '나', icon: 'me' }];
  return (
    <div className="app">
      <header className="topbar">
        <span className="brand"><span className="brand-mark"><Icon name="leaf" size={18}/></span>킹고 컴패니언</span>
        <button type="button" className="pill" onClick={() => openSheet({ type: 'info' })}>데모 · 예시 데이터</button>
      </header>
      <main className="screen" id="main">
        {tab === 'week' && renderWeek()}
        {tab === 'records' && renderRecords()}
        {tab === 'me' && renderMe()}
      </main>
      <nav className="tabbar" aria-label="주요 화면">
        {tabs.map(t => (
          <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} onClick={() => goTab(t.id)}>
            <Icon name={t.icon} size={22}/><span>{t.label}</span>
            {t.id === 'week' && phase === 'checkin' && <span className="badge"><span className="sr-only">기록할 활동 있음</span></span>}
          </button>
        ))}
      </nav>
      <div className="toast-wrap" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <span>{toast.msg}</span>
            {toast.undo && <button type="button" onClick={() => { if (toast.undo) restore(toast.undo); setToast(null); }}>되돌리기</button>}
            <button type="button" className="toast-x" aria-label="알림 닫기" onClick={() => setToast(null)}><Icon name="x" size={16}/></button>
          </div>
        )}
      </div>
      {renderSheet()}
    </div>
  );
}
