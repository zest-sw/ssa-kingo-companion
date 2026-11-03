import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, navigate, parentLink } from '../../app/router';
import { Badge, Button, Card, EmptyState, ErrorState, Icon, LoadingState, PageHeader } from '../../components';
import { APPLY_URL, DRAFT_DELAY, OUTSIDE_URL } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { runLog, writeDraft, type Draft, type Revision } from '../../domain/recommend-flow/draft';
import { canCheck, clockLabel, dateLabel, markOpened, mostUrgent, needsTeam, prepItemsFor, remainingItems, submitBlockReason, submitPatch, toggleItem, type PrepItem } from '../../domain/recommend-flow/flow';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import { PrepDone } from './PrepDone';
import { ReviseBox } from './ReviseBox';

type DraftState = { status: 'writing' } | { status: 'ready'; draft: Draft; at: string } | { status: 'error' };

const nowLabel = () => clockLabel(new Date());

/**
 * 신청 준비: 체크리스트, 신청서 초안, 실행 기록, 승인 버튼 3개. 신청은 학생이 '이대로 신청'을 눌러야 나간다.
 * 신청을 열고 나면 체크리스트 자리가 완료 그림으로 바뀌고, 갈 곳은 '일정에서 보기' 하나다.
 */
export function PrepareView({ programId }: { programId: string }) {
  const { state, run } = useApp();
  const p = PROGRAM_BY_ID[programId];
  const activity = state.activities.find(a => a.programId === programId);
  // 체크 상태는 활동에 남는다. 아직 활동이 아니면(주소로 바로 연 경우) 처음 체크리스트를 보여 주기만 한다.
  const [fresh] = useState<PrepItem[]>(() => (p ? prepItemsFor(p, state.week, nowLabel()) : []));
  const items = activity?.prepItems ?? fresh;
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

  const team = p ? needsTeam(p) : false;
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

  return (
    <div className="os">
      <PageHeader parent={parentLink('recommend')} crumb="신청 준비" title={p.title} actions={submitted ? <Badge tone="green">결과 대기</Badge> : <Badge tone="orange">마감 {ddayText(dday)} · {dateLabel(dday, state.week)}</Badge>} />
      <div className="os__body os__body--fill rec-prep">
        {submitted ? <PrepDone result={activity?.schedule ? `${activity.schedule} · 일정에서 확인` : '일정에서 확인'} /> : (
        <Card className="rec-prep__list" title="준비할 것" action={<span>{left > 0 ? `${left}개 남음` : '모두 끝났어요'}</span>}>
          {urgent && urgent.dday !== undefined && (
            <p className="rec-urgent"><Icon name="bell" size={18} />가장 급한 것 · {dateLabel(urgent.dday, state.week)}까지 {urgent.label}</p>
          )}
          <ul className="rec-items">
            {items.map(i => (
              <li key={i.id} className={`rec-item${i.done ? ' rec-item--done' : ''}`}>
                <label className="rec-item__box">
                  <input type="checkbox" checked={i.done} disabled={!canCheck(i) || !activity || submitted || (i.id === 'draft' && !draftReady)} onChange={() => change(i.id)} />
                  <span className="rec-item__text">
                    <span className="rec-item__label">{i.label}</span>
                    {!i.done && i.hint && <span className="rec-item__hint">{i.hint}</span>}
                  </span>
                </label>
                {!i.done && i.link && <a className="rec-link rec-item__link" href={hrefOf(i.link.path)}>{i.link.label}<Icon name="chevron" size={14} /></a>}
                {!i.done && i.outside && activity && (i.opened
                  ? <Button size="sm" variant="primary" icon="check" onClick={() => change(i.id)}>했어요</Button>
                  : <a className="rec-link rec-item__link" href={OUTSIDE_URL[i.id]} target="_blank" rel="noopener noreferrer" onClick={() => opened(i.id)}>{i.outside}<Icon name="external" size={14} /><span className="sr-only">(새 탭)</span></a>)}
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
          <p className="rec-foot"><Icon name="lock" size={14} />‘이대로 신청’을 누를 때만 신청이 나가요.</p>
        </Card>
        )}

        <Card className="rec-prep__draft" aria-labelledby="rec-draft-title">
          <p className="rec-draft__eyebrow"><Icon name="doc" size={16} />에이전트가 쓴 신청서 초안{revisedAt.length > 0 && <Badge tone="green">고친 초안</Badge>}</p>
          <h2 id="rec-draft-title" className="rec-draft__title">지원서</h2>
          <div className="rec-draft__body os-scroll" aria-live="polite">
            {draft.status === 'writing' && <LoadingState message={revisions.length ? '초안을 고치는 중이에요' : '초안 쓰는 중이에요'} lines={4} />}
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
          {submitted ? null : revising && draftReady ? (
            <ReviseBox onRevise={revise} onClose={() => setRevising(false)} />
          ) : (
            <div className="rec-draft__acts">
              {!activity && <Button variant="primary" block onClick={start}>신청 준비</Button>}
              <Button variant={activity ? 'primary' : 'secondary'} block disabled={!!reason} aria-describedby="prep-reason" onClick={submit}>이대로 신청</Button>
              <div className="rec-draft__row">
                <Button block disabled={!draftReady} aria-expanded={revising} onClick={() => setRevising(true)}>고쳐 줘</Button>
                <Button block onClick={giveUp}>안 할래</Button>
              </div>
              <p id="prep-reason" className="rec-draft__note">{reason ?? '신청은 내가 누를 때만 챌린지스퀘어에서 열려요'}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
