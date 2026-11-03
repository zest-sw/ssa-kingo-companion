import { useEffect, useState } from 'react';
import { Button, Card, DotGrid, Icon, Legend, PageHeader, type LegendItem } from '../../components';
import { navigate } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { CURRENT_TERM } from '../../data/records';
import { AddRecordModal } from './AddRecordModal';
import { Archive } from './Archive';
import { mapDots, mapRows, mapTerms } from './map';
import { takeMapFocus } from './mapFocus';

const LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'ink' }, { label: '직접 입력', mark: 'ring', tone: 'ink' }];

/** 내 활동 › 기록: 회고 대기 띠 한 줄 + 기록 지도 + 보관함. 점·카드를 누르면 같은 기록 서랍이 열린다. */
export function Overview() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState('activities/records', { focus: undefined as string | undefined });
  const [adding, setAdding] = useState(false);
  const pending = state.activities.filter(a => a.status === 'ended');

  // 회고를 막 저장하고 왔으면 새 기록의 점을 표시한다.
  useEffect(() => {
    const fresh = takeMapFocus();
    if (fresh) setSel({ focus: fresh });
  }, [setSel]);

  const toRetro = () => navigate(pending.length === 1 ? `activities/records/interview/${pending[0].id}` : 'activities/records/interview');
  const open = (id: string) => { setSel({ focus: id }); openEntity({ kind: 'record', id }); };

  return (
    <>
      <PageHeader title="기록" actions={<Button icon="plus" onClick={() => setAdding(true)}>직접 기록 추가</Button>} />
      {pending.length > 0 && (
        <button type="button" className="rec-band" onClick={toRetro}>
          <Icon name="pencil" size={18} />
          <span className="rec-band__text">회고 쓰기 <b className="num">{pending.length}</b>개</span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      <Card title="기록 지도">
        <Legend items={LEGEND} />
        <DotGrid
          label="기록 지도"
          rows={mapRows(state.records)}
          cols={mapTerms(state.records, CURRENT_TERM.semester)}
          items={mapDots(state.records)}
          selectedId={sel.focus && state.records.some(r => r.id === sel.focus) ? sel.focus : undefined}
          onSelect={open}
          empty={pending.length ? '위의 회고 쓰기를 누르면 첫 기록이 점으로 생겨요.' : '아직 기록이 없어요. 활동이 끝나면 회고를 써서 점을 채워 보세요.'}
        />
      </Card>
      <Archive />
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
