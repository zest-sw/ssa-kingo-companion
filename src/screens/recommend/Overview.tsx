import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Chip, Drawer, EmptyState, FieldTag, Funnel, PageHeader } from '../../components';
import { CATALOG } from '../../data/catalog';
import { filterLabels, isEmptyFilter, matchesAsk, withoutKey, type AskFilter } from '../../domain/recommend-flow/ask';
import { funnelDrops, isStepId, STEP_IDS, STEP_LABEL, type StepId } from '../../domain/recommend-flow/drops';
import { effectiveChoices, emptyReason } from '../../domain/recommend-flow/flow';
import { pickingLine } from '../../domain/recommend-flow/summary';
import { takeListIntent, type ListIntent } from '../../domain/recommend-flow/intent';
import type { Field } from '../../domain/types';
import type { CardActions } from './actions';
import { CandidateCard } from './CandidateCard';
import { CandidateList } from './CandidateList';
import { CompareView } from './CompareView';

type Sel = { step: StepId | null };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && (('step' in v) && ((v as Sel).step === null || isStepId((v as Sel).step)));
type Mode = 'detail' | 'table';

type Props = { actions: CardActions; onOpenLater: () => void };

/**
 * ① 고르기: 왼쪽 후보 목록(행마다 제목·분야·D-n), 오른쪽 고른 후보의 짧은 카드. 고른 방법 깔때기는 서랍, 비교 표는 보조 보기로 접어 둔다.
 * 홈의 질문은 필터 칩으로 들어온다. 후보 자세히는 #/recommend/<id>.
 */
export function Overview({ actions, onOpenLater }: Props) {
  const { state, view } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('recommend', { step: null }, isSel);
  const f = view.funnel;
  // 서랍은 눌렀을 때만 열고, 마지막으로 본 단계는 다녀와도 막대에 표시가 남는다.
  const [funnelOpen, setFunnelOpen] = useState(false);
  // 홈이 넘긴 값은 처음 한 번만 읽는다.
  const [intent] = useState<ListIntent>(() => takeListIntent() ?? {});
  const [filter, setFilter] = useState<AskFilter>(intent.filter ?? {});
  const [mode, setMode] = useState<Mode>(intent.view ?? 'detail');
  const [picked, setPicked] = useState<string | undefined>(intent.select);

  const drops = useMemo(() => funnelDrops({
    programs: CATALOG.programs, week: state.week, time: state.profile.time, format: state.profile.format,
    doneIds: state.records.map(r => r.programId).filter((x): x is string => !!x),
    excluded: Object.keys(effectiveChoices(state.choices, state.laterUntil, state.week))
  }), [state.week, state.profile.time, state.profile.format, state.records, state.choices, state.laterUntil]);
  const counts: Record<StepId, number> = { pool: f.pool, open: f.open, eligible: f.eligible, fit: f.fit, fresh: f.fresh };
  const steps = STEP_IDS.map(id => ({ id, label: STEP_LABEL[id], count: counts[id] }));
  const dropped = sel.step ? drops[sel.step] : [];

  const tried = useMemo(() => new Set<Field>(state.records.map(r => r.field)), [state.records]);
  const filtering = !isEmptyFilter(filter);
  const matched = useMemo(() => view.scored.filter(s => matchesAsk(s.p, filter, tried)), [view.scored, filter, tried]);
  // 가장 추천이 맨 위. 필터가 있으면 맞는 것만.
  const list = useMemo(() => {
    const base = filtering ? matched : view.scored;
    const top = base.find(s => s.p.id === view.primary?.p.id);
    return top ? [top, ...base.filter(s => s !== top)] : base;
  }, [filtering, matched, view.scored, view.primary]);
  // 처음 열면 가장 추천이 골라진 상태다.
  const current = list.find(s => s.p.id === picked) ?? list[0];

  const none = view.scored.length === 0;

  let body;
  if (none) {
    body = (
      <Card className="rec-empty" aria-label="추천 후보">
        <EmptyState icon="compass" title="지금 추천할 활동이 없어요" message={emptyReason(f)} action={<Button variant="primary" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button>} />
      </Card>
    );
  } else if (mode === 'table') {
    body = <CompareView scored={filtering ? matched : view.scored} week={state.week} records={state.records} interests={state.profile.interests} activities={state.activities} actions={actions} />;
  } else if (list.length === 0) {
    body = (
      <Card className="rec-empty">
        <EmptyState icon="compass" message="이 조건에 맞는 후보가 없어요. 조건을 빼면 더 보여요." action={<Button variant="primary" onClick={() => setFilter({})}>조건 모두 빼기</Button>} />
      </Card>
    );
  } else {
    body = (
      <div className="os__body os__body--fill rec-split">
        <CandidateList list={list} currentId={current?.p.id} week={state.week} onPick={setPicked} heading={filtering ? `맞는 후보 ${list.length}개` : `후보 ${list.length}개`} />
        {current && <CandidateCard key={current.p.id} pick={current} isPrimary={current.p.id === view.primary?.p.id} week={state.week} records={state.records} actions={actions} />}
      </div>
    );
  }

  return (
    <div className="os">
      <PageHeader
        title="추천"
        actions={
          <>
            {view.later.length > 0 && <Button variant="ghost" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button>}
            {!none && <Button variant="ghost" onClick={() => setFunnelOpen(true)} aria-haspopup="dialog">고른 방법</Button>}
            {!none && <Button variant="ghost" aria-pressed={mode === 'table'} onClick={() => setMode(mode === 'table' ? 'detail' : 'table')}>{mode === 'table' ? '목록으로' : '비교 표'}</Button>}
          </>
        }
      />
      {filtering && (
        <div className="rec-filter" role="group" aria-label="걸러 본 조건">
          {filterLabels(filter).map(c => <Chip key={c.key} selected icon="x" aria-label={`${c.label} 조건 빼기`} onClick={() => setFilter(withoutKey(filter, c.key))}>{c.label}</Chip>)}
          <Button size="sm" variant="ghost" onClick={() => setFilter({})}>조건 모두 빼기</Button>
        </div>
      )}
      {body}

      <Drawer open={funnelOpen} eyebrow="고른 방법" title={pickingLine(f)} onClose={() => setFunnelOpen(false)}>
        <Funnel
          label="추천을 고른 방법" steps={steps} selectedId={sel.step ?? undefined}
          onSelect={id => setSel({ step: id as StepId })}
          empty="이번 주에 모집 중인 활동이 아직 없어요. 다음 주에 다시 볼게요."
        />
        {sel.step === null ? (
          <p className="rec-muted rec-drops__hint">단계를 누르면 거기서 빠진 활동을 볼 수 있어요.</p>
        ) : dropped.length === 0 ? (
          <EmptyState message={`‘${STEP_LABEL[sel.step]}’ 단계에서 빠진 활동이 없어요. 모두 다음 단계로 갔어요.`} />
        ) : (
          <ul className="rec-drops">
            {dropped.map(({ p, why }) => (
              <li key={p.id}>
                <button type="button" className="rec-drop" onClick={() => { setFunnelOpen(false); openEntity({ kind: 'opportunity', id: p.id }); }}>
                  <FieldTag field={p.field} />
                  <b>{p.title}</b>
                  <span>{why}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </div>
  );
}
