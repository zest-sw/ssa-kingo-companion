import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, parentLink } from '../../app/router';
import { useStepInUrl } from '../../app/stepUrl';
import { Badge, Button, Card, EmptyState, PageHeader, Panel, Stepper } from '../../components';
import { APPLY_URL, DRAFT_DELAY } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { writeDraft, type Revision } from '../../domain/recommend-flow/draft';
import { clockLabel, confirmDraft, dateLabel, markOpened, mostUrgent, needsTeam, prepItemsFor, remainingItems, submitBlockReason, submitPatch, toggleItem, type PrepItem } from '../../domain/recommend-flow/flow';
import { agentLog, agentSummary, PREP_STEPS, primaryAction, PRIMARY_LABEL, resumeStep, type PrepStep } from '../../domain/recommend-flow/prepare';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import { PrepDone } from './PrepDone';
import { ApplyStep, DraftStep, TodoStep, type DraftState } from './PrepSteps';
import { loadPrep, savePrep } from './prepMemory';
import { ReviseBox } from './ReviseBox';

const nowLabel = () => clockLabel(new Date());
const STEP_IDS = PREP_STEPS.map(s => s.id);

/**
 * ③ 신청 준비: 준비할 것 → 초안 → 신청, 한 화면에 한 단계만. 주 버튼은 늘 오른쪽 아래에서 이름만 바뀐다.
 * 신청은 학생이 학교 사이트에서 직접 한다. 사이트를 열고 돌아와 '신청했어요'를 누르면 완료 장면으로 바뀐다.
 * 중간에 나갔다 와도 그 단계·고친 초안으로 돌아온다(prepMemory).
 */
export function PrepareView({ programId }: { programId: string }) {
  const { state, run } = useApp();
  const p = PROGRAM_BY_ID[programId];
  const activity = state.activities.find(a => a.programId === programId);
  // 체크 상태는 활동에 남는다. 아직 활동이 아니면(주소로 바로 연 경우) 처음 체크리스트를 보여 주기만 한다.
  const [fresh] = useState<PrepItem[]>(() => (p ? prepItemsFor(p, state.week, nowLabel()) : []));
  const items = activity?.prepItems ?? fresh;
  const [memory] = useState(() => loadPrep(programId));
  const [step, setStep] = useState<PrepStep>(() => resumeStep(memory, items, activity?.status === 'preparing'));
  const [revisions, setRevisions] = useState<Revision[]>(memory?.revisions ?? []);
  const [sent, setSent] = useState(memory?.sent ?? false);
  const [revisedAt, setRevisedAt] = useState<string[]>([]);
  const [revising, setRevising] = useState(false);
  const [firstAt, setFirstAt] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ status: 'writing' });
  // 고치기 전 초안. 고친 뒤 바뀐 문장만 잠깐 강조하는 데 쓴다.
  const lastText = useRef<string | undefined>(undefined);

  const preparing = activity?.status === 'preparing';
  const submitted = !!activity && !preparing;

  // 신청 준비를 막 시작한 활동에 체크리스트를 붙인다. 진행도(prep)도 함께 내 활동에 반영된다.
  useEffect(() => {
    if (preparing && !activity.prepItems) run({ type: 'activity/prepItems', id: activity.id, items: fresh });
  }, [activity, preparing, fresh, run]);

  useEffect(() => {
    if (preparing) savePrep(programId, { step, revisions, sent });
    else if (submitted) savePrep(programId, undefined);
  }, [programId, preparing, submitted, step, revisions, sent]);

  useEffect(() => {
    if (!p) return;
    setDraft(d => (d.status === 'ready' ? { status: 'writing', draft: d.draft } : { status: 'writing' }));
    const t = window.setTimeout(() => {
      try {
        const at = nowLabel();
        const next = writeDraft(p, state.records, state.profile.goal, revisions);
        const prev = lastText.current;
        setDraft({ status: 'ready', draft: next, at, prev });
        lastText.current = next.motivation;
        setFirstAt(t => t ?? at);
        if (prev !== undefined) setRevisedAt(list => [...list, at]);
      } catch {
        setDraft({ status: 'error' });
      }
    }, DRAFT_DELAY);
    return () => window.clearTimeout(t);
  }, [p, revisions, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftReady = draft.status === 'ready';
  const summary = useMemo(() => (p ? agentSummary(p, state.activities, state.week, items) : undefined), [p, state.activities, state.week, items]);
  // 단계는 주소(?step=)에도 남아 뒤로 가기가 앞 단계로 간다. 이미 신청한 뒤라면 추천 목록으로 돌아간다.
  useStepInUrl(step, STEP_IDS, s => { if (submitted) navigate('recommend', { replace: true }); else { setRevising(false); setStep(s); } });
  // 단계가 바뀌면 새 단계로 초점을 옮긴다. 누른 버튼(남은 준비 하러 가기, 단계 표시)이 사라져 초점이 body로 떨어지지 않게. 첫 그림은 앱 틀이 제목에 준다.
  const scene = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    scene.current?.focus({ preventScroll: true });
  }, [step]);
  const log = useMemo(() => (p ? agentLog(p, state.activities, state.week, items, firstAt, revisedAt) : []), [p, state.activities, state.week, items, firstAt, revisedAt]);

  if (!p || !summary) {
    return (
      <div className="os" data-flow>
        <PageHeader parent={parentLink('recommend')} crumb="신청 준비" title="활동을 찾지 못했어요" />
        <Card className="rec-empty"><EmptyState message="이번 주 후보에 없는 활동이에요. 추천에서 다시 골라 주세요." action={<Button onClick={() => navigate('recommend')}>추천 보기</Button>} /></Card>
      </div>
    );
  }

  const dday = ddayOf(p, state.week);
  const dueText = `${ddayText(dday)} · ${dateLabel(dday, state.week)}`;
  const setItems = (next: PrepItem[]) => { if (activity) run({ type: 'activity/prepItems', id: activity.id, items: next }); };
  const reason = submitBlockReason(items, draftReady, activity?.status);
  const urgent = mostUrgent(items);
  const left = remainingItems(items);

  const go = (next: PrepStep) => { setRevising(false); setStep(next); };
  // 고치기 칸이 닫히면 그 안의 초점이 사라진다. 닫기는 '초안 고치기' 버튼으로, 고쳐 쓰기는(그동안 버튼이 꺼진다) 초안 자리로 돌려준다.
  const closeRevise = () => { setRevising(false); requestAnimationFrame(() => document.querySelector<HTMLElement>('.rec-pstep button[aria-expanded]')?.focus()); };
  const revise = (r: Revision) => { setRevisions(list => [...list, r]); setRevising(false); requestAnimationFrame(() => scene.current?.focus({ preventScroll: true })); };

  const giveUp = () => {
    savePrep(programId, undefined);
    // 활동이 있으면 지우고(후보는 관심 없음으로), 아직 활동이 아니면 후보만 관심 없음으로 둔다.
    run(activity ? { type: 'activity/remove', id: activity.id } : { type: 'candidate/choose', programId, choice: 'dismissed' }, { toast: '신청 준비를 그만뒀어요.', undoable: true });
    // 그만둔 활동의 준비 화면은 다시 올 곳이 아니라서 기록을 남기지 않고 추천으로 돌아간다.
    navigate('recommend', { replace: true });
  };

  const action = primaryAction(step, !!activity, sent);
  const onPrimary = () => {
    if (action === 'start') run({ type: 'candidate/choose', programId, choice: 'preparing' });
    else if (action === 'toDraft') go('draft');
    else if (action === 'toApply') {
      // 초안을 읽고 넘어가면 '신청서 초안 확인'도 끝난 것이다. 준비할 것에서 같은 일을 또 하지 않게 한다.
      setItems(confirmDraft(items, nowLabel()));
      go('apply');
    } else if (action === 'openSite') {
      // 신청은 학생이 학교 사이트에서 직접 한다. 여기서는 그 화면을 새 탭으로 열기만 한다.
      if (reason) return;
      window.open(APPLY_URL, '_blank', 'noopener,noreferrer');
      setSent(true);
    } else if (activity && !reason) {
      const t = submitPatch(p, items);
      run({ type: 'activity/setStatus', id: activity.id, status: t.status });
      run({ type: 'activity/update', id: activity.id, patch: t.patch });
    }
  };
  const blocked = (action === 'toApply' && !draftReady) || ((action === 'openSite' || action === 'confirmSent') && !!reason);

  const header = (
    <PageHeader
      parent={parentLink('recommend')}
      crumb="신청 준비"
      title={p.title}
      actions={submitted ? <Badge tone="green">결과 대기</Badge> : <Stepper label="신청 준비 단계" steps={PREP_STEPS} current={step} onStep={go} />}
    />
  );

  if (submitted) {
    return <div className="os" data-flow>{header}<div className="os__body os__body--fill rec-pstep"><PrepDone when={activity.schedule || p.when} /></div></div>;
  }

  // 왼쪽 아래 한 줄 + 보조 버튼, 오른쪽 끝 주 버튼. 고치기 칸은 버튼 줄 위로 열려 주 버튼 자리를 밀지 않는다.
  let note = `마감 ${dueText}`;
  let secondary: React.ReactNode = <Button onClick={giveUp}>그만두기</Button>;
  if (step === 'draft') {
    note = '고치면 초안을 다시 써요';
    secondary = <Button disabled={!draftReady} aria-expanded={revising} onClick={() => setRevising(r => !r)}>초안 고치기</Button>;
  } else if (step === 'apply' && sent) {
    secondary = <Button icon="external" onClick={() => window.open(APPLY_URL, '_blank', 'noopener,noreferrer')}>사이트 다시 열기</Button>;
  } else if (step === 'apply') {
    secondary = <Button disabled={!draftReady} onClick={() => { go('draft'); setRevising(true); }}>초안 고치기</Button>;
  }
  const footer = (
    <>
      {step === 'draft' && revising && draftReady && <ReviseBox onRevise={revise} onClose={closeRevise} />}
      <span className="rec-foot__note">{note}</span>
      {secondary}
      <Button variant="primary" icon={action === 'openSite' ? 'external' : undefined} disabled={blocked} aria-describedby={step === 'apply' ? 'prep-reason' : undefined} onClick={onPrimary}>
        {PRIMARY_LABEL[action]}{action === 'openSite' && <span className="sr-only">(새 탭)</span>}
      </Button>
    </>
  );

  return (
    <div className="os" data-flow>
      {header}
      <div className="os__body os__body--fill rec-pstep">
        <Panel aria-label={PREP_STEPS.find(s => s.id === step)?.label} footer={footer}>
          <div key={step} ref={scene} tabIndex={-1} role="group" aria-label={PREP_STEPS.find(s => s.id === step)?.label} className="rec-pstep__scene">
            {step === 'todo' && (
              <TodoStep
                items={items} week={state.week} enabled={!!activity} draftReady={draftReady} left={left.length} log={log} summary={summary}
                urgentLine={urgent && urgent.dday !== undefined ? `${dateLabel(urgent.dday, state.week)}까지 ${urgent.label}` : undefined}
                onToggle={id => setItems(toggleItem(items, id, nowLabel()))} onOpened={id => setItems(markOpened(items, id))}
              />
            )}
            {step === 'draft' && <DraftStep draft={draft} team={needsTeam(p)} revised={revisedAt.length > 0 || revisions.length > 0} revising={revisions.length > 0} onRetry={() => setAttempt(attempt + 1)} />}
            {step === 'apply' && <ApplyStep title={p.title} left={left.map(i => i.label)} draftReady={draftReady} reason={reason} sent={sent} onBack={() => go('todo')} />}
          </div>
        </Panel>
      </div>
    </div>
  );
}
