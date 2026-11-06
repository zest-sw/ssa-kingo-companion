import { hrefOf } from '../../app/router';
import { Badge, Button, ErrorState, Icon, LoadingState } from '../../components';
import { OUTSIDE_URL } from '../../data/recommend';
import { RunLog } from './RunLog';
import type { Draft, LogEntry } from '../../domain/recommend-flow/draft';
import { canCheck, dateLabel, type PrepItem } from '../../domain/recommend-flow/flow';
import { markChanged } from '../../domain/recommend-flow/prepare';

export type DraftState = { status: 'writing'; draft?: Draft } | { status: 'ready'; draft: Draft; at: string; prev?: string } | { status: 'error' };

/** 준비 ① 준비할 것: 주인공은 내가 할 체크 목록. 에이전트가 한 일은 목록에 섞지 않고 맨 위 한 줄로 접어 둔다. */
export function TodoStep({ items, week, enabled, draftReady, urgentLine, left, log, summary, onToggle, onOpened }: {
  items: PrepItem[]; week: number; enabled: boolean; draftReady: boolean; urgentLine?: string; left: number; log: LogEntry[];
  summary: { text: string; warn?: string }; onToggle: (id: string) => void; onOpened: (id: string) => void;
}) {
  return (
    <>
      <RunLog log={log} summary={summary.text} warn={summary.warn} day="오늘" />
      {/* 머리 한 줄: 가장 급한 할 일. 남은 개수는 옆에 옅게 */}
      {/* 하나만 남았으면 아래 줄과 같은 말이라 개수만 */}
      <p className="rec-pstep__lead"><b>{left > 1 && urgentLine ? urgentLine : left > 0 ? `남은 준비 ${left}개` : '준비를 모두 끝냈어요'}</b>{left > 1 && <span className="rec-muted">남은 준비 {left}개</span>}</p>
      <ul className="rec-items">
        {items.filter(i => i.by === 'me').map(i => (
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
            <span className="rec-item__due num">{i.done ? '완료' : i.dday !== undefined ? `${dateLabel(i.dday, week)}까지` : ''}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 준비 ② 초안: 주인공은 초안 본문. 고친 뒤에는 바뀐 문장만 잠깐 옅게 강조한다. */
export function DraftStep({ draft, team, revised, revising, onRetry }: { draft: DraftState; team: boolean; revised: boolean; revising: boolean; onRetry: () => void }) {
  return (
    <div className="rec-draft" aria-live="polite">
      <div className="rec-draft__title">
        <h2>에이전트가 쓴 신청서 초안</h2>
        {revised && draft.status === 'ready' && draft.prev !== draft.draft.motivation && <Badge tone="green">고친 초안</Badge>}
        {draft.status === 'writing' && draft.draft && <p className="rec-draft__busy" role="status">초안을 고치는 중이에요</p>}
      </div>
      {/* 고치는 동안에는 앞 초안을 옅게 둔 채 기다린다(뼈대로 바꾸지 않아 자리가 움직이지 않는다) */}
      {draft.status === 'writing' && !draft.draft && <LoadingState message={revising ? '초안을 고치는 중이에요' : '초안 쓰는 중이에요'} lines={4} />}
      {draft.status === 'error' && <ErrorState message="초안을 쓰지 못했어요. 다시 시도하면 처음부터 다시 써요." onRetry={onRetry} />}
      {(draft.status === 'ready' || (draft.status === 'writing' && draft.draft)) && draft.draft && (
        <div className="rec-draft__body" aria-busy={draft.status === 'writing' || undefined}>
          {/* 고쳐 달라고 했는데 바꿀 게 없으면 그렇다고 말한다(같은 글에 '고친 초안'을 붙이지 않는다) */}
          {draft.status === 'ready' && draft.prev === draft.draft.motivation && <p className="rec-muted" role="status">더 넣을 기록이 아직 없어서 그대로 뒀어요. 한 줄 요청으로 직접 적어 보세요.</p>}
          <section>
            <h3>지원 동기</h3>
            <p className="rec-draft__text">
              {markChanged(draft.status === 'ready' ? draft.prev : undefined, draft.draft.motivation).map((s, n) => (
                <span key={`${draft.status === 'ready' ? draft.at : 'busy'}-${n}`} className={s.changed ? 'rec-draft__changed' : undefined}>{s.text} </span>
              ))}
            </p>
          </section>
          <section>
            <h3>경험 · 내 기록에서 가져왔어요</h3>
            {draft.draft.related.length === 0
              ? <p className="rec-muted">가져올 기록이 아직 없어요. 활동을 마치고 회고를 쓰면 여기에 들어가요.</p>
              : <ul className="rec-draft__chips">{draft.draft.related.map(r => <li key={r.id}><Badge tone="navy">{r.title}</Badge></li>)}</ul>}
          </section>
          {team && <section><h3>팀 이름, 팀원</h3><p className="rec-muted">팀 구성이 끝나면 채워요</p></section>}
        </div>
      )}
    </div>
  );
}

/**
 * 준비 ③ 신청: 신청은 학교 사이트에서 내가 직접 한다는 걸 제목과 한 줄로. 남은 준비가 있으면 무엇이 남았는지 말한다.
 * 사이트를 연 뒤에는 '신청했어요'를 눌러 달라고 바꿔 말한다.
 */
export function ApplyStep({ title, left, draftReady, reason, sent, onBack }: {
  title: string; left: string[]; draftReady: boolean; reason?: string; sent: boolean; onBack: () => void;
}) {
  const rows = [
    // 몇 개가 아니라 무엇이 남았는지 말해 준다.
    { ok: left.length === 0, text: left.length === 0 ? '준비할 것을 모두 마쳤어요' : `남은 준비: ${left.join(', ')}` },
    { ok: draftReady, text: draftReady ? '신청서 초안이 준비됐어요' : '신청서 초안을 쓰는 중이에요' }
  ];
  const head = reason ? (left.length ? '남은 준비를 마치면 신청할 수 있어요' : '초안이 준비되면 신청할 수 있어요') : sent ? '학교 사이트에서 신청을 마쳤나요?' : `‘${title}’ 신청은 학교 사이트에서 해요`;
  const line = reason ?? (sent
    ? '마쳤으면 ‘신청했어요’를 눌러 주세요. 일정에 넣고 결과를 기다릴게요.'
    : '학교 로그인이 필요해서 챌린지스퀘어에서 내가 직접 신청해요. 초안을 붙여 넣으면 돼요.');
  return (
    <div className="rec-apply">
      <div>
        <h2 className="rec-apply__title">{head}</h2>
        <p id="prep-reason" className="rec-apply__line"><Icon name={reason ? 'alert' : 'lock'} size={14} />{line}</p>
      </div>
      <ul className="rec-apply__rows">
        {rows.map(r => (
          <li key={r.text} data-ok={r.ok || undefined}><span className="rec-apply__mark" aria-hidden="true"><Icon name={r.ok ? 'check' : 'alert'} size={16} /></span>{r.text}</li>
        ))}
      </ul>
      {/* 칸 폭으로 늘어나지 않게 감싼다 */}
      {left.length > 0 && <div><Button size="sm" onClick={onBack}>남은 준비 하러 가기</Button></div>}
    </div>
  );
}
