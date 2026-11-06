import { useApp } from '../../app/AppState';
import { hrefOf } from '../../app/router';
import { Badge, Button, EmptyState, Icon, IconButton, Modal, Switch } from '../../components';
import { APPLY_URL } from '../../data/recommend';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { ddayOf, sortedReasons } from '../../domain/recommend';
import { agentChecks } from '../../domain/recommend-flow/checks';
import { dateLabel, formatText, isNearDeadline, plainText, prepItemsFor } from '../../domain/recommend-flow/flow';
import { CATEGORY_LABEL, categoryOf, groupedGains } from '../../domain/recommend-flow/opportunities';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import { REASON_LABEL } from '../../domain/vocab';
import type { CardActions } from './actions';
import { Fact } from './Fact';
import { GAIN_ICON } from './gains';
import { ReasonTrace } from './ReasonTrace';
import { useBasis } from './useBasis';

/**
 * 기회 자세히(가운데 모달): 머리는 이름과 D-n 만. 몸통은 하는 일, 정의 목록(종류·주최, 마감, 기간, 방식, 준비물), 얻는 것 전부, 에이전트가 확인한 것, 추천이면 왜 추천했나.
 * 분류·주최를 머리 배지 줄로 올리지 않는다(v2.9 비평 P1-7: 배지 줄은 장식처럼 읽힌다).
 * 행동은 아래 한 줄: 신청 준비(주) / 나중에 보기 / 관심 없음. 신청 준비는 3단계 화면으로 옮겨 간다.
 */
export function OppModal({ open = true, programId, actions, onClose }: { open?: boolean; programId: string; actions: CardActions; onClose: () => void }) {
  const { state, view, run } = useApp();
  const basis = useBasis();
  const p = PROGRAM_BY_ID[programId];
  const close = <IconButton icon="x" label="닫기" onClick={onClose} />;

  if (!p) {
    return (
      <Modal open={open} size="wide" title="기회를 찾지 못했어요" onClose={onClose} aside={close} actions={<Button onClick={onClose}>목록으로</Button>}>
        <EmptyState icon="compass" message="마감됐거나 주소가 바뀌었어요. 전체 기회에서 다시 골라 주세요." />
      </Modal>
    );
  }

  const week = state.week;
  const pick = view.scored.find(s => s.p.id === p.id);
  const dday = ddayOf(p, week);
  const fmt = formatText(p);
  const prep = prepItemsFor(p, week, '').filter(i => i.by === 'me');
  const checks = agentChecks(p, state.activities, week);
  const gains = groupedGains(p);
  const nodes = pick ? traceNodes(pick.reasons, basis.records, p, basis.newcomer) : [];
  const recordReasons = pick ? sortedReasons(pick.reasons).filter(r => r.recordId) : [];
  const closed = dday < 0;
  const chosen = state.choices[p.id];
  const useRecord = (id: string, on: boolean) =>
    run({ type: 'record/setFlags', id, flags: { useForRecommend: on } }, { toast: on ? '이 기록을 추천에 다시 써요.' : '이 기록은 추천에 쓰지 않아요. 추천을 다시 골랐어요.', undoable: true });

  return (
    <Modal
      open={open} size="wide" onClose={onClose} aside={close}
      title={<>{p.title}<span className="ui-dday num rec-modal__dday" data-near={isNearDeadline(dday) || undefined}>{ddayText(dday)}</span></>}
      actions={
        <>
          <Button variant="primary" disabled={closed || !p.eligible || chosen === 'preparing'} onClick={() => actions.onPrepare(p)}>{chosen === 'preparing' ? '신청 준비 중' : '신청 준비'}</Button>
          <Button onClick={() => actions.onLater(p)}>나중에 보기</Button>
          {/* 토스트를 놓친 뒤에도 되돌릴 길: 뺀 활동은 전체 기회에서 열면 '추천에 다시 넣기'가 그 자리에 온다 */}
          {chosen === 'dismissed'
            ? <Button onClick={() => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천에 다시 넣었어요.' }); onClose(); }}>추천에 다시 넣기</Button>
            : <Button onClick={() => actions.onDismiss(p)}>관심 없음</Button>}
          <a className="ui-link rec-modal__src" href={APPLY_URL} target="_blank" rel="noopener noreferrer">모집글 원문<Icon name="external" size={14} /><span className="sr-only">(새 탭)</span></a>
        </>
      }
      note={<><Icon name="lock" size={14} />{p.eligible ? '신청은 내가 누를 때만 나가요' : '신청 대상이 아니라서 신청 준비가 꺼져 있어요'}</>}
    >
      <div className="rec-modal">
        <div className="rec-modal__col">
          <p className="rec-modal__do">{p.summary}</p>
          <dl className="rec-dl" aria-label="모집 정보">
            <Fact label="종류" value={CATEGORY_LABEL[categoryOf(p)]} sub={plainText(p.host)} />
            <Fact label="마감" value={dateLabel(dday, week)} />
            <Fact label="기간" value={p.durationLabel} sub={p.when} />
            <Fact label="방식" value={fmt.main} sub={fmt.sub ?? '이동 없이 참여'} />
            <Fact label="준비물" value={prep.length ? prep.map(i => i.label).join(', ') : '따로 없어요'} />
          </dl>
          <section aria-labelledby="rec-gains-h">
            <h3 id="rec-gains-h" className="ui-subhead">얻는 것</h3>
            {gains.length === 0 ? (
              <p className="rec-muted">모집글에 적힌 것이 없어요. 원문에서 확인해 주세요.</p>
            ) : (
              <dl className="rec-dl">
                {gains.map(gr => (
                  <Fact key={gr.kind} label={<><Icon name={GAIN_ICON[gr.kind]} size={14} />{gr.label}</>} value={gr.items.join(', ')} />
                ))}
              </dl>
            )}
            <p className="rec-modal__fine">모집글에 적힌 것만 옮겼어요</p>
          </section>
        </div>
        <div className="rec-modal__col">
          <section className="rec-agentcheck" aria-labelledby="rec-agentcheck-h">
            <h3 id="rec-agentcheck-h" className="ui-subhead rec-agentcheck__h">에이전트가 확인했어요</h3>
            <ul>
              {checks.map(c => (
                <li key={c.id} className="rec-agentcheck__row" data-state={c.state}>
                  <span className="rec-agentcheck__mark" aria-hidden="true"><Icon name={c.state === 'ok' ? 'check' : c.state === 'warn' ? 'alert' : 'friends'} size={14} /></span>
                  <b>{c.label}</b>
                  <span className="rec-agentcheck__basis">{c.basis}</span>
                  {c.id === 'team' && <a className="ui-link rec-agentcheck__link" href={hrefOf('profile/recruit')}>팀원 모집 보기</a>}
                </li>
              ))}
            </ul>
          </section>
          {pick && (
            <section className="rec-why" aria-labelledby="rec-why-h">
              <h3 id="rec-why-h" className="ui-subhead">왜 추천했나</h3>
              <ReasonTrace nodes={nodes} title={p.title} />
              {recordReasons.length > 0 && (
                <details className="rec-runlog">
                  <summary className="rec-runlog__head"><Icon name="chevron" size={14} />추천에 쓴 기록 {recordReasons.length}개</summary>
                  <ul className="rec-drawer__list">
                    {recordReasons.map(r => (
                      <li key={r.kind} className="rec-drawer__item">
                        <div className="rec-drawer__row">
                          <Badge tone="navy">{REASON_LABEL[r.kind]}</Badge>
                          <Switch checked label="추천에 쓰기" onChange={on => useRecord(r.recordId as string, on)} />
                        </div>
                        <p>{r.text}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
        </div>
      </div>
    </Modal>
  );
}
