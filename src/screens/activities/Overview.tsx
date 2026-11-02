import { Button, Card, EmptyState, GanttRows, Legend, PageHeader, SegmentBar, type LegendItem, type Segment } from '../../components';
import { navigate } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { BOARD_COLUMNS } from '../../domain/activities';
import type { BoardColumn } from '../../domain/types';
import { FIELD_GROUP } from '../../domain/vocab';
import { setBoardFocus } from './boardFocus';
import { PROTOTYPE_TODAY } from '../../domain/today';
import { columnCounts, SEMESTER, timelineOf } from './timeline';

const LEGEND: LegendItem[] = [
  { label: '준비·대기', mark: 'hatch', tone: 'ink' }, { label: '진행', mark: 'fill', tone: 'ink' }, { label: '끝', mark: 'faded', tone: 'ink' },
  { label: '신청 마감', mark: 'diamond', tone: 'ink' }, { label: '결과 발표', mark: 'circle', tone: 'ink' }, { label: '오늘', mark: 'today' }
];
// 상태는 분야 색과 겹치지 않는 상태 톤(--state-*)으로 나누고, 막대 안에 이름·개수를 적는다.
const COLUMN_TONE: Record<BoardColumn, Segment['tone']> = { todo: 'todo', doing: 'doing', done: 'done' };

/** 내 활동 L1: 위에 세 칸 요약, 아래에 학기 간트. 조각을 누르면 보드(L2)나 활동 서랍(L3)으로 간다. */
export function Overview() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState('activities', { focus: undefined as string | undefined });
  const { rows, undated } = timelineOf(state.activities);
  const counts = columnCounts(state.activities);

  const open = (id: string) => { setSel({ focus: id }); openEntity({ kind: 'activity', id }); };
  const toBoard = (col: BoardColumn) => { setBoardFocus(col); navigate('activities/board'); };
  const segments: Segment[] = BOARD_COLUMNS.map(c => ({ id: c.id, label: c.label, value: counts[c.id], tone: COLUMN_TONE[c.id] }));

  return (
    <>
      <PageHeader title="내 활동" actions={<Button variant="primary" icon="board" onClick={() => navigate('activities/board')}>보드로 보기</Button>} />
      {state.activities.length === 0 ? (
        <Card><EmptyState icon="board" message="추천에서 신청 준비를 누르면 여기에 생겨요." action={<Button variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>} /></Card>
      ) : (
        <>
          <Card className="act-overview" title="지금 상태" action={<Button size="sm" variant="ghost" icon="chevron" onClick={() => navigate('activities/list')}>목록으로 보기</Button>}>
            <SegmentBar label="활동 상태별 개수" segments={segments} onSelect={id => toBoard(id as BoardColumn)} inline empty="" />
          </Card>
          <Card className="act-overview" title="이번 학기">
            <Legend items={LEGEND} />
            <GanttRows label="이번 학기 활동" range={SEMESTER} today={PROTOTYPE_TODAY} rows={rows} selectedId={sel.focus} onSelect={open} empty="날짜가 있는 활동이 아직 없어요." />
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
        </>
      )}
    </>
  );
}
