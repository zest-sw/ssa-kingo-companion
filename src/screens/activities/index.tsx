import { useState } from 'react';
import { PageHeader, SegmentedControl } from '../../components';
import { useApp } from '../../app/AppState';
import { CURRENT_TERM } from '../../data/records';
import { semesterLabel } from '../../domain/interview/archive';
import type { ScreenProps } from '../../app/router';
import { ActivityDrawer } from './ActivityDrawer';
import { BoardView } from './BoardView';
import { ListView } from './ListView';
import './activities.css';

type View = 'board' | 'list';

export default function ActivitiesScreen(_props: ScreenProps) {
  const { state } = useApp();
  const [view, setView] = useState<View>('board');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = state.activities.find(a => a.id === openId);

  return (
    <>
      <PageHeader
        eyebrow={semesterLabel(CURRENT_TERM.semester)}
        title="내 활동"
        actions={<SegmentedControl<View> label="보기 방식" value={view} onChange={setView} items={[{ id: 'board', label: '보드' }, { id: 'list', label: '목록' }]} />}
      />
      {view === 'board' ? <BoardView activities={state.activities} onOpen={setOpenId} /> : <ListView activities={state.activities} onOpen={setOpenId} />}
      <ActivityDrawer a={open} onClose={() => setOpenId(null)} />
    </>
  );
}
