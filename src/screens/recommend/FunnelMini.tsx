import { STEP_IDS, STEP_LABEL, type StepId } from '../../domain/recommend-flow/drops';
import type { Funnel } from '../../domain/types';

/** 고른 방법: 단계별 막대 + 개수를 작게. 누르면 서랍이 열려 빠진 활동을 볼 수 있다. */
export function FunnelMini({ funnel, onOpen }: { funnel: Funnel; onOpen: () => void }) {
  const counts: Record<StepId, number> = { pool: funnel.pool, open: funnel.open, eligible: funnel.eligible, fit: funnel.fit, fresh: funnel.fresh };
  const max = Math.max(1, funnel.pool);
  const summary = STEP_IDS.map(id => `${STEP_LABEL[id]} ${counts[id]}개`).join(', ');
  return (
    <button type="button" className="rec-fn" onClick={onOpen} aria-haspopup="dialog" aria-label={`고른 방법 보기. ${summary}`}>
      <span className="rec-fn__title">고른 방법</span>
      <span className="rec-fn__steps" aria-hidden="true">
        {STEP_IDS.map(id => (
          <span key={id} className="rec-fn__step">
            <span className="rec-fn__lab">{STEP_LABEL[id]} <b className="num">{counts[id]}</b></span>
            <span className="rec-fn__bar"><i data-last={id === 'fresh'} style={{ width: `${Math.max(counts[id] / max, counts[id] > 0 ? 0.06 : 0) * 100}%` }} /></span>
          </span>
        ))}
      </span>
    </button>
  );
}
