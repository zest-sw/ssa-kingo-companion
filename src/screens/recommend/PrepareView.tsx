import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, navigate } from '../../app/router';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '../../components';
import { APPLY_URL, DRAFT_DELAY } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { runLog, writeDraft, type Draft } from '../../domain/recommend-flow/draft';
import { dateLabel, mostUrgent, needsTeam, prepItemsFor, prepProgress, remainingItems, submitBlockReason, toggleItem, type PrepItem } from '../../domain/recommend-flow/flow';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import { getPrep, setPrep } from './prepStore';

type DraftState = { status: 'writing' } | { status: 'ready'; draft: Draft } | { status: 'error' };

/** 신청 준비: 체크리스트, 신청서 초안, 실행 기록, 승인 버튼 3개. 신청은 학생이 '이대로 신청'을 눌러야 나간다. */
export function PrepareView({ programId }: { programId: string }) {
  const { state, run } = useApp();
  const p = PROGRAM_BY_ID[programId];
  const activity = state.activities.find(a => a.programId === programId);
  const [items, setItems] = useState<PrepItem[]>(() => (p ? getPrep(programId) ?? prepItemsFor(p, state.week) : []));
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<DraftState>({ status: 'writing' });

  // 바로 주소로 들어와도 신청 준비 활동이 생기게 한다.
  useEffect(() => {
    if (p && !activity && !state.choices[programId]) run({ type: 'candidate/choose', programId, choice: 'preparing' });
  }, [p, activity, programId, run, state.choices]);

  // 체크리스트 진행도를 내 활동에 반영한다.
  useEffect(() => {
    if (!activity || activity.status !== 'preparing') return;
    const pr = prepProgress(items);
    if (!activity.prep || activity.prep.done !== pr.done || activity.prep.total !== pr.total) {
      run({ type: 'activity/update', id: activity.id, patch: { prep: pr } });
    }
  }, [items, activity, run]);

  useEffect(() => {
    if (!p) return;
    setDraft({ status: 'writing' });
    const t = window.setTimeout(() => {
      try {
        setDraft({ status: 'ready', draft: writeDraft(p, state.records, state.profile.goal, revision) });
      } catch {
        setDraft({ status: 'error' });
      }
    }, DRAFT_DELAY);
    return () => window.clearTimeout(t);
  }, [p, revision, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const team = p ? needsTeam(p) : false;
  const draftReady = draft.status === 'ready';
  const log = useMemo(() => runLog(items.some(i => i.id === 'survey'), team, draftReady), [items, team, draftReady]);

  if (!p) {
    return (
      <>
        <PageHeader eyebrow="신청 준비" title="활동을 찾지 못했어요" />
        <Card><EmptyState message="이 활동은 이번 주 후보에 없어요. 추천에서 다시 골라 주세요." action={<Button variant="primary" onClick={() => navigate('recommend')}>추천으로 가기</Button>} /></Card>
      </>
    );
  }

  const dday = ddayOf(p, state.week);
  const change = (id: string) => {
    const next = toggleItem(items, id);
    setItems(next);
    setPrep(programId, next);
  };

  const submitted = !!activity && activity.status !== 'preparing';
  const ready = draftReady;
  const reason = submitBlockReason(items, ready);
  const urgent = mostUrgent(items);
  const left = remainingItems(items).length;

  const submit = () => {
    window.open(APPLY_URL, '_blank', 'noopener,noreferrer');
    if (!activity) return;
    run({ type: 'activity/setStatus', id: activity.id, status: 'applied' }, { toast: '신청 화면을 새 탭으로 열었어요. 내 활동에 결과 대기로 옮겼어요.' });
    run({ type: 'activity/update', id: activity.id, patch: { prep: prepProgress(items), due: undefined, schedule: `결과 대기 · ${p.when}` } });
  };

  const giveUp = () => {
    // 활동을 목록에서 지우는 액션이 없어, 지금 상태에서 이 활동을 뺀 상태로 되돌린다.
    run({ type: 'restore', state: { ...state, activities: state.activities.filter(a => a.programId !== programId), choices: { ...state.choices, [programId]: 'dismissed' } } }, { toast: '신청 준비를 그만뒀어요.', undoable: true });
    navigate('recommend');
  };

  return (
    <>
      <PageHeader eyebrow="신청 준비" title={p.title} actions={<Badge tone="orange">마감 {ddayText(dday)} · {dateLabel(dday, state.week)}</Badge>} />
      <div className="rec-prep">
        <Card className="rec-prep__list" title="준비할 것" action={<span>{left > 0 ? `${left}개 남음` : '모두 끝났어요'}</span>}>
          {urgent && urgent.dday !== undefined && (
            <p className="rec-urgent"><Icon name="bell" size={18} />가장 급한 것 · {dateLabel(urgent.dday, state.week)}까지 {urgent.label}</p>
          )}
          <ul className="rec-items">
            {items.map(i => (
              <li key={i.id} className={`rec-item${i.done ? ' rec-item--done' : ''}`}>
                <label className="rec-item__box">
                  <input type="checkbox" checked={i.done} disabled={i.by === 'agent' || submitted || (i.id === 'draft' && !ready)} onChange={() => change(i.id)} />
                  <span className="rec-item__text">
                    <span className="rec-item__label">{i.label}</span>
                    {!i.done && i.hint && <span className="rec-item__hint">{i.hint}</span>}
                  </span>
                </label>
                {!i.done && i.link && <a className="rec-link rec-item__link" href={hrefOf(i.link.path)}>{i.link.label}<Icon name="chevron" size={14} /></a>}
                <Badge tone={i.by === 'agent' ? 'navy' : 'neutral'}>{i.by === 'agent' ? '에이전트' : '나'}</Badge>
                <span className="rec-item__due num">{i.done ? '완료' : i.dday !== undefined ? dateLabel(i.dday, state.week) : ''}</span>
              </li>
            ))}
          </ul>
          <div className="rec-log" aria-label="에이전트 실행 기록">
            <p className="rec-log__head">실행 기록</p>
            <ul>
              {log.map((l, n) => (
                <li key={n} className={l.ok ? '' : 'rec-log__fail'}>
                  <Icon name={l.ok ? 'check' : 'alert'} size={14} />
                  <span className="num">오늘 {l.time}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="rec-prep__draft" aria-label="신청서 초안">
          <p className="rec-draft__eyebrow"><Icon name="doc" size={16} />에이전트가 쓴 신청서 초안</p>
          <h2 className="rec-draft__title">지원서</h2>
          <div className="rec-draft__body" aria-live="polite">
            {draft.status === 'writing' && <LoadingState message="초안 쓰는 중이에요" lines={4} />}
            {draft.status === 'error' && <ErrorState message="초안을 쓰지 못했어요." onRetry={() => setAttempt(attempt + 1)} />}
            {draft.status === 'ready' && (
              <>
                <section><h3>지원 동기</h3><p>{draft.draft.motivation}</p></section>
                <section>
                  <h3>관련 경험 · 기록 보관함에서 가져옴</h3>
                  {draft.draft.related.length === 0
                    ? <p className="rec-muted">가져올 기록이 아직 없어요. 회고를 쓰면 여기에 들어가요.</p>
                    : <ul className="rec-draft__chips">{draft.draft.related.map(r => <li key={r.id}><Badge tone="navy">{r.title}</Badge></li>)}</ul>}
                </section>
                {team && <section><h3>팀 이름, 팀원</h3><p className="rec-muted">팀 구성이 끝나면 채워요</p></section>}
              </>
            )}
          </div>
          {submitted ? (
            <div className="rec-draft__done" role="status">
              <p><b>신청 화면을 열었어요.</b> 결과는 내 활동에서 확인해요.</p>
              <Button variant="primary" block onClick={() => navigate('activities')}>내 활동 보기</Button>
            </div>
          ) : (
            <div className="rec-draft__acts">
              <Button variant="primary" block disabled={!!reason} aria-describedby="prep-reason" onClick={submit}>이대로 신청</Button>
              <div className="rec-draft__row">
                <Button block disabled={!ready} onClick={() => setRevision(revision + 1)}>고쳐 줘</Button>
                <Button block onClick={giveUp}>안 할래</Button>
              </div>
              <p id="prep-reason" className="rec-draft__note">{reason ?? '신청은 내가 누를 때만 챌린지스퀘어에서 열려요'}</p>
            </div>
          )}
        </Card>
      </div>
      <p className="rec-foot"><Icon name="check" size={14} />‘이대로 신청’을 누를 때만 신청이 나가요. 경험은 기록 카드에 있는 것만 써요.</p>
    </>
  );
}
