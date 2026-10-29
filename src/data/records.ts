import type { CardStep } from '../domain/interview/schema';

// 회고 인터뷰의 빠른 답 칩. 누르면 그 말을 답으로 보낸다. 예시 문구이고, 자유 입력도 늘 된다.
export const QUICK_ANSWERS: Record<CardStep, string[]> = {
  situation: ['팀으로 참여했어요', '혼자 참여했어요'],
  role: ['발표를 맡았어요', '자료 조사를 맡았어요', '팀원 조율을 맡았어요', '개발을 맡았어요'],
  action: ['자료를 정리해서 공유했어요', '직접 만들어서 시연했어요', '회의를 이끌었어요'],
  result: ['끝까지 마쳤어요', '아직 결과를 기다리고 있어요', '기대한 만큼은 아니었어요'],
  learned: ['준비가 중요하다는 걸 알았어요', '혼자보다 같이 할 때 빨랐어요', '설명하다 보니 정리가 됐어요'],
  next: ['비슷한 활동에 또 참여해 볼래요', '더 깊이 공부해 볼래요', '아직 정하지 못했어요']
};

/** 예시 데이터의 '지금' 학기. 새 기록에 붙는다. */
export const CURRENT_TERM = { semester: '2026-2', date: '2학기 · 10월', month: '2026-10' };
