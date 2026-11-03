import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, EmptyState, GanttRows, Legend, PageHeader, SegmentedControl, type LegendItem } from '../../components';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { FIELD_GROUP } from '../../domain/vocab';
import { BoardView } from './BoardView';
import { ListView } from './ListView';
import { SEMESTER, timelineOf } from './timeline';

type View = 'timeline' | 'board' | 'list';
const VIEWS: { id: View; label: string }[] = [{ id: 'timeline', label: '타임라인' }, { id: 'board', label: '보드' }, { id: 'list', label: '목록' }];
type Sel = { view: View; focus?: string };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && VIEWS.some(x => x.id === (v as Sel).view);

const LEGEND: LegendItem[] = [
  { label: '준비·대기', mark: 'hatch', tone: 'ink' }, { label: '진행', mark: 'fill', tone: 'ink' }, { label: '끝', mark: 'faded', tone: 'ink' },
  { label: '신청 마감', mark: 'diamond', tone: 'ink' }, { label: '결과 발표', mark: 'circle', tone: 'ink' }, { label: '오늘', mark: 'today' }
];

/** 내 활동 › 일정: 같은 활동을 타임라인·보드·목록으로 바꿔 본다. 보기 전환은 머리의 세그먼트 한 곳에만 둔다. */
export function Schedule() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('activities/schedule', { view: 'timeline' }, isSel);
  const open = (id: string) => { setSel(s => ({ ...s, focus: id })); openEntity({ kind: 'activity', id }); };

  let body;
  if (state.activities.length === 0) {
    body = <Card><EmptyState icon="board" message="추천에서 신청 준비를 누르면 여기에 생겨요." action={<Button variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>} /></Card>;
  } else if (sel.view === 'board') {
    body = <BoardView activities={state.activities} onOpen={open} />;
  } else if (sel.view === 'list') {
    body = <ListView activities={state.activities} onOpen={open} />;
  } else {
    const { rows, undated } = timelineOf(state.activities);
    body = (
      <Card className="act-overview" title="이번 학기">
        <Legend items={LEGEND} />
        <GanttRows label="이번 학기 활동" range={SEMESTER} today={PROTOTYPE_TODAY} rows={rows} selectedId={sel.focus} onSelect={open} empty="날짜가 있는 활동이 아직 없어요. 활동 날짜가 정해지면 막대로 보여요." />
        {undated.length > 0 && (
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
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="일정" actions={state.activities.length > 0 && <SegmentedControl<View> label="보기 방식" value={sel.view} onChange={v => setSel(s => ({ ...s, view: v }))} items={VIEWS} />} />
      {body}
    </>
  );
}
