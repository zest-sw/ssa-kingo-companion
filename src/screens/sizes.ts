import type { Route } from '../app/router';

/**
 * 흐름 화면(신청 준비·회고 인터뷰)인 경로. 화면 덩어리를 받는 동안의 뼈대가 실제 화면과 같은 가운데 한 칸·위 여백에 서도록 쓴다.
 * 화면 쪽은 .os 에 data-flow 를 직접 붙인다. 흐름 화면을 더하거나 빼면 여기도 같이 바꾼다(sizes.test.ts).
 * 폭 규칙(--os-max)은 모든 화면이 같아서 경로를 볼 일이 없다(src/styles/screen.css).
 */
export const isFlowRoute = (r: Route) =>
  (r.name === 'recommend' && !!r.sub?.startsWith('prepare')) || (r.name === 'activities' && !!r.sub?.startsWith('records/interview'));
