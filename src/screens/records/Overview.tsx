import { useEffect, useState } from 'react';
import { Button, Icon, Legend, PageHeader, type LegendItem } from '../../components';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';
import { useOverviewState } from '../../app/useOverviewState';
import { CURRENT_TERM } from '../../data/records';
import { AddRecordModal } from './AddRecordModal';
import { Archive } from './Archive';
import { mapDots, mapRows, mapTerms } from './map';
import { RecordMap } from './RecordMap';
import { recordHeadline } from '../activities/summary';
import { takeMapFocus } from './mapFocus';

const LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'ink' }, { label: '직접 입력', mark: 'ring', tone: 'ink' }];

/**
 * 내 활동 › 기록(1440×900 스크롤 없음): 머리 → 회고 대기 띠 한 줄 → 왼쪽 기록 지도(주인공) + 오른쪽 보관함(이 칸만 스크롤).
 * 지도의 점을 누르면 보관함에서 그 기록이 펼쳐지고, 줄의 '자세히'가 기록 서랍을 연다.
 */
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
  const focus = sel.focus && state.records.some(r => r.id === sel.focus) ? sel.focus : undefined;

  return (
    <div className="os">
      <PageHeader
        title="기록"
        actions={
          <>
            <span className="rec-headline">{recordHeadline(state.records)}</span>
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
        <section className="rm-card" aria-labelledby="rm-title">
          <div className="rm-card__head">
            <h2 id="rm-title" className="rm-card__title">기록 지도</h2>
            <Legend items={LEGEND} />
          </div>
          <RecordMap
            label="기록 지도"
            rows={mapRows(state.records)}
            cols={mapTerms(state.records, CURRENT_TERM.semester)}
            items={mapDots(state.records)}
            selectedId={focus}
            onSelect={id => setSel({ focus: focus === id ? undefined : id })}
            empty={pending.length ? '위의 회고 쓰기를 누르면 첫 기록이 점으로 생겨요.' : '아직 기록이 없어요. 활동이 끝나면 회고를 써서 점을 채워 보세요.'}
          />
        </section>
        <Archive records={state.records} selectedId={focus} onSelect={id => setSel({ focus: id })} />
      </div>
      <AddRecordModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
