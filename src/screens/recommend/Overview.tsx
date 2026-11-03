import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Badge, Button, Card, Chip, Drawer, EmptyState, FieldTag, Funnel, Icon, PageHeader, SegmentedControl } from '../../components';
import { CATALOG } from '../../data/catalog';
import { ddayOf } from '../../domain/recommend';
import { filterLabels, isEmptyFilter, matchesAsk, withoutKey, type AskFilter } from '../../domain/recommend-flow/ask';
import { funnelDrops, isStepId, STEP_IDS, STEP_LABEL, type StepId } from '../../domain/recommend-flow/drops';
import { effectiveChoices, emptyReason, isNearDeadline } from '../../domain/recommend-flow/flow';
import { pickingLine } from '../../domain/recommend-flow/summary';
import { takeListIntent, type ListIntent } from '../../domain/recommend-flow/intent';
import { ddayText } from '../../domain/text';
import type { Field } from '../../domain/types';
import { CandidateDetail, type CardActions } from './CandidateDetail';
import { CompareView } from './CompareView';
import { TopPick } from './TopPick';

type Sel = { step: StepId | null };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && (('step' in v) && ((v as Sel).step === null || isStepId((v as Sel).step)));
type Mode = 'detail' | 'table';
const MODES: { id: Mode; label: string }[] = [{ id: 'detail', label: '목록·상세' }, { id: 'table', label: '비교 표' }];

type Props = { selectId?: string; actions: CardActions; onOpenLater: () => void };

/**
 * 추천 한 화면: 가장 추천 1개 + 고른 방법, 그 아래 나머지 후보 목록-상세. 비교 표는 같은 후보를 다르게 보는 보기 전환이다.
 * 홈의 질문은 필터 칩으로, '#/recommend/<id>' 는 그 후보를 고른 채로 들어온다.
 */
export function Overview({ selectId, actions, onOpenLater }: Props) {
  const { state, view } = useApp();
  const [sel, setSel] = useOverviewState<Sel>('recommend', { step: null }, isSel);
  const f = view.funnel;
  // 서랍은 눌렀을 때만 열고, 마지막으로 본 단계는 다녀와도 막대에 표시가 남는다.
  const [funnelOpen, setFunnelOpen] = useState(false);
  // 홈이 넘긴 값은 처음 한 번만 읽는다.
  const [intent] = useState<ListIntent>(() => takeListIntent() ?? {});
  const [filter, setFilter] = useState<AskFilter>(intent.filter ?? {});
  const [mode, setMode] = useState<Mode>(intent.view ?? 'detail');
  const [picked, setPicked] = useState<string | undefined>(selectId ?? intent.select);

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
  // 필터가 없으면 가장 추천은 위 카드에 있으니 목록에는 나머지만 둔다.
  const list = filtering ? matched : view.scored.filter(s => s.p.id !== view.primary?.p.id);
  const current = list.find(s => s.p.id === picked) ?? list[0];
  const missing = selectId !== undefined && !view.scored.some(s => s.p.id === selectId);

  // '#/recommend/<id>' 로 다른 후보를 골라 왔으면 그 상세가 보이게 내린다(앱 틀이 맨 위로 올린 뒤에).
  useEffect(() => {
    if (!selectId || current?.p.id !== selectId) return;
    const id = requestAnimationFrame(() => document.getElementById('rec-others')?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(id);
  }, []);

  const none = view.scored.length === 0;
  const head = (
    <PageHeader
      title="추천"
      actions={
        <>
          {view.later.length > 0 && <Button variant="ghost" onClick={onOpenLater}>나중에 보기 <Badge>{view.later.length}</Badge></Button>}
          {!none && <SegmentedControl label="보기 전환" items={MODES} value={mode} onChange={setMode} />}
        </>
      }
    />
  );

  // 고른 방법은 문장 한 줄. 누르면 깔때기 그림이 서랍으로 열린다.
  const picking = (
    <button type="button" className="rec-picking" onClick={() => setFunnelOpen(true)} aria-haspopup="dialog">
      <span>{pickingLine(f)}</span>
      <span className="rec-picking__more">어떻게 골랐나요<Icon name="chevron" size={16} /></span>
    </button>
  );

  let body;
  if (none) {
    body = (
      <div className="rec-l1">
        <Card className="rec-l1__top" aria-label="가장 추천">
          <EmptyState icon="compass" title="지금 추천할 활동이 없어요" message={emptyReason(f)} action={<Button variant="primary" onClick={() => navigate('settings/profile')}>관심 분야·시간 바꾸기</Button>} />
        </Card>
        {picking}
      </div>
    );
  } else if (mode === 'table') {
    body = <CompareView scored={filtering ? matched : view.scored} week={state.week} records={state.records} interests={state.profile.interests} activities={state.activities} actions={actions} />;
  } else {
    body = (
      <>
        {!filtering && view.primary && (
          <div className="rec-l1">
            <Card className="rec-l1__top" aria-label="가장 추천">
              <TopPick pick={view.primary} week={state.week} onPrepare={() => actions.onPrepare(view.primary!.p)} />
            </Card>
            {picking}
          </div>
        )}
        <section id="rec-others" className="rec-others" aria-labelledby="rec-others-title">
          <h2 id="rec-others-title" className="rec-others__title">{filtering ? `맞는 후보 ${list.length}개` : `다른 후보 ${list.length}개`}</h2>
          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon="compass"
                message={filtering ? '이 조건에 맞는 후보가 없어요. 조건을 빼면 더 보여요.' : '다른 후보가 아직 없어요. 나중에 보기에 둔 활동은 위에서 다시 볼 수 있어요.'}
                action={filtering ? <Button variant="primary" onClick={() => setFilter({})}>조건 모두 빼기</Button> : undefined}
              />
            </Card>
          ) : (
            <div className="rec-split">
              <ul className="rec-cands" aria-label={`후보 ${list.length}개`}>
                {list.map(s => {
                  const d = ddayOf(s.p, state.week);
                  return (
                    <li key={s.p.id}>
                      <button type="button" className="rec-cand" aria-pressed={current?.p.id === s.p.id} onClick={() => setPicked(s.p.id)}>
                        <span className="rec-cand__title">{s.p.title}</span>
                        <span className="rec-cand__meta">
                          <FieldTag field={s.p.field} />
                          {s.p.id === view.primary?.p.id && <Badge tone="lime">가장 추천</Badge>}
                          <Badge tone={isNearDeadline(d) ? 'orange' : 'neutral'}>{ddayText(d)}</Badge>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {current && <div className="rec-split__detail"><CandidateDetail key={current.p.id} primary={current} isPrimary={current.p.id === view.primary?.p.id} week={state.week} records={state.records} activities={state.activities} actions={actions} stacked /></div>}
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      {head}
      {missing && <p className="rec-muted rec-missing">찾던 후보는 이미 골랐거나 이번 주 후보가 아니에요. 아래 후보에서 골라 주세요.</p>}
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
    </>
  );
}
