import { useEffect, useRef, useState } from 'react';
import { Button, Card, Chip, ErrorState, Icon, LoadingState, PageHeader, useToast } from '../../components';
import { navigate } from '../../app/router';
import { useApp } from '../../app/AppState';
import { factsOf } from '../../data/activities';
import { CURRENT_TERM, QUICK_ANSWERS } from '../../data/records';
import { answer, editField, isCardStep, missingSteps, startInterview, stepStatuses, type InterviewState } from '../../domain/interview/engine';
import { recordedPatch } from '../../domain/interview/transitions';
import { buildRecord, evidenceOf, inferDid, savedSummary, type SavedSummary } from '../../domain/interview/record';
import { ENERGY_PROMPT, STEP_LABEL, STEP_ORDER, type CardStep } from '../../domain/interview/schema';
import type { Activity, Axis, Energy, RecordVisibility } from '../../domain/types';
import { DID_AXES, ENERGY, FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { RecordCardView } from './RecordCardView';
import { RecordsTabs } from './RecordsTabs';
import { clearDraft, getDraft, saveDraft, setConfirmedAxes, toggleAxis, type Message } from './stores';
import { useAgentQueue } from './useAgentQueue';

/** 저장 버튼 아래 안내 한 줄: 빈 칸이 먼저, 그다음 에너지 */
const saveHint = (missing: CardStep[], energy?: Energy) =>
  missing.length ? `비어 있는 칸이 있어요: ${missing.map(s => STEP_LABEL[s]).join(', ')}` : energy ? '저장하면 기록 보관함에 쌓여요.' : '에너지를 고르면 저장할 수 있어요.';

type Phase = 'talk' | 'saving' | 'done' | 'error';

export function Interview({ activity }: { activity: Activity }) {
  const { state, run } = useApp();
  const toast = useToast();
  const facts = factsOf(activity);
  const saved = useRef(getDraft(activity.id)).current;
  const nextId = useRef(saved ? saved.messages.length : 0);

  const [messages, setMessages] = useState<Message[]>(saved?.messages ?? []);
  const [iv, setIv] = useState<InterviewState>(() => saved?.interview ?? startInterview(activity.title, facts.situation).state);
  const [energy, setEnergy] = useState<Energy | undefined>(saved?.energy);
  const [visibility, setVisibility] = useState<RecordVisibility>(saved?.visibility ?? 'me');
  const [useForRecommend, setUseForRecommend] = useState(saved?.useForRecommend ?? true);
  const [confirmed, setConfirmed] = useState<Axis[]>(saved?.confirmed ?? []);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<Phase>('talk');
  const [summary, setSummary] = useState<SavedSummary>();

  const { typing, say, drain } = useAgentQueue(text => setMessages(m => [...m, { id: nextId.current++, from: 'agent', text }]));
  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  // 처음 열면 에이전트가 먼저 말을 건다. 초안이 있으면 이어 간다.
  useEffect(() => {
    say(saved ? ['이어서 할게요.'] : startInterview(activity.title, facts.situation).replies);
    return () => window.clearTimeout(saveTimer.current);
  }, []);

  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages, typing]);
  // 말풍선이 나오면 입력칸으로 포커스를 돌려, 키보드만으로 대화가 이어지게 한다.
  useEffect(() => {
    if (!typing && iv.step !== 'review' && phase === 'talk' && (document.activeElement === document.body || document.activeElement === field.current)) field.current?.focus();
  }, [typing, iv.step, phase]);
  useEffect(() => { if (phase === 'done') doneTitle.current?.focus(); }, [phase]);

  const review = iv.step === 'review';
  const send = (text: string, via: 'typed' | 'chip') => {
    const t = text.trim();
    if (!t || typing || review) return;
    const turn = answer(iv, activity.title, t, via);
    setMessages(m => [...m, { id: nextId.current++, from: 'me', text: t }]);
    setIv(turn.state);
    setInput('');
    say(turn.state.step === 'review' ? [...turn.replies, ENERGY_PROMPT] : turn.replies);
  };

  const pause = () => {
    const rest = drain().map(text => ({ id: nextId.current++, from: 'agent' as const, text }));
    saveDraft(activity.id, { messages: [...messages, ...rest], interview: iv, energy, visibility, useForRecommend, confirmed });
    toast('초안을 저장했어요. 다시 열면 이어서 쓸 수 있어요.');
    navigate('records/interview');
  };

  const did = inferDid(`${iv.card.role ?? ''} ${iv.card.action ?? ''}`);
  const evidence = evidenceOf(DID_AXES[did], iv.card.action);
  const meta = `${CURRENT_TERM.month} · ${GROUP_LABEL[FIELD_GROUP[activity.field]]} · ${facts.kind}`;

  // 학생이 확인 버튼을 누른 뒤에만 기록이 생긴다. 기록이 생기면 활동은 '기록됨'이 된다.
  const missing = missingSteps(iv.card);
  const save = () => {
    // 빈 칸이 있으면 저장하지 않는다. 에너지만 골랐다고 저장되면 안 된다.
    if (!energy || missing.length) return;
    setPhase('saving');
    saveTimer.current = window.setTimeout(() => {
      try {
        const record = buildRecord({
          activityId: activity.id, title: activity.title, field: activity.field, programId: activity.programId, kind: facts.kind,
          verification: facts.verified ? 'school' : 'self', date: CURRENT_TERM.date, semester: CURRENT_TERM.semester,
          card: iv.card, energy, visibility, useForRecommend
        });
        setSummary(savedSummary(state.records, record));
        run({ type: 'record/add', record });
        run({ type: 'activity/update', id: activity.id, patch: recordedPatch(record.id) });
        setConfirmedAxes(record.id, confirmed.filter(a => record.axes.includes(a)));
        clearDraft(activity.id);
        setPhase('done');
      } catch {
        setPhase('error');
      }
    }, 900);
  };

  if (phase === 'done' && summary) {
    return (
      <>
        <PageHeader eyebrow="회고" title={activity.title} />
        <RecordsTabs value="interview">
          <Card className="rec-done">
            <span className="rec-done__icon"><Icon name="check" size={28} /></span>
            <h2 ref={doneTitle} tabIndex={-1} className="rec-done__title">기록 카드를 만들었어요</h2>
            <ul className="rec-done__list">
              <li><Icon name="doc" size={18} />‘{activity.title}’ 기록 카드가 기록 보관함에 생겼어요.</li>
              <li><Icon name="sparkle" size={18} />{summary.newDiscoveries.length ? `새 발견 후보가 ${summary.newDiscoveries.length}개 생겼어요. 나의 분석에서 맞는지 확인해 주세요.` : '발견은 그대로예요. 같은 일을 한 기록이 더 쌓이면 새로 생겨요.'}</li>
              <li><Icon name="compass" size={18} />{summary.usedForRecommend ? '다음 추천에 이 기록을 반영해요.' : '추천에 쓰지 않기로 해서 다음 추천은 그대로예요.'}</li>
            </ul>
            <div className="rec-done__actions">
              <Button variant="primary" onClick={() => navigate('records/archive')}>기록 보관함 보기</Button>
              <Button onClick={() => navigate('activities')}>내 활동으로</Button>
            </div>
          </Card>
        </RecordsTabs>
      </>
    );
  }

  const status = stepStatuses(iv);
  return (
    <>
      <PageHeader eyebrow="회고" title={activity.title} actions={phase === 'talk' && <Button onClick={pause}>나중에 이어 하기</Button>} />
      <RecordsTabs value="interview">
        <div className="rec-interview">
          <section className="rec-chat" aria-label="회고 대화">
            <ol className="rec-steps" aria-label="회고 단계">
              {STEP_ORDER.map(s => (
                <li key={s} className="rec-step" data-state={status[s]} aria-current={status[s] === 'current' ? 'step' : undefined}>
                  {status[s] === 'done' && <Icon name="check" size={14} />}
                  {STEP_LABEL[s]}
                </li>
              ))}
            </ol>

            <div ref={log} className="rec-log" role="log" aria-live="polite" aria-label="대화">
              {messages.map(m => <p key={m.id} className={`rec-msg rec-msg--${m.from}`}>{m.text}</p>)}
              {typing && <p className="rec-msg rec-msg--agent rec-typing" role="status"><span className="sr-only">에이전트가 입력 중이에요</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></p>}
            </div>

            {phase === 'saving' && <LoadingState message="기록 카드를 만들고 있어요" lines={2} />}
            {phase === 'error' && <ErrorState message="기록을 저장하지 못했어요. 쓴 내용은 그대로예요." onRetry={save} />}
            {phase === 'talk' && !review && (
              <div className="rec-composer">
                {isCardStep(iv.step) && !typing && (
                  <div className="rec-quick" role="group" aria-label="빠른 답">
                    {QUICK_ANSWERS[iv.step].map(q => <Chip key={q} onClick={() => send(q, 'chip')}>{q}</Chip>)}
                  </div>
                )}
                <form className="rec-input-row" onSubmit={e => { e.preventDefault(); send(input, 'typed'); }}>
                  <input ref={field} className="rec-input" value={input} onChange={e => setInput(e.target.value)} placeholder="말하듯 답하면 돼요" aria-label="답 입력" autoComplete="off" />
                  <Button variant="primary" type="submit" disabled={!input.trim() || typing}>보내기</Button>
                </form>
              </div>
            )}
            {phase === 'talk' && review && (
              <div className="rec-review">
                <div className="rec-quick" role="group" aria-label="끝난 뒤 에너지">
                  {ENERGY.map(e => (
                    <Chip key={e.id} selected={energy === e.id} disabled={typing} aria-describedby={`rec-en-${e.id}`} onClick={() => setEnergy(e.id)}>{e.label}<span id={`rec-en-${e.id}`} className="sr-only">{e.sub}</span></Chip>
                  ))}
                </div>
                <Button variant="primary" block disabled={!energy || missing.length > 0 || typing} aria-describedby="rec-save-hint" onClick={save}>확인했어요, 저장할게요</Button>
                <p id="rec-save-hint" className="rec-review__hint">{saveHint(missing, energy)}</p>
              </div>
            )}
          </section>

          <aside className="rec-side" aria-label="기록 카드 미리보기">
            <RecordCardView
              title={activity.title}
              meta={meta}
              verification={facts.verified ? 'school' : 'self'}
              card={iv.card}
              current={isCardStep(iv.step) ? iv.step : undefined}
              onEditField={review && phase === 'talk' ? (s, t) => setIv(editField(iv, s, t)) : undefined}
              evidence={evidence}
              confirmed={confirmed}
              onToggleAxis={review ? a => setConfirmed(toggleAxis(confirmed, a)) : undefined}
              visibility={visibility}
              onVisibility={setVisibility}
              profilePublic={state.visibility.profilePublic}
              useForRecommend={useForRecommend}
              onUseForRecommend={setUseForRecommend}
            />
          </aside>
        </div>
      </RecordsTabs>
    </>
  );
}
