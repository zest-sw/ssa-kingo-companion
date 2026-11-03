import { useEffect, useState } from 'react';
import { Button, EmptyState, Icon, Legend, PageHeader, SegmentedControl, type LegendItem } from '../../components';
import { navigate } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { CURRENT_TERM } from '../../data/records';
import { DashedPic } from '../activities/DashedPic';
import { AddRecordModal } from './AddRecordModal';
import { Archive } from './Archive';
import { mapDots, mapRows, mapTerms } from './map';
import { RecordMap } from './RecordMap';
import { takeMapFocus } from './mapFocus';
import { nextStep } from '../../domain/nextStep';

const LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'ink' }, { label: '직접 입력', mark: 'ring', tone: 'ink' }];

type View = 'map' | 'archive';
const VIEWS: { id: View; label: string }[] = [{ id: 'map', label: '지도' }, { id: 'archive', label: '보관함' }];
type Sel = { view: View; focus?: string };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && VIEWS.some(x => x.id === (v as Sel).view);

/**
 * 내 활동 › 기록(v1.4): 한 번에 하나만. 첫 화면은 기록 지도, 머리의 세그먼트로 보관함(학기별 목록)으로 바꾼다.
 * 지도의 점이나 보관함의 줄을 누르면 기록 서랍(상세)이 열리고, 닫으면 제자리다.
 */
export function Overview() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('activities/records', { view: 'map' }, isSel);
  const [adding, setAdding] = useState(false);
  const pending = state.activities.filter(a => a.status === 'ended');
  const step = nextStep(state.activities);
  const rows = mapRows(state.records);
  const cols = mapTerms(state.records, CURRENT_TERM.semester);

  // 회고를 막 저장하고 왔으면 새 기록의 점을 표시한다.
  useEffect(() => {
    const fresh = takeMapFocus();
    if (fresh) setSel({ view: 'map', focus: fresh });
  }, [setSel]);

  const toRetro = () => navigate(pending.length === 1 ? `activities/records/interview/${pending[0].id}` : 'activities/records/interview');
  const focus = sel.focus && state.records.some(r => r.id === sel.focus) ? sel.focus : undefined;
  const open = (id: string) => { setSel(s => ({ ...s, focus: id })); openEntity({ kind: 'record', id }); };

  return (
    <div className="os">
      <PageHeader
        title="기록"
        actions={
          <>
            {state.records.length > 0 && <SegmentedControl<View> label="보기 방식" value={sel.view} onChange={view => setSel(s => ({ ...s, view }))} items={VIEWS} />}
            <Button icon="plus" onClick={() => setAdding(true)}>직접 기록 추가</Button>
          </>
        }
      />
      {pending.length > 0 && (
        <button type="button" className="rec-band" onClick={toRetro}>
          <Icon name="pencil" size={18} />
          <span className="rec-band__text">회고 쓰기 <b className="num">{pending.length}</b>개 <span className="rec-band__what">{pending.map(a => a.title).join(' · ')}</span></span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      <div className="os__body os__body--fill rec-home">
        {sel.view === 'archive' && state.records.length > 0 ? (
          <Archive records={state.records} selectedId={focus} onOpen={open} />
        ) : (
          <section className={`rm-card${state.records.length === 0 ? ' rm-card--empty' : ''}`} aria-labelledby="rm-title">
            <div className="rm-card__head">
              <h2 id="rm-title" className="rm-card__title">기록 지도</h2>
              <Legend items={LEGEND} />
            </div>
            {state.records.length === 0 ? (
              <EmptyState
                pic={<DashedPic kind="map" labels={rows.map(r => r.label)} cols={cols.map(c => c.label)} />}
                message={`${step.lead} 분야·학기 칸에 점이 찍혀요.`}
                action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>}
              />
            ) : (
              <RecordMap label="기록 지도" rows={rows} cols={cols} items={mapDots(state.records)} selectedId={focus} onSelect={open} />
            )}
          </section>
        )}
      </div>
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
