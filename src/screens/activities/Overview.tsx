import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { hrefOf, navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, GhostPic, PageHeader, SummaryCard } from '../../components';
import { CURRENT_TERM } from '../../data/records';
import { pendingRetros } from './summary';
import { MiniGanttPic, RecordGridPic, StatusBarsPic, WeekPic } from './Pictures';
import { miniGantt, recordGrid, recordKeyword, scheduleKeyword, statusBars, weekHeadline, weekOf } from './visual';

const STATUS_ROWS = ['할 것', '하는 중', '끝난 것'];
const GHOST_TERMS = ['26-1', '26 여름', '26-2'];

/**
 * 내 활동 요약: 위쪽에 지금 상태(상태 막대·이번 주 타임라인·회고 대기), 아래에 일정·기록 카드.
 * 카드를 누르면 그 하위 화면으로 간다. 같은 곳으로 가는 다른 버튼은 두지 않는다.
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const retros = pendingRetros(state.activities);
  const empty = state.activities.length === 0;
  const week = weekOf(state.activities);
  const bars = statusBars(state.activities);
  const grid = recordGrid(state.records);

  const toRetro = () => navigate(retros.length === 1 ? `activities/records/interview/${retros[0].id}` : 'activities/records/interview');

  return (
    <div className="os">
      <PageHeader title="내 활동" />
      <div className="os__body act-sum">
        {empty ? (
          // 첫 사용: 같은 세 칸에 그림 틀만 두고, 다음 행동은 첫 칸 한 곳에
          <div className="act-now">
            <Card className="os-card" title="할 일 상태" action={<Button size="sm" variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>}>
              <GhostPic kind="bars" labels={STATUS_ROWS} message="신청 준비를 누르면 막대가 생겨요" />
            </Card>
            <Card className="os-card" title="이번 주 마감">
              <GhostPic kind="timeline" labels={week.days.map(d => d.label)} message="이번 주 마감이 여기에 찍혀요" />
            </Card>
            <Card className="os-card act-retro" title="회고 대기"><p className="act-retro__none">끝난 활동이 생기면 여기서 회고를 시작해요.</p></Card>
          </div>
        ) : (
          <div className="act-now">
            <Card className="os-card" title="할 일 상태" aria-label="할 일 상태"><div className="act-now__pic"><StatusBarsPic bars={bars} /></div></Card>
            <Card className="os-card" title={weekHeadline(week)} aria-label="이번 주 마감">
              <div className="act-now__pic">
                <WeekPic week={week} onOpen={id => openEntity({ kind: 'activity', id })} />
                {week.farther > 0 && <p className="act-now__far">이번 주 밖 마감 {week.farther}개 · 일정에서 볼 수 있어요</p>}
              </div>
            </Card>
            <Card className={`os-card act-retro${retros.length ? ' is-on' : ''}`} title="회고 대기" aria-label="회고 대기">
              {retros.length ? (
                <button type="button" className="act-retro__cell" onClick={toRetro}>
                  <b className="act-retro__n num">{retros.length}</b>
                  <span className="act-retro__text">
                    <span className="act-retro__name">{retros[0].title}{retros.length > 1 && ` 외 ${retros.length - 1}`}</span>
                    <span className="act-retro__label">회고 쓰기</span>
                  </span>
                </button>
              ) : <p className="act-retro__none">끝난 활동이 생기면 여기서 회고를 시작해요.</p>}
            </Card>
          </div>
        )}
        <div className="act-sums">
          <SummaryCard href={hrefOf('activities/schedule')} title="일정" headline={empty ? '신청 준비를 시작해 보세요' : scheduleKeyword(state.activities)} value={state.activities.length ? `활동 ${state.activities.length}개` : undefined} visual={empty ? <GhostPic kind="rows" /> : <MiniGanttPic gantt={miniGantt(state.activities)} />} />
          <SummaryCard href={hrefOf('activities/records')} title="기록" headline={recordKeyword(state.records, CURRENT_TERM.semester)} value={state.records.length ? `기록 ${state.records.length}개` : undefined} visual={grid.rows.length ? <RecordGridPic grid={grid} /> : <GhostPic kind="grid" labels={['', '']} cols={GHOST_TERMS} />} />
        </div>
      </div>
    </div>
  );
}
