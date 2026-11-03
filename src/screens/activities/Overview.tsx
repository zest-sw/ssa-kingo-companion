import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, EmptyState, GhostPic, PageHeader } from '../../components';
import { pendingRetros } from './summary';
import { StatusBarsPic, WeekPic } from './Pictures';
import { statusBars, weekHeadline, weekOf } from './visual';

const STATUS_ROWS = ['할 것', '하는 중', '끝난 것'];

/**
 * 내 활동 요약(v1.4): 덩어리 세 개만. 할 일 상태 · 이번 주 마감 · 회고 대기.
 * 일정·기록은 사이드바 하위 메뉴가 맡는다. 여기서는 이번 주 마감 칸 머리에 '일정 보기', 회고 대기 칸 머리에 '기록 보기'를 한 개씩만 둔다.
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const retros = pendingRetros(state.activities);
  const empty = state.activities.length === 0;
  const week = weekOf(state.activities);
  const bars = statusBars(state.activities);

  const toRetro = () => navigate(retros.length === 1 ? `activities/records/interview/${retros[0].id}` : 'activities/records/interview');

  return (
    <div className="os">
      <PageHeader title="내 활동" />
      <div className="os__body act-sum">
        {empty ? (
          // 첫 사용: 세 칸 모두 같은 모양(점선 그림 틀 + 한 줄). 다음 행동 버튼은 첫 칸 한 곳에만 둔다.
          <div className="act-now">
            <Card className="os-card" title="할 일 상태">
              <EmptyState pic={<GhostPic kind="bars" labels={STATUS_ROWS} />} message="신청 준비를 누르면 막대가 생겨요" action={<Button size="sm" variant="primary" onClick={() => navigate('recommend')}>추천에서 활동 고르기</Button>} />
            </Card>
            <Card className="os-card" title="이번 주 마감">
              <EmptyState pic={<GhostPic kind="timeline" labels={week.days.map(d => d.label)} />} message="이번 주 마감이 여기에 찍혀요" />
            </Card>
            <Card className="os-card act-retro" title="회고 대기">
              <EmptyState pic={<GhostPic kind="rows" labels={['']} />} message="끝난 활동이 생기면 여기서 회고를 시작해요" />
            </Card>
          </div>
        ) : (
          <div className="act-now">
            <Card className="os-card" title="할 일 상태" aria-label="할 일 상태"><div className="act-now__pic"><StatusBarsPic bars={bars} /></div></Card>
            <Card className="os-card" title={weekHeadline(week)} aria-label="이번 주 마감" action={<Button size="sm" variant="ghost" onClick={() => navigate('activities/schedule')}>일정 보기</Button>}>
              <div className="act-now__pic">
                <WeekPic week={week} onOpen={id => openEntity({ kind: 'activity', id })} />
                {week.farther > 0 && <p className="act-now__far">이번 주 밖 마감 {week.farther}개 · 일정에서 볼 수 있어요</p>}
              </div>
            </Card>
            <Card className={`os-card act-retro${retros.length ? ' is-on' : ''}`} title="회고 대기" aria-label="회고 대기" action={<Button size="sm" variant="ghost" onClick={() => navigate('activities/records')}>기록 보기</Button>}>
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
      </div>
    </div>
  );
}
