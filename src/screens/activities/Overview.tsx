import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { PageHeader, SummaryCard } from '../../components';
import { BOARD_COLUMNS } from '../../domain/activities';
import { CURRENT_TERM } from '../../data/records';
import { columnCounts } from './timeline';

/**
 * 내 활동 요약: 하위 화면(일정, 기록)마다 카드 하나. 카드를 누르면 그 하위 화면으로 간다. 같은 곳으로 가는 다른 버튼은 두지 않는다.
 * ponytail: 문장은 지금 있는 개수를 그대로 쓴다. '할 것 3개 중 2개가 이번 주 마감이에요' 같은 학생 맞춤 문장과 다음 마감·회고 대기는 v1.0 2단계에서 채운다.
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const counts = columnCounts(state.activities);
  const thisTerm = state.records.filter(r => r.semester === CURRENT_TERM.semester).length;
  const pending = state.activities.filter(a => a.status === 'ended').length;

  return (
    <>
      <PageHeader title="내 활동" />
      <div className="act-sums">
        <SummaryCard
          href={hrefOf('activities/schedule')}
          title="일정"
          sentence={state.activities.length ? `활동 ${state.activities.length}개` : '추천에서 신청 준비를 누르면 활동이 생겨요'}
          value={state.activities.length ? BOARD_COLUMNS.map(c => `${c.label} ${counts[c.id]}`).join(' · ') : undefined}
        />
        <SummaryCard
          href={hrefOf('activities/records')}
          title="기록"
          sentence={state.records.length ? `기록 ${state.records.length}개, 이번 학기 ${thisTerm}개` : '끝난 활동의 회고를 쓰면 기록이 생겨요'}
          value={pending ? `회고 대기 ${pending}개` : undefined}
        />
      </div>
    </>
  );
}
