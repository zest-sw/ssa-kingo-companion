import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate, sectionTabs } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, Legend, PageHeader, SectionTabs, type LegendItem } from '../../components';
import { CURRENT_TERM } from '../../data/records';
import { semesterTally } from '../../domain/recommend-flow/summary';
import { RetroCard } from './RetroCard';
import { statusBars, type StatusBar } from './visual';
import { WeekPic } from './WeekPic';
import { retroQueue, weekOf, weekTitle } from './week';

const LEGEND: LegendItem[] = [
  { label: '마감', mark: 'diamond', tone: 'ink' }, { label: '하는 중', mark: 'hatch', tone: 'ink' },
  { label: '모이는 날', mark: 'dot', tone: 'ink' }, { label: '오늘', mark: 'today' }
];

/** 할 일 한 줄: 얇은 막대 하나를 개수 비율로 나누고 아래에 이름과 수를 적는다. 누르는 곳은 없다(일정은 구역 탭이 맡는다). */
function StatusLine({ bars }: { bars: StatusBar[] }) {
  const shown = bars.filter(b => b.count > 0);
  return (
    <div className="act-line">
      <div className="act-line__bar" aria-hidden="true">{shown.map(b => <span key={b.id} data-id={b.id} style={{ flexGrow: b.count }} />)}</div>
      <ul className="act-line__keys">{bars.map(b => <li key={b.id} data-id={b.id}>{b.label} <b className="num">{b.count}</b></li>)}</ul>
    </div>
  );
}

/**
 * 내 활동 › 한눈에. 주인공은 '이번 주' 그림 하나(왼쪽, 남은 높이를 채운다). 오른쪽은 조연: 할 일 한 줄 막대, 회고 대기.
 * 일정·기록으로 가는 길은 구역 탭이 맡는다. 여기서는 같은 목적지 링크를 두지 않고, 그림 속 항목만 그 항목 서랍·회고로 보낸다.
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const empty = state.activities.length === 0;
  const week = weekOf(state.activities);
  const queue = retroQueue(state.activities);
  // 연속 기록 대신 쌓이기만 하는 숫자. 줄어들거나 끊기는 장치는 두지 않는다.
  const tally = semesterTally(state.activities, state.records, CURRENT_TERM.semester);
  const tabs = <SectionTabs {...sectionTabs('activities', 'activities')} />;

  let hero;
  if (empty) {
    // 첫 사용: 이번 주 축을 옅게 그리고, 화면의 유일한 주 버튼을 여기에 둔다.
    hero = (
      <Card className="os-card act-week" title="이번 주" data-fill>
        <WeekPic week={week} onOpen={() => {}} empty={<><p>신청 준비를 누르면 마감과 활동 날짜가 이 주에 생겨요</p><Button variant="primary" onClick={() => navigate('recommend')}>추천에서 활동 고르기</Button></>} />
      </Card>
    );
  } else {
    hero = (
      <Card className="os-card act-week" title={weekTitle(week)} lead action={week.rows.length > 0 && <Legend items={LEGEND} />} data-fill>
        <WeekPic week={week} onOpen={id => openEntity({ kind: 'activity', id })} empty={<p>이번 주에 걸린 마감과 모임이 없어요. 다음 일정은 일정 탭에 있어요.</p>} />
        {week.laterDues > 0 && <p className="act-week__later">다음 주부터 마감 {week.laterDues}개가 이어져요</p>}
      </Card>
    );
  }

  return (
    <div className="os">
      <PageHeader title="내 활동" tabs={tabs} />
      <div className="os__body os__body--fill act-sum">
        {hero}
        <div className="act-side">
          {!empty && (
            <Card className="os-card act-status" title="할 일">
              <StatusLine bars={statusBars(state.activities)} />
              {tally && <p className="act-status__tally">{tally}</p>}
            </Card>
          )}
          <RetroCard queue={queue} hasActivities={!empty} />
        </div>
      </div>
    </div>
  );
}
