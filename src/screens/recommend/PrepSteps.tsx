import { hrefOf } from '../../app/router';
import { Badge, Button, ErrorState, Icon, LoadingState } from '../../components';
import { OUTSIDE_URL } from '../../data/recommend';
import { RunLog } from './RunLog';
import type { Draft } from '../../domain/recommend-flow/draft';
import { canCheck, dateLabel, type PrepItem } from '../../domain/recommend-flow/flow';

export type RunLine = { time: string; text: string; ok: boolean };
export type DraftState = { status: 'writing' } | { status: 'ready'; draft: Draft; at: string } | { status: 'error' };

/** 준비 ① 준비할 것: 체크리스트 한 가지만. 실행 기록은 접어 둔다. */
export function TodoStep({ items, week, enabled, draftReady, urgentLine, left, log, onToggle, onOpened }: {
  items: PrepItem[]; week: number; enabled: boolean; draftReady: boolean; urgentLine?: string; left: number; log: RunLine[];
  onToggle: (id: string) => void; onOpened: (id: string) => void;
}) {
  return (
    <>
      <p className="rec-pstep__lead"><b>{left > 0 ? `${left}개 남음` : '모두 끝났어요'}</b>{urgentLine && <span className="rec-urgent"><Icon name="bell" size={16} />{urgentLine}</span>}</p>
      <ul className="rec-items">
        {items.map(i => (
          <li key={i.id} className={`rec-item${i.done ? ' rec-item--done' : ''}`}>
            <label className="rec-item__box">
              <input type="checkbox" checked={i.done} disabled={!canCheck(i) || !enabled || (i.id === 'draft' && !draftReady)} onChange={() => onToggle(i.id)} />
              <span className="rec-item__text">
                <span className="rec-item__label">{i.label}</span>
                {!i.done && i.hint && <span className="rec-item__hint">{i.hint}</span>}
              </span>
            </label>
            {!i.done && i.link && <a className="rec-link rec-item__link" href={hrefOf(i.link.path)}>{i.link.label}<Icon name="chevron" size={14} /></a>}
            {!i.done && i.outside && enabled && (i.opened
              ? <Button size="sm" variant="primary" icon="check" onClick={() => onToggle(i.id)}>했어요</Button>
              : <a className="rec-link rec-item__link" href={OUTSIDE_URL[i.id]} target="_blank" rel="noopener noreferrer" onClick={() => onOpened(i.id)}>{i.outside}<Icon name="external" size={14} /><span className="sr-only">(새 탭)</span></a>)}
            <Badge tone={i.by === 'agent' ? 'navy' : 'neutral'}>{i.by === 'agent' ? '에이전트' : '나'}</Badge>
            <span className="rec-item__due num">{i.done ? '완료' : i.dday !== undefined ? dateLabel(i.dday, week) : ''}</span>
          </li>
        ))}
      </ul>
      <RunLog log={log} day="오늘" />
    </>
  );
}

/** 준비 ② 초안 확인: 에이전트가 쓴 지원서 한 장. */
export function DraftStep({ draft, team, revised, revising, onRetry }: { draft: DraftState; team: boolean; revised: boolean; revising: boolean; onRetry: () => void }) {
  return (
    <div className="rec-draft" aria-live="polite">
      <p className="rec-draft__eyebrow"><Icon name="doc" size={16} />에이전트가 쓴 신청서 초안{revised && <Badge tone="green">고친 초안</Badge>}</p>
      <h2 className="rec-draft__title">지원서</h2>
      {draft.status === 'writing' && <LoadingState message={revising ? '초안을 고치는 중이에요' : '초안 쓰는 중이에요'} lines={4} />}
      {draft.status === 'error' && <ErrorState message="초안을 쓰지 못했어요." onRetry={onRetry} />}
      {draft.status === 'ready' && (
        <div className="rec-draft__body">
          <section><h3>지원 동기</h3><p>{draft.draft.motivation}</p></section>
          <section>
            <h3>관련 경험 · 기록 보관함에서 가져옴</h3>
            {draft.draft.related.length === 0
              ? <p className="rec-muted">가져올 기록이 아직 없어요. 회고를 쓰면 여기에 들어가요.</p>
              : <ul className="rec-draft__chips">{draft.draft.related.map(r => <li key={r.id}><Badge tone="navy">{r.title}</Badge></li>)}</ul>}
          </section>
          {team && <section><h3>팀 이름, 팀원</h3><p className="rec-muted">팀 구성이 끝나면 채워요</p></section>}
        </div>
      )}
    </div>
  );
}

/** 준비 ③ 신청: 나갈 것을 세 줄로 확인하고 승인 하나. 남은 준비가 있으면 승인은 열리지 않는다. */
export function ApplyStep({ title, left, draftReady, dueText, ready, onBack }: { title: string; left: string[]; draftReady: boolean; dueText: string; ready: boolean; onBack: () => void }) {
  const rows = [
    // 몇 개가 아니라 무엇이 남았는지 말해 준다.
    { ok: left.length === 0, text: left.length === 0 ? '준비할 것을 모두 마쳤어요' : `남은 준비: ${left.join(', ')}` },
    { ok: draftReady, text: draftReady ? '신청서 초안이 준비됐어요' : '신청서 초안을 쓰는 중이에요' },
    { ok: true, text: `마감 ${dueText}` }
  ];
  return (
    <div className="rec-apply">
      <h2 className="rec-apply__title">{ready ? `‘${title}’ 이대로 신청할까요?` : '남은 준비를 마치면 신청할 수 있어요'}</h2>
      <ul className="rec-apply__rows">
        {rows.map(r => (
          <li key={r.text} data-ok={r.ok || undefined}><span className="rec-apply__mark" aria-hidden="true"><Icon name={r.ok ? 'check' : 'alert'} size={16} /></span>{r.text}</li>
        ))}
      </ul>
      {!ready && left.length > 0 && <Button size="sm" onClick={onBack}>남은 준비 하러 가기</Button>}
    </div>
  );
}
