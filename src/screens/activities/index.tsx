import { PageHeader, SegmentedControl } from '../../components';
import { navigate, l1Of, type ScreenProps } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { BoardView } from './BoardView';
import { ListView } from './ListView';
import { Overview } from './Overview';
import './ActivityEntity';
import './activities.css';

type View = 'board' | 'list';

const open = (id: string) => openEntity({ kind: 'activity', id });

/** 하위 경로: (없음) = 개요(L1), board = 보드, list = 목록. 활동 서랍은 어디서든 openEntity 로 연다. */
export default function ActivitiesScreen({ sub }: ScreenProps) {
  if (sub === 'board' || sub === 'list') return <Detail view={sub} />;
  return <Overview />;
}

function Detail({ view }: { view: View }) {
  const { state } = useApp();
  return (
    <>
      <PageHeader
        parent={l1Of('activities')}
        crumb={view === 'board' ? '보드' : '목록'}
        title={view === 'board' ? '활동 보드' : '활동 목록'}
        actions={<SegmentedControl<View> label="보기 방식" value={view} onChange={v => navigate(`activities/${v}`, { replace: true })} items={[{ id: 'board', label: '보드' }, { id: 'list', label: '목록' }]} />}
      />
      {view === 'board' ? <BoardView activities={state.activities} onOpen={open} /> : <ListView activities={state.activities} onOpen={open} />}
    </>
  );
}
