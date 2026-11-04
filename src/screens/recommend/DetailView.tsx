import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { hrefOf, parentLink } from '../../app/router';
import { Badge, Button, Drawer, EmptyState, Icon, PageHeader, Panel } from '../../components';
import { APPLY_URL } from '../../data/recommend';
import { ddayOf, sortedReasons } from '../../domain/recommend';
import { checksOf, dateLabel, formatText, isNearDeadline, plainText, prepItemsFor } from '../../domain/recommend-flow/flow';
import { weekLoad } from '../../domain/recommend-flow/load';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import { DID_LABEL, fieldName, REASON_LABEL } from '../../domain/vocab';
import type { CardActions } from './actions';
import { Fact } from './Fact';
import { LoadBadge } from './LoadBadge';
import { ReasonTrace } from './ReasonTrace';

/**
 * ② 자세히(#/recommend/<id>): 사실 4칸, 추천 이유 도식, 확인 표시, 모집글 원문. 근거 기록은 서랍(한 단계 더).
 * 행동은 아래 막대 하나: 신청 준비 / 나중에 보기 / 관심 없음. 돌아가는 길은 빵부스러기.
 */
export function DetailView({ programId, actions }: { programId: string; actions: CardActions }) {
  const { state, view } = useApp();
  const [why, setWhy] = useState(false);
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
  const checks = checksOf(p, state.activities);
  const nodes = traceNodes(pick.reasons, state.records, p);
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
            <ul className="rec-checks" aria-label="확인한 것">
              <li><Badge tone={checks.eligible ? 'green' : 'orange'} icon={checks.eligible ? 'check' : 'alert'}>{checks.eligible ? '신청 대상' : '신청 대상 아님'}</Badge></li>
              <li><Badge tone={checks.overlap ? 'orange' : 'green'} icon={checks.overlap ? 'alert' : 'check'}>{checks.overlap ? '일정 겹침' : '일정 안 겹침'}</Badge></li>
              {/* 겹침은 옆 배지가 말하니 부담은 겹치지 않을 때만 */}
              {!checks.overlap && <li><LoadBadge load={weekLoad(p, state.activities, week)} /></li>}
              {checks.team && <li><Badge icon="friends">팀 필요</Badge></li>}
              {checks.team && <li><a className="rec-link" href={hrefOf('profile/recruit')}>팀원 모집 보기</a></li>}
            </ul>
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
        <ul className="rec-drawer__list">
          {sortedReasons(pick.reasons).map(r => (
            <li key={r.kind} className="rec-drawer__item">
              <Badge tone={r.recordId ? 'navy' : 'neutral'}>{REASON_LABEL[r.kind]}</Badge>
              <p>{r.text}</p>
              {r.url && <a className="rec-link" href={r.url} target="_blank" rel="noopener noreferrer">{r.source}<Icon name="external" size={14} /></a>}
              {!r.url && r.source && <p className="rec-muted">{r.source}</p>}
            </li>
          ))}
        </ul>
      </Drawer>
    </div>
  );
}
