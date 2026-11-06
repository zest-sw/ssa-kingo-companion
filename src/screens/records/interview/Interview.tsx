import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../../components';
import { navigate, parentLink } from '../../../app/router';
import { useApp } from '../../../app/AppState';
import { factsOf } from '../../../data/activities';
import { CURRENT_TERM } from '../../../data/records';
import { fromDraft, toDraft } from '../../../domain/interview/draft';
import { analysisTarget, interviewRecord, savedChanges, type ChangeLine } from '../../../domain/interview/outcome';
import { answerChips, canSave, nextStep, prevStep, QUESTIONS, setAnswer, trimmedCard, type FlowStep, type QuestionKey } from '../../../domain/interview/questions';
import type { Activity, Energy, RecordCard, RecordVisibility } from '../../../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../../../domain/vocab';
import { retroQueue } from '../../activities/week';
import { DoneScene } from './DoneScene';
import { PreviewStep } from './PreviewStep';
import { QuestionStep } from './QuestionStep';
import './interview.css';

type Phase = 'edit' | 'saving' | 'error' | 'done';
type Done = { card: RecordCard; changes: ChangeLine[]; target: 'analysis' | 'analysis/strengths' };

/** 답을 멈춘 뒤 이만큼 지나면 초안에 남긴다(글자마다 저장소에 쓰지 않으려고) */
const DRAFT_MS = 400;
/** 저장이 비동기로 보이는 시간. 버튼 글자만 바뀌고 화면 모양은 그대로다 */
const SAVE_MS = 600;

/**
 * 회고 인터뷰(흐름 화면): 질문 넷을 한 화면에 하나씩 → 경험 카드 미리보기 → 저장 → 끝 장면.
 * 답은 칸에 쓰는 대로 초안에 남아서, 나갔다 들어오면 보던 질문에서 이어 간다.
 */
export function Interview({ activity }: { activity: Activity }) {
  const { state, run } = useApp();
  const facts = factsOf(activity);
  const start = useRef(state.drafts[activity.id] ? fromDraft(state.drafts[activity.id]) : undefined).current;

  const [card, setCard] = useState<RecordCard>(start?.card ?? {});
  const [step, setStep] = useState<FlowStep>(start?.step ?? 0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [returning, setReturning] = useState(false);
  const [energy, setEnergy] = useState<Energy | undefined>(start?.energy);
  const [visibility, setVisibility] = useState<RecordVisibility>(start?.visibility ?? 'me');
  const [useForRecommend, setUseForRecommend] = useState(start?.useForRecommend ?? true);
  const [phase, setPhase] = useState<Phase>('edit');
  const [done, setDone] = useState<Done>();
  const saveTimer = useRef<number | undefined>(undefined);

  // 초안 저장. 아무것도 안 쓰고 첫 질문에만 있으면 남기지 않는다(회고 대기 목록에 '쓰던 초안'이 거짓으로 뜨지 않게).
  const latest = useRef({ card, step, energy, visibility, useForRecommend, phase });
  latest.current = { card, step, energy, visibility, useForRecommend, phase };
  const flush = () => {
    const l = latest.current;
    if (l.phase !== 'edit') return;
    if (!start && step0Empty(l.card, l.step)) return;
    run({ type: 'draft/save', activityId: activity.id, draft: toDraft(l) });
  };
  useEffect(() => {
    if (phase !== 'edit') return;
    const t = window.setTimeout(flush, DRAFT_MS);
    return () => window.clearTimeout(t);
  }, [card, step, energy, visibility, useForRecommend, phase]);
  // 빵부스러기로 나가도 마지막 몇 글자를 잃지 않는다.
  useEffect(() => () => { window.clearTimeout(saveTimer.current); flush(); }, []);

  const go = (to: FlowStep, d: 'fwd' | 'back') => { setDir(d); setStep(to); };
  const next = () => {
    if (returning) { setReturning(false); go('preview', 'fwd'); return; }
    go(nextStep(step), 'fwd');
  };
  const edit = (key: QuestionKey) => { setReturning(true); go(QUESTIONS.findIndex(q => q.key === key), 'back'); };

  const verification = facts.verified ? 'school' : 'self';
  const meta = `${CURRENT_TERM.month} · ${GROUP_LABEL[FIELD_GROUP[activity.field]]}`;

  // 학생이 저장 버튼을 누른 뒤에만 기록이 생긴다. 기록이 생기면 활동은 '기록됨'이 되고 초안은 지워진다(reducer).
  const save = () => {
    if (!energy || !canSave(card) || phase === 'saving') return;
    setPhase('saving');
    saveTimer.current = window.setTimeout(() => {
      try {
        const clean = trimmedCard(card);
        const record = interviewRecord({
          activityId: activity.id, title: activity.title, field: activity.field, programId: activity.programId, kind: facts.kind,
          verification, date: CURRENT_TERM.date, semester: CURRENT_TERM.semester, card: clean, energy, visibility, useForRecommend
        });
        setDone({ card: clean, changes: savedChanges(state.records, record), target: analysisTarget(state.records, record) });
        run({ type: 'record/add', record, activityId: activity.id });
        setPhase('done');
      } catch {
        setPhase('error');
      }
    }, SAVE_MS);
  };

  const header = <PageHeader parent={parentLink('activities/records')} crumb="회고 인터뷰" title={activity.title} />;

  if (phase === 'done' && done) {
    const queue = retroQueue(state.activities).filter(a => a.id !== activity.id);
    const first = queue[0];
    return (
      <div className="os" data-flow>
        {header}
        <div className="os__body iv-body">
          <DoneScene
            title={activity.title} meta={meta} verification={verification} card={done.card} changes={done.changes}
            onAnalysis={() => navigate(done.target)}
            next={first && { title: first.title, left: queue.length, go: () => navigate(`activities/records/interview/${first.id}`) }}
          />
        </div>
      </div>
    );
  }

  // 첫 질문에서는 얻는 것부터 말하고(Value First), 그 뒤로는 나가도 괜찮다고 알린다.
  const resumeNote = start ? '쓰던 답에서 이어서 써요.' : step === 0 ? '네 가지만 답하면 면접·서류에 쓸 경험 카드가 생겨요.' : '쓰는 대로 저장돼요. 나갔다 와도 이어서 써요.';
  return (
    <div className="os" data-flow>
      {header}
      <div className="os__body iv-body">
        {step === 'preview' ? (
          <PreviewStep
            title={activity.title} meta={meta} verification={verification} card={card}
            energy={energy} onEnergy={setEnergy}
            visibility={visibility} onVisibility={setVisibility} profilePublic={state.visibility.profilePublic}
            useForRecommend={useForRecommend} onUseForRecommend={setUseForRecommend}
            saving={phase === 'saving'} failed={phase === 'error'} canSave={canSave(card)}
            onEdit={edit} onPrev={() => go(prevStep(step), 'back')} onSave={save}
          />
        ) : (
          <QuestionStep
            index={step}
            question={QUESTIONS[step]}
            value={card[QUESTIONS[step].key] ?? ''}
            chips={answerChips(QUESTIONS[step].key, { kind: facts.kind, group: FIELD_GROUP[activity.field], situation: facts.situation })}
            returning={returning}
            dir={dir}
            note={resumeNote}
            onChange={t => setCard(c => setAnswer(c, QUESTIONS[step as number].key, t))}
            onNext={next}
            onPrev={() => go(prevStep(step), 'back')}
          />
        )}
      </div>
    </div>
  );
}

const step0Empty = (card: RecordCard, step: FlowStep) => step === 0 && !Object.values(card).some(v => v?.trim());

