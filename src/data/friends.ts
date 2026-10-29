import type { Field } from '../domain/types';
import type { RecruitPost } from '../domain/social';

// 친구·모집·명예의 전당 예시 데이터. 이름은 모두 지어낸 가공 이름이다(실제 인물 아님).

export type Peer = { id: string; name: string; dept: string; year: number; note: string; field: Field };

/** 나와 비슷한 학생: 관심 분야와 공개한 활동이 겹치고 조금 앞선 학생을 먼저 보여 준다. */
export const SIMILAR_PEERS: Peer[] = [
  { id: 'peer-a', name: '아린', dept: '데이터사이언스학과', year: 4, note: '같은 활동 2개', field: 'data' },
  { id: 'peer-b', name: '준호', dept: '경영학과', year: 4, note: '관심 분야가 같아요', field: 'product' },
  { id: 'peer-c', name: '소라', dept: '교육학과', year: 3, note: '멘토링 경험', field: 'mentor' }
];

/** 이미 서로 수락한 친구 */
export const FRIENDS: Peer[] = [
  { id: 'friend-a', name: '다온', dept: '소프트웨어학과', year: 3, note: 'AI 프로젝트 학회', field: 'ai' },
  { id: 'friend-b', name: '지후', dept: '통계학과', year: 3, note: '리서치 스터디', field: 'research' }
];

/** 나에게 온 친구 요청 */
export const INCOMING: Peer[] = [{ id: 'req-a', name: '하람', dept: '미디어커뮤니케이션학과', year: 2, note: '같은 활동 1개', field: 'research' }];

export type FeedItem = { id: string; who: string; text: string; cheers: number };
export const FEED: FeedItem[] = [
  { id: 'feed-a', who: '다온', text: '다온님이 AI 데이터 분석 경진대회에 신청했어요', cheers: 4 },
  { id: 'feed-b', who: '지후', text: '지후님이 숨은 도전 과제를 찾았어요', cheers: 2 },
  { id: 'feed-c', who: '아린', text: '아린님이 데이터 시각화 회고를 공개했어요', cheers: 0 }
];

/** 이 활동을 해 본 친구·선배. 내 활동 이름으로 찾는다 */
export type DoneBy = { activityTitle: string; people: { name: string; label: string }[] };
export const DONE_BY: DoneBy[] = [
  { activityTitle: 'AI 프로젝트 학회', people: [{ name: '다온', label: '친구' }, { name: '서진', label: '4학년 선배' }] },
  { activityTitle: '창업 동아리', people: [{ name: '유나', label: '4학년 선배' }] },
  { activityTitle: '가을 데이터 해커톤', people: [{ name: '아린', label: '선배' }, { name: '지후', label: '친구' }] }
];

export type TeamOpportunity = {
  id: string; title: string; kind: '대회' | '해커톤' | '공모전'; deadline: string;
  /** 같은 기회에 관심을 표시한 공개 학생 수(예시) */
  interested: number;
  /** 있으면 추천 후보와 같은 기회 */
  programId?: string;
};
export const TEAM_OPPORTUNITIES: TeamOpportunity[] = [
  { id: 'opp-ideathon', title: '캠퍼스 서비스 개선 아이디어톤', kind: '해커톤', deadline: '10.24(토)', interested: 5, programId: 'p-ideathon' },
  { id: 'opp-data', title: 'AI 데이터 분석 경진대회', kind: '대회', deadline: '11.07(토)', interested: 3 },
  { id: 'opp-startup', title: '창업 아이디어 공모전', kind: '공모전', deadline: '11.14(토)', interested: 4 },
  { id: 'opp-ux', title: '교내 UX 개선 공모전', kind: '공모전', deadline: '11.21(토)', interested: 2 }
];
export const OPPORTUNITY_BY_ID = Object.fromEntries(TEAM_OPPORTUNITIES.map(o => [o.id, o])) as Record<string, TeamOpportunity>;

/** 다른 학생이 올린 예시 모집 글 */
export const SEED_POSTS: RecruitPost[] = [
  { id: 'post-a', opportunityId: 'opp-data', author: '다온', slots: 2, note: '데이터 전처리를 같이 해 줄 분 찾아요', mine: false },
  { id: 'post-b', opportunityId: 'opp-startup', author: '소라', slots: 3, note: '발표를 맡아 줄 분을 찾고 있어요', mine: false },
  { id: 'post-c', opportunityId: 'opp-ideathon', author: '준호', slots: 1, note: '화면 시안을 그려 줄 분이면 좋아요', mine: false }
];

/** 내 글에 지원한 예시 학생(수락은 학생이 직접) */
export const APPLICANTS = ['하람', '서진'];

export type HallEntry = {
  id: string;
  name: string;
  dept: string;
  year: number;
  group: 'ai' | 'dev' | 'plan' | 'mentor' | 'global';
  reason: string;
  start: string;
  path: { title: string; field: Field; when: string }[];
  retro?: string;
};

/** 명예의 전당 예시. 순위·점수 없이 선정 이유와 거쳐 온 활동만 둔다 */
export const HALL: HallEntry[] = [
  {
    id: 'hall-a', name: '지윤', dept: '통계학과', year: 4, group: 'ai', reason: '교내 해커톤 대상, 데이터 분석 멘토 2학기', start: '처음 시작 · 2학년 1학기',
    path: [
      { title: 'AI 특강', field: 'ai', when: '2-1' }, { title: '데이터 분석 스터디', field: 'data', when: '2-2' }, { title: '데이터 대회', field: 'data', when: '3-1' },
      { title: '교내 해커톤 대상', field: 'dev', when: '3-2' }, { title: '데이터 분석 멘토', field: 'mentor', when: '4-1' }
    ],
    retro: '막힐 때마다 팀원에게 설명하다 보니 길이 보였다'
  },
  {
    id: 'hall-b', name: '도현', dept: '경영학과', year: 3, group: 'plan', reason: '창업 경진대회 수상', start: '처음 시작 · 1학년 2학기',
    path: [
      { title: '창업 특강', field: 'startup', when: '1-2' }, { title: '창업 동아리', field: 'startup', when: '2-1' }, { title: '창업 캠프', field: 'startup', when: '2 여름' }, { title: '창업 경진대회 수상', field: 'startup', when: '3-1' }
    ],
    retro: '고객 인터뷰 20번이 아이디어를 바꿨다'
  },
  {
    id: 'hall-c', name: '하은', dept: '교육학과', year: 4, group: 'mentor', reason: '멘티에서 멘토, 운영진까지 3년', start: '처음 시작 · 1학년 1학기',
    path: [
      { title: '학습 멘토링 · 멘티', field: 'mentor', when: '1-1' }, { title: '학습 멘토링 · 멘토', field: 'mentor', when: '2-1' }, { title: '글로벌 버디', field: 'global', when: '3-1' }, { title: '멘토링 운영진', field: 'mentor', when: '4-1' }
    ]
  }
];
