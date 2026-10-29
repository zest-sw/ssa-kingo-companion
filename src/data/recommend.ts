import { CS_URL } from './options';

// 추천 화면 전용 문구. 예시 값이다.

/** '신청 준비'를 누르면 에이전트가 하는 일 */
export const AGENT_TASKS: { icon: 'doc' | 'calendar' | 'bell'; text: string }[] = [
  { icon: 'doc', text: '신청서 초안을 써요' },
  { icon: 'calendar', text: '일정을 등록해요' },
  { icon: 'bell', text: '마감 전에 알려 줘요' }
];

/** 챌린지스퀘어 예시 링크. 실제 연동은 없다. */
export const APPLY_URL = CS_URL;

/** 에이전트가 초안을 쓰는 시간(ms) */
export const DRAFT_DELAY = 1200;
