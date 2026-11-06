import { useEffect, useState } from 'react';
import { Button, EmptyState, GhostPic, Legend, PageHeader, SectionTabs, SegmentedControl, TermNav, type LegendItem } from '../../components';
import { navigate, sectionTabs } from '../../app/router';
import { openEntity } from '../../app/entity';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { CURRENT_TERM } from '../../data/records';
import { AddRecordModal } from './AddRecordModal';
import { RetroBand } from './RetroBand';
import { Archive } from './Archive';
import { mapDots, mapRows, mapTerms, splitMapRows } from './map';
import { RecordMap } from './RecordMap';
import { takeMapFocus } from './mapFocus';
import { nextStep } from '../../domain/nextStep';
import { stepWindow, termWindow } from '../../domain/analysis/window';

const LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'ink' }, { label: '직접 입력', mark: 'ring', tone: 'ink' }];

type View = 'map' | 'archive';
const VIEWS: { id: View; label: string }[] = [{ id: 'map', label: '지도' }, { id: 'archive', label: '보관함' }];
type Sel = { view: View; focus?: string };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && VIEWS.some(x => x.id === (v as Sel).view);

/**
 * 내 활동 › 기록(v1.4): 한 번에 하나만. 첫 화면은 기록 지도, 카드 머리 오른쪽 세그먼트로 보관함(학기별 목록)으로 바꾼다.
 * 지도의 점이나 보관함의 줄을 누르면 기록 서랍(상세)이 열리고, 닫으면 제자리다.
 */
export function Overview() {
  const { state } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('activities/records', { view: 'map' }, isSel);
  const [adding, setAdding] = useState(false);
  const pending = state.activities.filter(a => a.status === 'ended');
  const step = nextStep(state.activities);
  const rows = mapRows(state.records);
  // 학기가 많이 쌓이면 최근 몇 학기만 그리고 앞 학기는 넘겨서 본다(칸이 좁아져 이름이 부서지지 않게).
  const [end, setEnd] = useState<number | undefined>(undefined);
  const win = termWindow(mapTerms(state.records, CURRENT_TERM.semester), undefined, end);
  const cols = win.shown;
  const inView = new Set(cols.map(c => c.id));
  const viewRecords = state.records.filter(r => inView.has(r.semester));
  const { drawn, empty } = splitMapRows(viewRecords);

  // 회고를 막 저장하고 왔으면 새 기록의 점을 표시한다.
  useEffect(() => {
    const fresh = takeMapFocus();
    if (fresh) setSel({ view: 'map', focus: fresh });
  }, [setSel]);

  const focus = sel.focus && state.records.some(r => r.id === sel.focus) ? sel.focus : undefined;
  // 보기 전환은 카드 머리 오른쪽 한 곳(일정과 같은 자리). 페이지 머리 아래 탭 줄은 구역 탭 하나뿐이다.
  const switcher = state.records.length > 0 && <SegmentedControl<View> label="보기 방식" value={sel.view} onChange={view => setSel(s => ({ ...s, view }))} items={VIEWS} />;
  const open = (id: string) => { setSel(s => ({ ...s, focus: id })); openEntity({ kind: 'record', id }); };

  return (
    <div className="os">
      <PageHeader
        title="기록"
        tabs={<SectionTabs {...sectionTabs('activities', 'activities/records')} />}
        actions={<Button icon="plus" onClick={() => setAdding(true)}>직접 기록 추가</Button>}
      />
      {pending.length > 0 && <RetroBand items={pending} />}
      <div className="os__body os__body--fill rec-home">
        {sel.view === 'archive' && state.records.length > 0 ? (
          <Archive records={state.records} selectedId={focus} onOpen={open} switcher={switcher} />
        ) : (
          <section className={`rm-card${state.records.length === 0 ? ' rm-card--empty' : ''}`} aria-labelledby="rm-title">
            <div className="rm-card__head">
              <h2 id="rm-title" className="rm-card__title">기록 지도</h2>
              <TermNav range={cols.length ? `${cols[0].label} ~ ${cols[cols.length - 1].label}` : ''} before={win.before} after={win.after} onPrev={() => setEnd(stepWindow(win, -1))} onNext={() => setEnd(stepWindow(win, 1))} />
              <Legend items={LEGEND} place="head" />
              {switcher}
            </div>
            {state.records.length === 0 ? (
              <EmptyState
                pic={<GhostPic kind="branches" labels={rows.map(r => r.label)} cols={cols.map(c => c.label)} />}
                message={`${step.lead} 분야별 점이 찍혀요.`}
                action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>}
              />
            ) : (
              <RecordMap label="기록 지도" rows={drawn} empty={empty} emptyLabel={win.before + win.after > 0 ? '이 기간에 기록이 없는 분야' : undefined} cols={cols} items={mapDots(viewRecords)} selectedId={focus} onSelect={open} />
            )}
          </section>
        )}
      </div>
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
