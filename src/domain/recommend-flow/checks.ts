import type { Activity, Program } from '../types';
import { checksOf } from './flow';
import { weekLoad } from './load';

// 자세히의 '에이전트가 확인했어요': 확인 결과와 확인에 쓴 정보를 한 줄씩(concept '신청 대상·시간표 확인 결과 / 확인에 쓴 정보').

export type CheckRow = {
  id: 'target' | 'schedule' | 'team';
  /** ok = 통과, warn = 학생이 봐야 함, info = 알려 두기만 */
  state: 'ok' | 'warn' | 'info';
  label: string;
  /** 확인에 쓴 정보 */
  basis: string;
};

export function agentChecks(p: Program, activities: Activity[], week: number): CheckRow[] {
  const c = checksOf(p, activities);
  const load = weekLoad(p, activities, week);
  const rows: CheckRow[] = [
    { id: 'target', state: c.eligible ? 'ok' : 'warn', label: c.eligible ? '신청 대상이에요' : '신청 대상이 아니에요', basis: `모집 대상 ${p.target}` },
    { id: 'schedule', state: c.overlap ? 'warn' : 'ok', label: c.overlap ? '내 일정과 겹쳐요' : '일정이 안 겹쳐요', basis: c.overlap ? p.when : load.why }
  ];
  if (c.team) rows.push({ id: 'team', state: 'info', label: '팀이 필요해요', basis: '팀원 모집에서 찾아요' });
  return rows;
}
