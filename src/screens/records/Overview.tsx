import { useEffect, useState } from 'react';
import { Button, Card, DotGrid, Icon, Legend, PageHeader, type LegendItem } from '../../components';
import { navigate } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { CURRENT_TERM } from '../../data/records';
import { AddRecordModal } from './AddRecordModal';
import { mapDots, mapRows, mapTerms } from './map';
import { takeMapFocus } from './mapFocus';

const LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'ink' }, { label: '직접 입력', mark: 'ring', tone: 'ink' }];

/** 기록 L1: 회고 대기 띠 한 줄 + 기록 지도. 점을 누르면 기록 카드 서랍이 열린다. */
export function Overview() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState('records', { focus: undefined as string | undefined });
  const [adding, setAdding] = useState(false);
  const pending = state.activities.filter(a => a.status === 'ended');

  // 회고를 막 저장하고 '기록 지도에서 보기'로 왔으면 새 기록의 점을 표시한다.
  useEffect(() => {
    const fresh = takeMapFocus();
    if (fresh) setSel({ focus: fresh });
  }, [setSel]);

  const toRetro = () => navigate(pending.length === 1 ? `records/interview/${pending[0].id}` : 'records/interview');
  const open = (id: string) => { setSel({ focus: id }); openEntity({ kind: 'record', id }); };

  return (
    <>
      <PageHeader title="기록" actions={<Button variant="primary" icon="records" onClick={() => navigate('records/archive')}>보관함 보기</Button>} />
      {pending.length > 0 && (
        <button type="button" className="rec-band" onClick={toRetro}>
          <Icon name="pencil" size={18} />
          <span className="rec-band__text">회고 쓰기 <b className="num">{pending.length}</b>개</span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      <Card title="기록 지도" action={<Button size="sm" variant="ghost" icon="plus" onClick={() => setAdding(true)}>직접 기록 추가</Button>}>
        <Legend items={LEGEND} />
        <DotGrid
          label="기록 지도"
          rows={mapRows(state.records)}
          cols={mapTerms(state.records, CURRENT_TERM.semester)}
          items={mapDots(state.records)}
          selectedId={sel.focus && state.records.some(r => r.id === sel.focus) ? sel.focus : undefined}
          onSelect={open}
          empty="아직 기록이 없어요. 끝난 활동의 회고를 쓰면 점이 생겨요."
        />
      </Card>
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
