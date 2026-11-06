import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { hrefOf, navigate, sectionTabs } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, EmptyState, GanttRows, GhostPic, Icon, Legend, PageHeader, SectionTabs, type LegendItem } from '../../components';
import { CURRENT_TERM } from '../../data/records';
import { semesterTally } from '../../domain/recommend-flow/summary';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { pendingRetros } from './summary';
import { RETRO_SHOWN } from '../records/RetroBand';
import { StatusBarsPic } from './Pictures';
import { statusBars } from './visual';
import { clipRows, monthRange, timelineOf } from './timeline';

const STATUS_ROWS = ['할 것', '하는 중', '끝난 것'];
const LEGEND: LegendItem[] = [
  { label: '준비·대기', mark: 'hatch', tone: 'ink' }, { label: '진행', mark: 'fill', tone: 'ink' },
  { label: '신청 마감', mark: 'diamond', tone: 'ink' }, { label: '오늘', mark: 'today' }
];
/** 요약에서는 이번 달 막대를 4줄까지만. 나머지는 일정 화면에서 */
const MONTH_ROWS = 4;

/**
 * 내 활동 요약: 덩어리 셋. 위 줄 할 일 상태 · 회고 대기, 아래 줄 이번 달 일정(일정 › 타임라인의 이번 달을 작게).
 * 일정으로 가는 길은 '이번 달 일정' 카드 제목 링크 하나다(사이드바 '일정'과 같은 목적지지만 내용을 펼치는 요약 카드라 허용, ia-navigation 2절 4).
 */
export function Overview() {
  const { state } = useApp();
  useOverviewState<null>('activities', null);
  const retros = pendingRetros(state.activities);
  const empty = state.activities.length === 0;
  const bars = statusBars(state.activities);
  // 연속 기록 대신 쌓이기만 하는 숫자. 줄어들거나 끊기는 장치는 두지 않는다.
  const tally = semesterTally(state.activities, state.records, CURRENT_TERM.semester);
  const month = monthRange();
  const clipped = clipRows(timelineOf(state.activities).rows, month, MONTH_ROWS);
  const [, m] = month.start.split('-').map(Number);
  const tabs = <SectionTabs {...sectionTabs('activities', 'activities')} />;
  const monthTitle = <a className="act-month__link" href={hrefOf('activities/schedule')}>{m}월 일정<Icon name="chevron" size={16} /></a>;

  if (empty) {
    // 첫 사용: 세 칸 모두 그림 틀 + 한 줄. 다음 행동 버튼은 첫 칸 한 곳에만 둔다.
    return (
      <div className="os">
        <PageHeader title="내 활동" tabs={tabs} />
        <div className="os__body act-sum">
          <div className="act-now">
            <Card className="os-card" title="할 일 상태">
              <EmptyState pic={<GhostPic kind="bars" labels={STATUS_ROWS} />} message="신청 준비를 누르면 막대가 생겨요" action={<Button size="sm" variant="primary" onClick={() => navigate('recommend')}>추천에서 활동 고르기</Button>} />
            </Card>
            <Card className="os-card act-retro" title="회고 대기">
              <EmptyState pic={<GhostPic kind="rows" labels={['']} />} message="끝난 활동이 생기면 여기서 회고를 시작해요" />
            </Card>
            <Card className="os-card act-month" title={monthTitle}>
              <EmptyState pic={<GhostPic kind="timeline" labels={['1일', '8일', '15일', '22일', '29일']} />} message="신청한 활동의 날짜가 여기 막대로 생겨요" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="os">
      <PageHeader title="내 활동" tabs={tabs} />
      <div className="os__body act-sum">
        <div className="act-now">
          <Card className="os-card" title="할 일 상태" aria-label="할 일 상태">
            <div className="act-now__pic"><StatusBarsPic bars={bars} />{tally && <p className="act-now__far">{tally}</p>}</div>
          </Card>
          <Card className={`os-card act-retro${retros.length ? ' is-on' : ''}`} title="회고 대기" aria-label="회고 대기" action={<Button size="sm" variant="ghost" onClick={() => navigate('activities/records')}>기록 보기</Button>}>
            {retros.length ? (
              // Day One: 활동 이름을 누르면 그 활동의 회고가 바로 열린다. 넘친 것만 회고 목록으로.
              <div className="act-retro__cell">
                <b className="act-retro__n num" aria-label={`회고 대기 ${retros.length}개`}>{retros.length}</b>
                <ul className="act-retro__list">
                  {retros.slice(0, RETRO_SHOWN).map(a => (
                    <li key={a.id}><button type="button" className="act-retro__item" aria-label={`${a.title} 회고 쓰기`} onClick={() => navigate(`activities/records/interview/${a.id}`)}><span className="act-retro__name">{a.title}</span><span className="act-retro__label" aria-hidden="true"><Icon name="chevron" size={14} /></span></button></li>
                  ))}
                  {retros.length > RETRO_SHOWN && <li><button type="button" className="act-retro__item act-retro__more" onClick={() => navigate('activities/records/interview')}>{retros.length - RETRO_SHOWN}개 더 보기</button></li>}
                </ul>
              </div>
            ) : <p className="act-retro__none">끝난 활동이 생기면 여기서 회고를 시작해요.</p>}
          </Card>
          <Card className="os-card act-month" title={monthTitle} aria-label="이번 달 일정" action={<Legend items={LEGEND} />}>
            <GanttRows label="이번 달 활동" range={month} today={PROTOTYPE_TODAY} rows={clipped.rows} onSelect={id => openEntity({ kind: 'activity', id })} empty="이번 달에 걸친 활동이 없어요. 추천에서 이번 달 활동을 골라 보세요." />
            {clipped.hidden > 0 && <p className="act-now__far">{clipped.hidden}개 더 있어요</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
