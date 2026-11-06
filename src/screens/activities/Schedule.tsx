import { useEffect } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate, sectionTabs } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, EmptyState, GanttRows, GhostPic, Legend, PageHeader, SectionTabs, SegmentedControl, type LegendItem } from '../../components';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { FIELD_GROUP } from '../../domain/vocab';
import { BoardView } from './BoardView';
import { ListView } from './ListView';
import { scheduleHeadline } from './summary';
import { clipRows, monthRange, SEMESTER, timelineOf } from './timeline';

/** 일정표 첫 화면(이번 달)에 그릴 줄 수. 넘치면 'n개 더' 한 줄과 학기 전체 보기로 */
const MONTH_ROWS = 12;
type View = 'timeline' | 'board' | 'list';
const VIEWS: { id: View; label: string }[] = [{ id: 'timeline', label: '일정표' }, { id: 'board', label: '보드' }, { id: 'list', label: '목록' }];
type Sel = { view: View; focus?: string; full?: boolean };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && VIEWS.some(x => x.id === (v as Sel).view);

const LEGEND: LegendItem[] = [
  { label: '준비·대기', mark: 'hatch', tone: 'ink' }, { label: '하는 중', mark: 'fill', tone: 'ink' }, { label: '끝', mark: 'faded', tone: 'ink' },
  { label: '마감', mark: 'diamond', tone: 'ink' }, { label: '결과 발표', mark: 'circle', tone: 'ink' }, { label: '오늘', mark: 'today' }
];

/**
 * 내 활동 › 일정: 같은 활동을 일정표·보드·목록으로 바꿔 본다. 페이지 머리 아래 탭 줄은 구역 탭 하나뿐이고,
 * 보기 전환은 카드 머리 오른쪽 한 곳에 둔다. 카드 제목은 이번 달을 한 문장으로 말한다.
 * 일정표의 첫 화면은 이번 달만(최대 5줄). 학기 전체는 '학기 전체 보기'로 한 단계 더 들어간다. 막대를 누르면 활동 서랍.
 */
/** sub: 보기 방식(board, list). 옛 #/activities/board·list 링크가 이 경로로 열린다. */
export function Schedule({ sub }: { sub?: string }) {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('activities/schedule', { view: 'timeline' }, isSel);
  useEffect(() => {
    const v = VIEWS.find(x => x.id === sub);
    if (v) setSel(s => ({ ...s, view: v.id }));
  }, [sub, setSel]);
  const open = (id: string) => { setSel(s => ({ ...s, focus: id })); openEntity({ kind: 'activity', id }); };
  const tabs = <SectionTabs {...sectionTabs('activities', 'activities/schedule')} />;

  if (state.activities.length === 0) {
    // 첫 사용: 빈 상태 = 그림 틀(학기 달 축) + 한 줄 + 버튼 하나. 보기 전환은 활동이 생기면 나온다.
    return (
      <div className="os">
        <PageHeader title="일정" tabs={tabs} />
        <div className="os__body">
          <Card className="act-overview" title="이번 학기">
            <EmptyState
              pic={<GhostPic kind="timeline" labels={['9월', '10월', '11월', '12월']} />}
              message="신청 준비를 누르면 여기에 막대가 생겨요"
              action={<Button variant="primary" onClick={() => navigate('recommend')}>추천에서 활동 고르기</Button>}
            />
          </Card>
        </div>
      </div>
    );
  }

  const switcher = <SegmentedControl<View> label="보기 방식" value={sel.view} onChange={v => setSel(s => ({ ...s, view: v }))} items={VIEWS} />;
  let body;
  let extra = null;
  if (sel.view === 'board') {
    body = <div className="os-scroll"><BoardView activities={state.activities} onOpen={open} /></div>;
  } else if (sel.view === 'list') {
    body = <ListView activities={state.activities} onOpen={open} />;
  } else {
    const { rows: all, undated } = timelineOf(state.activities);
    const month = monthRange();
    const clipped = clipRows(all, month, MONTH_ROWS);
    const rows = sel.full ? all : clipped.rows;
    extra = <><Legend items={LEGEND} /><Button size="sm" variant="ghost" onClick={() => setSel(s => ({ ...s, full: !s.full }))}>{sel.full ? '이번 달만 보기' : '학기 전체 보기'}</Button></>;
    body = (
      <div className="os-scroll">
        <GanttRows label={sel.full ? '이번 학기 활동' : '이번 달 활동'} range={sel.full ? SEMESTER : month} today={PROTOTYPE_TODAY} rows={rows} selectedId={sel.focus} onSelect={open} empty={sel.full ? '날짜가 있는 활동이 아직 없어요. 활동 날짜가 정해지면 막대로 보여요.' : '이번 달에 걸친 활동이 없어요. 학기 전체 보기로 다른 달을 살펴봐요.'} />
        {!sel.full && clipped.hidden > 0 && <p className="act-more">이번 달 활동이 {clipped.hidden}개 더 있어요</p>}
        {sel.full && undated.length > 0 && (
          <div className="act-undated">
            <span className="act-undated__label">날짜 미정</span>
            <ul className="act-undated__list">
              {undated.map(a => (
                <li key={a.id}>
                  <button type="button" className="act-undated__item" aria-label={`${a.title}, 날짜 미정`} aria-pressed={sel.focus === a.id} onClick={() => open(a.id)}>
                    <span className="act-undated__dot" data-group={FIELD_GROUP[a.field]} aria-hidden="true" />
                    <span className="act-undated__name">{a.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="os">
      <PageHeader title="일정" tabs={tabs} />
      <div className="os__body os__body--fill">
        <Card className="os-card act-schedule" data-view={sel.view} title={scheduleHeadline(state.activities)} lead action={<>{extra}{switcher}</>} data-fill>
          {body}
        </Card>
      </div>
    </div>
  );
}
