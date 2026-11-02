import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Drawer, EmptyState, FieldTag, Funnel, PageHeader } from '../../components';
import { CATALOG } from '../../data/catalog';
import { ddayOf } from '../../domain/recommend';
import { funnelDrops, isStepId, STEP_IDS, STEP_LABEL, type StepId } from '../../domain/recommend-flow/drops';
import { effectiveChoices, emptyReason } from '../../domain/recommend-flow/flow';
import { setListIntent } from '../../domain/recommend-flow/intent';
import { ddayText } from '../../domain/text';
import type { Program } from '../../domain/types';
import { TopPick } from './TopPick';

type Sel = { step: StepId | null };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && (('step' in v) && ((v as Sel).step === null || isStepId((v as Sel).step)));

type Props = { onPrepare: (p: Program) => void; onOpenLater: () => void };

/** 추천 L1: 가장 추천 하나, 고른 방법 깔때기, 대안 행. 긴 글은 상세(L2)로 보낸다. */
export function Overview({ onPrepare, onOpenLater }: Props) {
  const { state, view } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('recommend', { step: null }, isSel);
  const f = view.funnel;
  // 서랍은 눌렀을 때만 열고, 마지막으로 본 단계는 L2 에 갔다 돌아와도 막대에 표시가 남는다.
  const [open, setOpen] = useState(false);

  const drops = useMemo(() => funnelDrops({
    programs: CATALOG.programs, week: state.week, time: state.profile.time, format: state.profile.format,
    doneIds: state.records.map(r => r.programId).filter((x): x is string => !!x),
    excluded: Object.keys(effectiveChoices(state.choices, state.laterUntil, state.week))
  }), [state.week, state.profile.time, state.profile.format, state.records, state.choices, state.laterUntil]);

  const counts: Record<StepId, number> = { pool: f.pool, open: f.open, eligible: f.eligible, fit: f.fit, fresh: f.fresh };
  const steps = STEP_IDS.map(id => ({ id, label: STEP_LABEL[id], count: counts[id] }));
  const shown = sel.step ? drops[sel.step] : [];

  const toList = (select?: string) => { setListIntent({ select }); navigate('recommend/list'); };

  return (
    <>
      <PageHeader title="추천" actions={<Button variant="primary" icon="chevron" onClick={() => toList()}>후보 모두 보기</Button>} />
      <div className="rec-l1">
        <Card className="rec-l1__top" aria-label="가장 추천">
          {view.primary ? (
            <TopPick pick={view.primary} week={state.week} onPrepare={() => onPrepare(view.primary!.p)} />
          ) : (
            <EmptyState icon="compass" title="지금 추천할 활동이 없어요" message={emptyReason(f)} action={<Button variant="primary" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button>} />
          )}
        </Card>
        <Card className="rec-l1__funnel" title="고른 방법">
          <Funnel
            label="추천을 고른 방법"
            steps={steps}
            selectedId={sel.step ?? undefined}
            onSelect={id => { setSel({ step: id as StepId }); setOpen(true); }}
            empty="이번 주에 모집 중인 활동이 아직 없어요."
          />
        </Card>
      </div>

      <Card padding="md" className="rec-alts" aria-label="다른 대안">
        <b className="rec-alts__title">다른 대안</b>
        {view.alternatives.length === 0 ? (
          <span className="rec-muted">대안이 아직 없어요. 나중에 보기에 둔 활동을 다시 볼 수 있어요.</span>
        ) : (
          <ul className="rec-alts__list">
            {view.alternatives.map(a => (
              <li key={a.p.id}>
                <button type="button" className="rec-alt" onClick={() => toList(a.p.id)}>
                  <FieldTag field={a.p.field} />
                  {a.p.title}<span className="rec-alt__d num">{ddayText(ddayOf(a.p, state.week))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {view.later.length > 0 && <Button variant="ghost" className="rec-alts__go" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button>}
      </Card>

      <Drawer open={open && sel.step !== null} eyebrow="고른 방법" title={sel.step ? `‘${STEP_LABEL[sel.step]}’ 단계에서 빠진 것` : ''} onClose={() => setOpen(false)}>
        {shown.length === 0 ? (
          <EmptyState message="이 단계에서 빠진 활동이 없어요. 모두 다음 단계로 갔어요." action={<Button size="sm" onClick={() => toList()}>후보 목록 보기</Button>} />
        ) : (
          <ul className="rec-drops">
            {shown.map(({ p, why }) => (
              <li key={p.id}>
                <button type="button" className="rec-drop" onClick={() => { setOpen(false); openEntity({ kind: 'opportunity', id: p.id }); }}>
                  <FieldTag field={p.field} />
                  <b>{p.title}</b>
                  <span>{why}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}
