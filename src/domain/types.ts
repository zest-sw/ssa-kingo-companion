// 공용 타입. 화면·데이터·도메인이 함께 쓴다. 바꿔야 하면 기반 담당에게 보고한다.

export type Did = 'listen' | 'ask' | 'organize' | 'make' | 'idea' | 'present';
export type Energy = 'up' | 'same' | 'down';
/** 기회·기록의 세부 분야. 색은 FieldGroup 으로 묶어 정한다. */
export type Field = 'research' | 'product' | 'data' | 'ai' | 'dev' | 'career' | 'startup' | 'mentor' | 'global' | 'club' | 'etc';
/** 화면 색 의미가 고정된 분야 묶음 (명세 2절). */
export type FieldGroup = 'dev' | 'ai' | 'plan' | 'mentor' | 'global' | 'other';
export type Interest = Field | 'unknown';
export type Axis = 'expertise' | 'problem' | 'communication' | 'collaboration' | 'self' | 'creative';
export type Format = 'offline' | 'online' | 'any';
export type Mode = 'explore' | 'focus';

export type Profile = {
  interests: Interest[];
  /** 한 주에 쓸 수 있는 시간(시간 단위) */
  time: number;
  format: Format;
  goal: string;
  importCS: boolean;
};

export type RecordVisibility = 'me' | 'friends';
/** 기록 카드 항목 (기준 문서 '기록 카드(안)'). 회고 인터뷰가 채운다. */
export type RecordCard = { situation?: string; role?: string; action?: string; result?: string; learned?: string; next?: string };

export type RecordItem = {
  id: string;
  /** 고칠 때마다 1씩 오른다. 발견 확인 상태가 '근거 바뀜'으로 넘어가는 기준이다. */
  v: number;
  title: string;
  kind: string;
  date: string;
  /** 예: '2026-2'. 기록 보관함의 학기 묶음 기준 */
  semester: string;
  field: Field;
  did: Did;
  energy: Energy;
  quote: string;
  note: string;
  axes: Axis[];
  source: 'seed' | 'agent' | 'manual';
  /** 학교 확인(연동) 또는 직접 입력 */
  verification: 'school' | 'self';
  visibility: RecordVisibility;
  /** false 면 발견과 추천에서 뺀다 */
  useForRecommend: boolean;
  card?: RecordCard;
  programId?: string;
  /** 학생이 '맞아요'를 눌러 확인한 역량 근거. 없는 축은 AI 추정(점선)이다 */
  confirmedAxes?: Axis[];
};

export type CareerLink = { req: string; part: 'match' | 'gap'; gapLabel?: string };
export type Program = {
  id: string; title: string; host: string; field: Field; format: 'offline' | 'online'; when: string; hours: number; durationLabel: string;
  /** 1주차 기준 마감까지 남은 날 */
  ddayW1: number; weeks: number[]; place: string; target: string; eligible: boolean; seatsKnown: boolean; did: Did[]; level: 1 | 2 | 3;
  career?: CareerLink; summary: string; otherDates?: string[];
};

export type ReasonKind = 'energy' | 'focus' | 'career' | 'novelty' | 'interest' | 'bridge';
export type Reason = { kind: ReasonKind; text: string; source?: string; recordId?: string; url?: string };
/** score 는 내부 정렬에만 쓴다. 화면에 내지 않는다. */
export type Scored = { p: Program; score: number; reasons: Reason[] };
export type Funnel = { pool: number; open: number; eligible: number; fit: number; fresh: number };

export type Discovery = { key: string; did: Did; kind: 'up' | 'freq'; statement: string; evidence: RecordItem[]; sig: string[] };
export type DiscState = 'none' | 'yes' | 'no' | 'changed';
export type Confirm = { status: 'yes' | 'no'; sig: string[] };
export type LastDone = { recordId: string; title: string; field: Field };
export type DislikeKind = 'time' | 'field' | 'done' | 'hard';

export type Job = { id: string; company: string; short: string; title: string; url: string; checkedAt: string; state: string };
export type Req = { id: string; job: string; label: string; kind: '필수' | '우대' | '담당업무' };
export type Direction = { id: string; field: Field; label: string; reqIds: string[] };
export type Catalog = { programs: Program[]; jobs: Job[]; reqs: Req[]; directions: Direction[] };

export type Settings = {
  /** 회고를 발견과 추천에 쓰기 */
  discover: boolean;
  /** 채용 공고 요건과 연결 */
  career: boolean;
};

export type Visibility = {
  /** 프로필 공개. 기본 false(비공개). false 면 소셜 기능을 쓸 수 없다 */
  profilePublic: boolean;
  /** 명예의 전당 별도 동의 */
  hallOfFameConsent: boolean;
  /** 공개 목록에서 뺀 활동 id */
  hiddenActivityIds: string[];
  /** 공개할 회고(기록 id) */
  sharedRecordIds: string[];
  /** 전시할 도전 과제 id */
  showcaseChallengeIds: string[];
};

export type PrepItem = {
  id: string;
  label: string;
  /** 누가 하나. 에이전트가 한 건 처음부터 done 이다 */
  by: 'agent' | 'me';
  done: boolean;
  /** 끝낸 시각('21:40'). 에이전트 항목은 준비를 시작한 시각 */
  at?: string;
  /** 마감까지 남은 날. 에이전트가 끝낸 건 없다 */
  dday?: number;
  /** 항목 아래 한 줄 안내 */
  hint?: string;
  /** 누르면 가는 곳 */
  link?: { label: string; path: string };
};

export type ActivityStatus = 'preparing' | 'applied' | 'ongoing' | 'ended' | 'recorded' | 'declined';
export type BoardColumn = 'todo' | 'doing' | 'done';
export type Activity = {
  id: string;
  title: string;
  field: Field;
  status: ActivityStatus;
  /** 한 줄 일정·상태 설명. 예: '9월 4일 ~ 12월 10일 · 매주 목' */
  schedule: string;
  /** 신청 준비 진행도 */
  prep?: { done: number; total: number };
  /** 신청 준비 체크리스트. 항목별 완료가 여기 남는다(prep 은 이걸 센 값) */
  prepItems?: PrepItem[];
  /** 가장 급한 마감 하나. dday 0 = 오늘 */
  due?: { label: string; dday: number };
  programId?: string;
  recordId?: string;
};

export type CandidateChoice = 'preparing' | 'later' | 'dismissed';
