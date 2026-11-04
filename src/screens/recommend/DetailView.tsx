import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, parentLink } from '../../app/router';
import { Badge, Button, Drawer, EmptyState, Icon, PageHeader, Panel, Switch } from '../../components';
import { APPLY_URL } from '../../data/recommend';
import { ddayOf, sortedReasons } from '../../domain/recommend';
import { agentChecks } from '../../domain/recommend-flow/checks';
import { dateLabel, formatText, isNearDeadline, plainText, prepItemsFor } from '../../domain/recommend-flow/flow';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import { DID_LABEL, fieldName, REASON_LABEL } from '../../domain/vocab';
import type { CardActions } from './actions';
import { Fact } from './Fact';
import { ReasonTrace } from './ReasonTrace';
import { useBasis } from './useBasis';

/**
 * ② 자세히(#/recommend/<id>): 사실 4칸, 에이전트가 확인한 것(확인에 쓴 정보와 함께), 추천 이유 도식, 모집글 원문.
 * 근거 기록은 서랍(한 단계 더)이고, 서랍에서 기록 근거를 추천에 쓸지 고른다(고려대 AI선배 '추천에 쓰지 않기').
 * 행동은 아래 막대 하나: 신청 준비 / 나중에 보기 / 관심 없음. 돌아가는 길은 빵부스러기.
 */
export function DetailView({ programId, actions }: { programId: string; actions: CardActions }) {
  const { state, view, run } = useApp();
  const basis = useBasis();
  const [why, setWhy] = useState(false);
  // 서랍에서 끈 기록은 이유 목록에서 빠지니, 서랍을 연 동안은 끈 채로 남겨 다시 켤 수 있게 한다.
  const [offIds, setOffIds] = useState<string[]>([]);
  const pick = view.scored.find(s => s.p.id === programId);

  if (!pick) {
    return (
      <div className="os">
        <PageHeader parent={parentLink('recommend')} crumb="자세히" title="후보를 찾지 못했어요" />
        <div className="os__body os__body--fill">
          <Panel aria-label="후보 없음"><EmptyState icon="compass" message="이미 골랐거나 이번 주 후보가 아니에요. 추천에서 다시 골라 주세요." /></Panel>
        </div>
      </div>
    );
  }

  const p = pick.p;
  const week = state.week;
  const dday = ddayOf(p, week);
  const prep = prepItemsFor(p, week, '').filter(i => i.by === 'me');
  const checks = agentChecks(p, state.activities, week);
  const nodes = traceNodes(pick.reasons, basis.records, p, basis.newcomer);
  const reasons = sortedReasons(pick.reasons);
  const offRecords = state.records.filter(r => offIds.includes(r.id) && !r.useForRecommend && !reasons.some(x => x.recordId === r.id));
  const useRecord = (id: string, on: boolean) => {
    setOffIds(list => (on ? list.filter(x => x !== id) : [...list, id]));
    run({ type: 'record/setFlags', id, flags: { useForRecommend: on } }, { toast: on ? '이 기록을 다시 추천에 써요.' : '이 기록은 추천에 쓰지 않아요. 추천을 다시 골랐어요.', undoable: true });
  };
  const fmt = formatText(p);

  return (
    <div className="os">
      <PageHeader
        parent={parentLink('recommend')}
        crumb="자세히"
        title={p.title}
        actions={<a className="rec-link" href={APPLY_URL} target="_blank" rel="noopener noreferrer">모집글 원문<Icon name="external" size={14} /><span className="sr-only">(새 탭)</span></a>}
      />
      <div className="os__body os__body--fill">
        <Panel
          aria-label="후보 자세히"
          bodyClassName="rec-more"
          footer={
            <>
              <Button variant="primary" onClick={() => actions.onPrepare(p)}>신청 준비</Button>
              <Button onClick={() => actions.onLater(p)}>나중에 보기</Button>
              <Button onClick={() => actions.onDismiss(p)}>관심 없음</Button>
            </>
          }
          note={<><Icon name="lock" size={14} />신청은 내가 누를 때만 나가요</>}
        >
          <section className="rec-more__col" aria-label="사실">
            <p className="rec-detail__kind">{fieldName(p.field)} · {DID_LABEL[p.did[0]]} · {plainText(p.host)}</p>
            <div className="rec-facts rec-facts--2">
              <Fact icon="calendar" label="마감" value={ddayText(dday)} sub={dateLabel(dday, week)} accent={isNearDeadline(dday)} />
              <Fact icon="clock" label="활동 기간" value={p.durationLabel} sub={p.when} />
              <Fact icon={p.format === 'online' ? 'compass' : 'friends'} label="방식" value={fmt.main} sub={fmt.sub ?? '이동 없이 참여'} />
              <Fact icon="doc" label="준비물" value={`${prep.length}개`} sub={prep.map(i => i.label).join(', ')} />
            </div>
            <section className="rec-agentcheck" aria-labelledby="rec-agentcheck-h">
              <h3 id="rec-agentcheck-h" className="rec-agentcheck__h"><Icon name="sparkle" size={14} />에이전트가 확인했어요</h3>
              <ul>
                {checks.map(c => (
                  <li key={c.id} className="rec-agentcheck__row" data-state={c.state}>
                    <span className="rec-agentcheck__mark" aria-hidden="true"><Icon name={c.state === 'ok' ? 'check' : c.state === 'warn' ? 'alert' : 'friends'} size={14} /></span>
                    <b>{c.label}</b>
                    <span className="rec-agentcheck__basis">{c.basis}</span>
                    {c.id === 'team' && <a className="rec-link rec-agentcheck__link" href={hrefOf('profile/recruit')}>팀원 모집 보기</a>}
                  </li>
                ))}
              </ul>
            </section>
          </section>
          <section className="rec-why" aria-labelledby="rec-why-h">
            <div className="rec-why__head">
              <h3 id="rec-why-h">왜 추천했나</h3>
              <button type="button" className="rec-link" onClick={() => setWhy(true)}>근거 기록 보기<Icon name="chevron" size={14} /></button>
            </div>
            <ReasonTrace nodes={nodes} title={p.title} />
          </section>
        </Panel>
      </div>

      <Drawer open={why} title="근거 기록" eyebrow={p.title} onClose={() => setWhy(false)}>
        {(reasons.some(r => r.recordId) || offRecords.length > 0) && <p className="rec-dialog__sub">내 기록 근거는 추천에 쓸지 고를 수 있어요. 끄면 이 기록은 추천과 발견에서 빠져요.</p>}
        <ul className="rec-drawer__list">
          {nodes.filter(n => n.kind === 'goal').map(n => (
            <li key={n.kind} className="rec-drawer__item"><Badge>{n.label}</Badge><p>{n.text}</p></li>
          ))}
          {reasons.map(r => (
            <li key={r.kind} className="rec-drawer__item">
              <div className="rec-drawer__row">
                <Badge tone={r.recordId ? 'navy' : 'neutral'}>{REASON_LABEL[r.kind]}</Badge>
                {r.recordId && <Switch checked label="추천에 쓰기" onChange={on => useRecord(r.recordId as string, on)} />}
              </div>
              <p>{r.text}</p>
              {r.url && <a className="rec-link" href={r.url} target="_blank" rel="noopener noreferrer">{r.source}<Icon name="external" size={14} /></a>}
              {!r.url && r.source && <p className="rec-muted">{r.source}</p>}
            </li>
          ))}
          {nodes.filter(n => n.kind === 'interest-miss').map(n => (
            <li key={n.kind} className="rec-drawer__item"><Badge>{n.label}</Badge><p>{n.text}</p></li>
          ))}
          {offRecords.map(r => (
            <li key={r.id} className="rec-drawer__item rec-drawer__item--off">
              <div className="rec-drawer__row">
                <Badge>{REASON_LABEL.energy}</Badge>
                <Switch checked={false} label="추천에 쓰기" onChange={on => useRecord(r.id, on)} />
              </div>
              <p>{r.title}</p>
              <p className="rec-muted">추천에 쓰지 않는 기록이에요</p>
            </li>
          ))}
          {reasons.length === 0 && offRecords.length === 0 && !nodes.some(n => n.text) && <li className="rec-muted">아직 이어진 근거가 없어요. 회고를 남기면 여기에 쌓여요.</li>}
        </ul>
        <p className="rec-drawer__foot"><span className="rec-muted">관심 분야·목표 근거는 설정에서 바꿔요</span><a className="rec-link" href={hrefOf('settings/profile')}>관심·목표 바꾸기<Icon name="chevron" size={14} /></a></p>
      </Drawer>
    </div>
  );
}
