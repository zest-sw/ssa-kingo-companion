import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, parentLink } from '../../app/router';
import { Badge, Button, Card, EmptyState, Icon, PageHeader, Panel, Stepper } from '../../components';
import { APPLY_URL, DRAFT_DELAY } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { runLog, writeDraft, type Revision } from '../../domain/recommend-flow/draft';
import { clockLabel, confirmDraft, dateLabel, markOpened, mostUrgent, needsTeam, prepItemsFor, remainingItems, submitBlockReason, submitPatch, toggleItem, type PrepItem } from '../../domain/recommend-flow/flow';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import { PrepDone } from './PrepDone';
import { ApplyStep, DraftStep, TodoStep, type DraftState } from './PrepSteps';
import { ReviseBox } from './ReviseBox';

const nowLabel = () => clockLabel(new Date());

type StepId = 'todo' | 'draft' | 'apply';
const STEPS: { id: StepId; label: string }[] = [{ id: 'todo', label: '준비할 것' }, { id: 'draft', label: '초안 확인' }, { id: 'apply', label: '신청' }];

/**
 * ③ 신청 준비: 준비할 것 → 초안 확인 → 신청, 한 화면에 한 단계만. 신청은 학생이 '이대로 신청'을 눌러야 나간다.
 * 신청을 열고 나면 단계 자리가 완료 그림으로 바뀌고, 갈 곳은 '일정에서 보기' 하나다.
 */
export function PrepareView({ programId }: { programId: string }) {
  const { state, run } = useApp();
  const p = PROGRAM_BY_ID[programId];
  const activity = state.activities.find(a => a.programId === programId);
  // 체크 상태는 활동에 남는다. 아직 활동이 아니면(주소로 바로 연 경우) 처음 체크리스트를 보여 주기만 한다.
  const [fresh] = useState<PrepItem[]>(() => (p ? prepItemsFor(p, state.week, nowLabel()) : []));
  const items = activity?.prepItems ?? fresh;
  const [step, setStep] = useState<StepId>('todo');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisedAt, setRevisedAt] = useState<string[]>([]);
  const [revising, setRevising] = useState(false);
  const [firstAt, setFirstAt] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ status: 'writing' });

  // 신청 준비를 막 시작한 활동에 체크리스트를 붙인다. 진행도(prep)도 함께 내 활동에 반영된다.
  useEffect(() => {
    if (activity?.status === 'preparing' && !activity.prepItems) run({ type: 'activity/prepItems', id: activity.id, items: fresh });
  }, [activity, fresh, run]);

  useEffect(() => {
    if (!p) return;
    setDraft({ status: 'writing' });
    const t = window.setTimeout(() => {
      try {
        const at = nowLabel();
        setDraft({ status: 'ready', draft: writeDraft(p, state.records, state.profile.goal, revisions), at });
        setFirstAt(t => t ?? at);
        if (revisions.length) setRevisedAt(list => [...list, at]);
      } catch {
        setDraft({ status: 'error' });
      }
    }, DRAFT_DELAY);
    return () => window.clearTimeout(t);
  }, [p, revisions, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftReady = draft.status === 'ready';
  const log = useMemo(() => runLog(items, firstAt, revisedAt), [items, firstAt, revisedAt]);

  if (!p) {
    return (
      <div className="os">
        <PageHeader parent={parentLink('recommend')} crumb="신청 준비" title="활동을 찾지 못했어요" />
        <Card className="rec-empty"><EmptyState message="이 활동은 이번 주 후보에 없어요. 위의 추천에서 다시 골라 주세요." /></Card>
      </div>
    );
  }

  const dday = ddayOf(p, state.week);
  const change = (id: string) => {
    if (activity) run({ type: 'activity/prepItems', id: activity.id, items: toggleItem(items, id, nowLabel()) });
  };
  // 학교 사이트는 링크가 새 탭으로 연다. 연 것만 남겨 두면 '했어요'로 체크할 수 있다.
  const opened = (id: string) => {
    if (activity) run({ type: 'activity/prepItems', id: activity.id, items: markOpened(items, id) });
  };
  // 초안을 읽고 넘어가면 '신청서 초안 확인'도 끝난 것이다. 준비할 것으로 돌아가 같은 일을 또 하지 않게 한다.
  const toApply = () => {
    if (activity) run({ type: 'activity/prepItems', id: activity.id, items: confirmDraft(items, nowLabel()) });
    setStep('apply');
  };
  const revise = (r: Revision) => { setRevisions(list => [...list, r]); setRevising(false); };

  const submitted = !!activity && activity.status !== 'preparing';
  const reason = submitBlockReason(items, draftReady, activity?.status);
  const urgent = mostUrgent(items);
  const left = remainingItems(items).length;

  const start = () => run({ type: 'candidate/choose', programId, choice: 'preparing' });

  const submit = () => {
    // 주소로 바로 열어도 신청 준비를 거친 활동일 때만 신청 링크를 연다.
    if (!activity || submitBlockReason(items, draftReady, activity.status)) return;
    window.open(APPLY_URL, '_blank', 'noopener,noreferrer');
    const t = submitPatch(p, items);
    run({ type: 'activity/setStatus', id: activity.id, status: t.status });
    run({ type: 'activity/update', id: activity.id, patch: t.patch });
  };

  const giveUp = () => {
    // 활동이 있으면 지우고(후보는 관심 없음으로), 아직 활동이 아니면 후보만 관심 없음으로 둔다.
    run(activity ? { type: 'activity/remove', id: activity.id } : { type: 'candidate/choose', programId, choice: 'dismissed' }, { toast: '신청 준비를 그만뒀어요.', undoable: true });
    // 그만둔 활동의 준비 화면은 다시 올 곳이 아니라서 기록을 남기지 않고 추천으로 돌아간다.
    navigate('recommend', { replace: true });
  };

  const dueText = `${ddayText(dday)} · ${dateLabel(dday, state.week)}`;
  const header = (
    <PageHeader
      parent={parentLink('recommend')}
      crumb="신청 준비"
      title={p.title}
      actions={submitted ? <Badge tone="green">결과 대기</Badge> : <Stepper label="신청 준비 단계" steps={STEPS} current={step} onStep={setStep} />}
    />
  );

  if (submitted) {
    return <div className="os">{header}<div className="os__body os__body--fill"><PrepDone when={activity?.schedule || p.when} /></div></div>;
  }

  const quit = <Button onClick={giveUp}>안 할래</Button>;
  let footer;
  let note: React.ReactNode;
  if (step === 'todo') {
    footer = (
      <>
        {activity ? <Button variant="primary" onClick={() => setStep('draft')}>초안 확인</Button> : <Button variant="primary" onClick={start}>신청 준비 시작</Button>}
        {quit}
      </>
    );
    note = `마감 ${dueText}`;
  } else if (step === 'draft') {
    footer = revising && draftReady ? (
      <ReviseBox onRevise={revise} onClose={() => setRevising(false)} />
    ) : (
      <>
        <Button variant="primary" disabled={!draftReady} onClick={toApply}>신청 단계로</Button>
        <Button disabled={!draftReady} aria-expanded={revising} onClick={() => setRevising(true)}>고쳐 줘</Button>
      </>
    );
    note = revising ? undefined : '고치면 초안을 바로 다시 써요';
  } else {
    // Asana 승인처럼 이대로 신청 / 고쳐 줘 / 안 할래 셋을 한 자리에. 고쳐 줘는 초안 단계로 돌아가 고칠 칸을 연다.
    footer = (
      <>
        <Button variant="primary" disabled={!!reason} aria-describedby="prep-reason" onClick={submit}>이대로 신청</Button>
        <Button disabled={!draftReady} onClick={() => { setStep('draft'); setRevising(true); }}>고쳐 줘</Button>
        {quit}
      </>
    );
    note = <span id="prep-reason" className="rec-note"><Icon name="lock" size={14} />{reason ?? '신청은 내가 누를 때만 챌린지스퀘어에서 열려요'}</span>;
  }

  return (
    <div className="os">
      {header}
      <div className="os__body os__body--fill rec-pstep">
        <Panel aria-label={STEPS.find(s => s.id === step)?.label} footer={footer} note={note}>
          {step === 'todo' && (
            <TodoStep
              items={items} week={state.week} enabled={!!activity} draftReady={draftReady} left={left} log={log}
              urgentLine={urgent && urgent.dday !== undefined ? `가장 급한 것 · ${dateLabel(urgent.dday, state.week)}까지 ${urgent.label}` : undefined}
              onToggle={change} onOpened={opened}
            />
          )}
          {step === 'draft' && <DraftStep draft={draft} team={needsTeam(p)} revised={revisedAt.length > 0} revising={revisions.length > 0} onRetry={() => setAttempt(attempt + 1)} />}
          {step === 'apply' && <ApplyStep title={p.title} left={remainingItems(items).map(i => i.label)} onBack={() => setStep('todo')} draftReady={draftReady} dueText={dueText} ready={!reason} />}
        </Panel>
      </div>
    </div>
  );
}
