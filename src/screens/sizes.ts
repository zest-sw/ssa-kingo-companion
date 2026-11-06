import type { Route } from '../app/router';
import './sizes.css';

/**
 * 경로마다 화면 틀이 어떤 크기 규칙을 쓰는지(DESIGN.md Layout '크기별'). 화면 덩어리를 받는 동안의 뼈대가 실제 화면과 같은 자리에 서도록 쓴다.
 * cap = 카드 화면(넓은 화면에서 본문 최대 폭 안에서 가운데), flow = 흐름 화면(가운데 한 칸, 높은 창에서 조금 내림).
 * 화면 쪽은 .os 에 data-width="cap" / data-flow 를 직접 붙인다. 화면 틀을 바꾸면 여기도 같이 바꾼다(sizes.test.ts 에 경로별로 적어 둠).
 */
export type ScreenFrame = 'cap' | 'flow' | 'full';

export function frameOf(r: Route): ScreenFrame {
  if (r.name === 'recommend' && r.sub?.startsWith('prepare')) return 'flow';
  if (r.name === 'activities' && r.sub?.startsWith('records/interview')) return 'flow';
  if (r.name === 'home' || r.name === 'profile' || r.name === 'settings' || (r.name === 'recommend' && !r.sub)) return 'cap';
  return 'full';
}
