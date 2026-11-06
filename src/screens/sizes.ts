import type { Route } from '../app/router';

/**
 * 흐름 화면(신청 준비·회고 인터뷰)인 경로. 화면 덩어리를 받는 동안의 뼈대가 실제 화면과 같은 가운데 한 칸·위 여백에 서도록 쓴다.
 * 화면 쪽은 .os 에 data-flow 를 직접 붙인다. 흐름 화면을 더하거나 빼면 여기도 같이 바꾼다(sizes.test.ts).
 * 폭 규칙(--os-max)은 모든 화면이 같아서 경로를 볼 일이 없다(src/styles/screen.css).
 */
export const isFlowRoute = (r: Route) =>
  (r.name === 'recommend' && !!r.sub?.startsWith('prepare')) || (r.name === 'activities' && !!r.sub?.startsWith('records/interview'));

/**
 * 화면 덩어리를 받는 동안 그릴 뼈대 모양. 실제 화면의 첫 모양을 따른다(토스 09 '뼈대는 실제 모양 그대로').
 * - list: 추천 요약. 가장 추천 띠 한 줄 + 목록 행
 * - flow: 신청 준비·회고 인터뷰. 가운데 칸 하나
 * - week: 내 활동 한눈에. 이번 주 그림 + 옆 열(카드 둘)
 * - panel: 그림·표 칸 하나(분석 테크 트리·경험 지도·관심 흐름, 일정, 기록)
 * - side: 넓은 칸 + 고정 폭 옆 칸(분석 한눈에)
 * - split: 두 칸(나의 강점, 프로필·친구·팀원 모집). 명예의 전당은 panel
 * - nav: 설정. 왼쪽 목차 + 칸 하나
 * 화면 배치를 바꾸면 여기도 같이 바꾼다(sizes.test.ts, scripts/perf/measure.mjs 가 모양 차이를 잰다).
 */
export type SkeletonShape = 'list' | 'flow' | 'week' | 'panel' | 'side' | 'split' | 'nav';

export function skeletonOf(r: Route): SkeletonShape {
  if (isFlowRoute(r)) return 'flow';
  const first = r.sub?.split('/')[0];
  switch (r.name) {
    case 'recommend': return 'list';
    case 'activities': return first ? 'panel' : 'week';
    case 'analysis': return !first ? 'side' : first === 'strengths' ? 'split' : 'panel';
    case 'settings': return 'nav';
    case 'profile': return first === 'hall' ? 'panel' : 'split';
    default: return 'split';
  }
}
