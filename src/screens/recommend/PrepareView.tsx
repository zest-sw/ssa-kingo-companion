import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, navigate } from '../../app/router';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '../../components';
import { APPLY_URL, DRAFT_DELAY } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { runLog, writeDraft, type Draft } from '../../domain/recommend-flow/draft';
import { clockLabel, dateLabel, mostUrgent, needsTeam, prepItemsFor, remainingItems, submitBlockReason, submitPatch, toggleItem, type PrepItem } from '../../domain/recommend-flow/flow';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';

type DraftState = { status: 'writing' } | { status: 'ready'; draft: Draft; at: string } | { status: 'error' };

const nowLabel = () => clockLabel(new Date());

/** 신청 준비: 체크리스트, 신청서 초안, 실행 기록, 승인 버튼 3개. 신청은 학생이 '이대로 신청'을 눌러야 나간다. */
export function PrepareView({ programId }: { programId: string }) {
  const { state, run } = useApp();
  const p = PROGRAM_BY_ID[programId];
  const activity = state.activities.find(a => a.programId === programId);
  // 체크 상태는 활동에 남는다. 아직 활동이 아니면(주소로 바로 연 경우) 처음 체크리스트를 보여 주기만 한다.
  const [fresh] = useState<PrepItem[]>(() => (p ? prepItemsFor(p, state.week, nowLabel()) : []));
  const items = activity?.prepItems ?? fresh;
  const [revision, setRevision] = useState(0);
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
        setDraft({ status: 'ready', draft: writeDraft(p, state.records, state.profile.goal, revision), at: nowLabel() });
      } catch {
        setDraft({ status: 'error' });
      }
    }, DRAFT_DELAY);
    return () => window.clearTimeout(t);
  }, [p, revision, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const team = p ? needsTeam(p) : false;
  const draftReady = draft.status === 'ready';
  const draftAt = draft.status === 'ready' ? draft.at : undefined;
  const log = useMemo(() => runLog(items, draftAt), [items, draftAt]);

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
    if (activity) run({ type: 'activity/prepItems', id: activity.id, items: toggleItem(items, id, nowLabel()) });
  };

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
    run({ type: 'activity/setStatus', id: activity.id, status: t.status }, { toast: '신청 화면을 새 탭으로 열었어요. 내 활동에 결과 대기로 옮겼어요.' });
    run({ type: 'activity/update', id: activity.id, patch: t.patch });
  };

  const giveUp = () => {
    // 활동이 있으면 지우고(후보는 관심 없음으로), 아직 활동이 아니면 후보만 관심 없음으로 둔다.
    run(activity ? { type: 'activity/remove', id: activity.id } : { type: 'candidate/choose', programId, choice: 'dismissed' }, { toast: '신청 준비를 그만뒀어요.', undoable: true });
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
                  <input type="checkbox" checked={i.done} disabled={i.by === 'agent' || !activity || submitted || (i.id === 'draft' && !draftReady)} onChange={() => change(i.id)} />
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
          <section className="rec-runlog" aria-labelledby="rec-runlog-head">
            <h3 id="rec-runlog-head" className="rec-runlog__head">실행 기록</h3>
            <ul>
              {log.map((l, n) => (
                <li key={n} className={l.ok ? '' : 'rec-runlog__fail'}>
                  <Icon name={l.ok ? 'check' : 'alert'} size={14} />
                  <span className="num">오늘 {l.time}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </Card>

        <Card className="rec-prep__draft" aria-labelledby="rec-draft-title">
          <p className="rec-draft__eyebrow"><Icon name="doc" size={16} />에이전트가 쓴 신청서 초안</p>
          <h2 id="rec-draft-title" className="rec-draft__title">지원서</h2>
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
              {!activity && <Button variant="primary" block onClick={start}>신청 준비</Button>}
              <Button variant={activity ? 'primary' : 'secondary'} block disabled={!!reason} aria-describedby="prep-reason" onClick={submit}>이대로 신청</Button>
              <div className="rec-draft__row">
                <Button block disabled={!draftReady} onClick={() => setRevision(revision + 1)}>고쳐 줘</Button>
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
