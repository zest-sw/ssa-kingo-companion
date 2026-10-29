import type { Did, DislikeKind, Format, Interest } from '../domain/types';

// 가입 인터뷰·추천·회고에서 고르는 선택지 문구. v0.7 에서 옮겼다.

/** 실제 신청은 학생이 챌린지스퀘어에서 직접 한다. 연동은 없다. */
export const CS_URL = 'https://chsquare.skku.edu/challenge/nxui/index.html';
export const INTEREST_OPTIONS: { id: Interest; label: string }[] = [
  { id: 'research', label: 'UX·리서치' }, { id: 'product', label: '서비스 기획' }, { id: 'data', label: '데이터' }, { id: 'ai', label: 'AI' },
  { id: 'career', label: '진로·취업 준비' }, { id: 'startup', label: '창업' }, { id: 'unknown', label: '아직 모르겠어요' }
];
export const FORMAT_OPTIONS: { value: Format; label: string; sub: string }[] = [
  { value: 'any', label: '상관없어요', sub: '둘 다 추천해 주세요' }, { value: 'offline', label: '직접 만나서', sub: '캠퍼스 활동 위주' }, { value: 'online', label: '온라인으로', sub: '이동 없이 참여' }
];
export const QUOTE_HINTS: Record<Did, string[]> = {
  listen: ['다시 물어보니 답이 달라졌다', '상대 말을 요약해서 확인했다', '생각보다 듣는 게 어려웠다'],
  ask: ['질문 하나를 바꾸니 대화가 풀렸다', '유도 질문을 피하려고 애썼다', '물어볼 게 계속 생겼다'],
  organize: ['의견을 한 문장으로 묶었다', '역할을 나누니 속도가 붙었다', '조율하느라 내 의견은 못 냈다'],
  make: ['직접 만들어 보니 이해가 됐다', '생각보다 시간이 오래 걸렸다', '다른 사람 피드백이 도움이 됐다'],
  idea: ['엉뚱한 아이디어가 채택됐다', '아이디어를 좁히는 게 어려웠다', '다른 사람 아이디어에 덧붙였다'],
  present: ['설명하면서 생각이 정리됐다', '질문에 바로 답하기 어려웠다', '다음엔 더 짧게 말하고 싶다']
};
export const DISLIKES: { id: DislikeKind; label: string; effect: string; toast: string }[] = [
  { id: 'time', label: '시간이 안 맞아요', effect: '이 활동을 빼고 다시 골라요', toast: '이 활동을 빼고 다시 골랐어요.' },
  { id: 'field', label: '관심 없는 분야예요', effect: '이 분야는 덜 추천해요', toast: '이 분야는 덜 추천할게요. 다시 골랐어요.' },
  { id: 'done', label: '이미 해 본 활동이에요', effect: '목록에서 빼요', toast: '해 본 활동으로 빼고 다시 골랐어요.' },
  { id: 'hard', label: '너무 어려워 보여요', effect: '입문 활동부터 추천해요', toast: '입문 활동 위주로 다시 골랐어요.' }
];
