import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { Button, EmptyState, FieldTag, Funnel, Modal } from '../../components';
import { CATALOG } from '../../data/catalog';
import { funnelDrops, STEP_IDS, STEP_LABEL, type StepId } from '../../domain/recommend-flow/drops';
import { effectiveChoices } from '../../domain/recommend-flow/flow';
import { pickingLine } from '../../domain/recommend-flow/summary';
import type { Program } from '../../domain/types';


/** 어떻게 골랐나: 거르기 단계별 개수(깔때기)와, 단계를 누르면 거기서 빠진 활동. 빠진 활동을 누르면 그 기회 자세히가 열린다. */
export function HowPicked({ open, onClose, onOpen }: { open: boolean; onClose: () => void; onOpen: (p: Program) => void }) {
  const { state, view } = useApp();
  const [sel, setSel] = useState<{ step: StepId | null }>({ step: null });
  const f = view.funnel;
  const drops = useMemo(() => funnelDrops({
    programs: CATALOG.programs, week: state.week, time: state.profile.time, format: state.profile.format,
    doneIds: state.records.map(r => r.programId).filter((x): x is string => !!x),
    excluded: Object.keys(effectiveChoices(state.choices, state.laterUntil, state.week))
  }), [state.week, state.profile.time, state.profile.format, state.records, state.choices, state.laterUntil]);
  const counts: Record<StepId, number> = { pool: f.pool, open: f.open, eligible: f.eligible, fit: f.fit, fresh: f.fresh };
  const steps = STEP_IDS.map(id => ({ id, label: STEP_LABEL[id], count: counts[id] }));
  const dropped = sel.step ? drops[sel.step] : [];

  return (
    <Modal open={open} size="wide" eyebrow="어떻게 골랐나" title={pickingLine(f)} onClose={onClose} actions={<Button onClick={onClose}>닫기</Button>}>
      <Funnel label="추천을 고른 방법" steps={steps} selectedId={sel.step ?? undefined} onSelect={id => setSel({ step: id as StepId })} empty="이번 주에 모집 중인 활동이 아직 없어요. 다음 주에 다시 볼게요." />
      {sel.step === null ? (
        <p className="rec-muted rec-drops__hint">단계를 누르면 거기서 빠진 활동을 볼 수 있어요.</p>
      ) : dropped.length === 0 ? (
        <EmptyState message={`‘${STEP_LABEL[sel.step]}’ 단계에서 빠진 활동이 없어요. 모두 다음 단계로 갔어요.`} />
      ) : (
        <ul className="rec-drops">
          {dropped.map(({ p, why }) => (
            <li key={p.id}>
              <button type="button" className="rec-drop" onClick={() => onOpen(p)}>
                <FieldTag field={p.field} />
                <b>{p.title}</b>
                <span>{why}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
