import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Drawer, EmptyState, FieldTag, SegmentedControl } from '../../components';
import { recordOfActivity, relatedRecords, TREE_COLUMNS, type TreeCell } from '../../domain/analysis/techtree';
import { josa } from '../../domain/text';
import { ddayText } from '../../domain/text';
import type { RecordItem } from '../../domain/types';
import { DID_LABEL, STATUS_LABEL } from '../../domain/vocab';
import { RecordSummary } from './RecordSummary';
import { TreeGraph } from './TreeGraph';
import { useTechTree } from './useTechTree';

type View = 'graph' | 'list';

export default function TechTreeTab({ records }: { records: RecordItem[] }) {
  const [mode, setMode] = useState<View>('graph');
  const [open, setOpen] = useState<TreeCell | null>(null);
  const tree = useTechTree(records);
  const filled = tree.rows.some(r => r.cells.some(c => c.kind !== 'candidate'));
  // 후보 칸은 어디서 눌러도 같은 기회 서랍이 열린다. 서랍의 '자세히 보기'가 추천 화면으로 간다.
  const toRecommend = (c: TreeCell) => (c.programId ? openEntity({ kind: 'opportunity', id: c.programId }) : navigate('recommend'));

  return (
    <Card
      className="os-card"
      title="활동 지도"
      action={<SegmentedControl<View> label="보기 방식" value={mode} onChange={setMode} items={[{ id: 'graph', label: '그림으로 보기' }, { id: 'list', label: '지금 신청할 수 있는 것만' }]} />}
    >
      {mode === 'graph' ? (
        <>
          <div className="os-scroll">
            {!filled && <p className="an-note an-note--top">아직 한 활동이 없어요. 후보를 눌러 신청을 준비하거나, 끝난 활동의 회고를 써 보세요.</p>}
            <TreeGraph tree={tree} onOpen={setOpen} onCandidate={toRecommend} />
          </div>
          <ul className="an-legend" aria-label="칸 표시">
            <li><span className="an-key an-key--done" aria-hidden="true" />한 활동</li>
            <li><span className="an-key an-key--ongoing" aria-hidden="true" />하는 중</li>
            <li><span className="an-key an-key--candidate" aria-hidden="true" />지금 신청할 수 있는 추천</li>
            <li><span className="an-key an-key--unknown" aria-hidden="true" />?</li><li className="an-legend__sub">아직 안 해 본 분야</li>
            <li><span className="an-key an-key--cross" aria-hidden="true" />다른 분야로 이어진 경로</li>
          </ul>
        </>
      ) : (
        <div className="os-scroll"><CandidateList cells={tree.candidates} onPick={toRecommend} /></div>
      )}
      <CellDrawer cell={open} records={records} onClose={() => setOpen(null)} />
    </Card>
  );
}

function CandidateList({ cells, onPick }: { cells: TreeCell[]; onPick: (c: TreeCell) => void }) {
  if (!cells.length) {
    return <EmptyState icon="compass" message="지금 신청할 수 있는 활동이 없어요. 관심 분야나 시간을 바꾸면 후보가 생겨요." action={<Button variant="primary" onClick={() => navigate('home')}>홈에서 확인하기</Button>} />;
  }
  return (
    <ul className="an-cands">
      {cells.map(c => (
        <li key={c.id}>
          <button type="button" className="an-cand" aria-haspopup="dialog" onClick={() => onPick(c)}>
            <span className="an-cand__main">
              <b>{c.label}</b>
              <span className="an-cand__sub"><FieldTag field={c.field} />{TREE_COLUMNS[c.col]}</span>
            </span>
            {c.dday !== undefined && <Badge tone="orange">{ddayText(c.dday)}</Badge>}
            <span className="an-cand__go">자세히</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CellDrawer({ cell, records, onClose }: { cell: TreeCell | null; records: RecordItem[]; onClose: () => void }) {
  const { state } = useApp();
  const record = cell?.recordId ? records.find(r => r.id === cell.recordId) : undefined;
  const activity = cell?.activityId ? state.activities.find(a => a.id === cell.activityId) : undefined;
  // 같은 분야 줄에서 이 칸과 이어진 다른 기록
  const related = record ? relatedRecords(records, record) : [];
  const written = activity ? recordOfActivity(records, activity) : undefined;
  const column = TREE_COLUMNS[cell?.col ?? 0];
  return (
    <Drawer open={!!cell} onClose={onClose} eyebrow={cell ? `한 활동 · ${column}` : undefined} title={cell?.label ?? ''}>
      {record && (
        <>
          <RecordSummary record={record} />
          <h3 className="an-sub">이 칸에 놓인 이유</h3>
          <p>‘{DID_LABEL[record.did]}’{josa(DID_LABEL[record.did], '을', '를')} 주로 한 기록이라 ‘{column}’ 칸에 놓았어요.</p>
          <h3 className="an-sub">같은 분야의 다른 기록</h3>
          {related.length ? <div className="an-stack">{related.map(r => <RecordSummary key={r.id} record={r} />)}</div> : <p className="an-muted">같은 분야 기록이 아직 하나예요. 회고를 더 쓰면 이어져요.</p>}
        </>
      )}
      {activity && (
        <>
          <p className="an-rec__meta"><FieldTag field={activity.field} /> · {STATUS_LABEL[activity.status]}</p>
          <p>{activity.schedule}</p>
          <h3 className="an-sub">근거</h3>
          {written ? <RecordSummary record={written} /> : (
            <>
              <p className="an-muted">아직 회고가 없어요. 회고를 쓰면 한 일과 배운 점이 이 칸의 근거가 돼요.</p>
              <Button variant="primary" onClick={() => navigate('activities/records')}>회고 쓰러 가기</Button>
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
