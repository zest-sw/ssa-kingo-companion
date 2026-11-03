import { useState } from 'react';
import { Badge, Button, Card, Drawer, Icon, type IconName } from '../../components';
import { APPLY_URL } from '../../data/recommend';
import { hrefOf } from '../../app/router';
import { ddayOf, sortedReasons } from '../../domain/recommend';
import { checksOf, dateLabel, formatText, isNearDeadline, plainText, prepItemsFor } from '../../domain/recommend-flow/flow';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import type { Activity, Program, RecordItem, Scored } from '../../domain/types';
import { DID_LABEL, fieldName, REASON_LABEL } from '../../domain/vocab';
import { ReasonTrace } from './ReasonTrace';

export type CardActions = { onPrepare: (p: Program) => void; onLater: (p: Program) => void; onDismiss: (p: Program) => void };

function Fact({ icon, label, value, sub, accent }: { icon: IconName; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rec-fact">
      <span className="rec-fact__icon"><Icon name={icon} size={18} /></span>
      <dl>
        <dt>{label}</dt>
        <dd className={accent ? 'rec-fact__val rec-fact__val--near num' : 'rec-fact__val num'}>{value}</dd>
        {sub && <dd className="rec-fact__sub" title={sub}>{sub}</dd>}
      </dl>
    </div>
  );
}

/** 후보 하나의 상세(오른쪽 칸). 위: 핵심 4칸 + 확인 칩 + 근거 도식, 아래: 고정 행동. 적합도 점수는 화면에 내지 않는다. */
export function CandidateDetail({ primary, isPrimary, week, records, activities, actions }: {
  primary: Scored; isPrimary: boolean; week: number; records: RecordItem[]; activities: Activity[]; actions: CardActions;
}) {
  const [why, setWhy] = useState(false);
  const p = primary.p;
  const dday = ddayOf(p, week);
  const prep = prepItemsFor(p, week, '').filter(i => i.by === 'me');
  const checks = checksOf(p, activities);
  const nodes = traceNodes(primary.reasons, records, p);
  const fmt = formatText(p);

  return (
    <Card className="rec-detail" aria-labelledby="rec-detail-title">
      <div className="rec-detail__main">
        <div className="rec-detail__meta">
          <Badge tone={isPrimary ? 'lime' : 'neutral'}>{isPrimary ? '가장 추천' : '고른 후보'}</Badge>
          <span className="rec-detail__kind">{fieldName(p.field)} · {DID_LABEL[p.did[0]]}</span>
          <a className="rec-link rec-detail__src" href={APPLY_URL} target="_blank" rel="noopener noreferrer">모집글 원문<Icon name="external" size={14} /></a>
        </div>
        <div>
          <h2 id="rec-detail-title" className="rec-detail__title">{p.title}</h2>
          <p className="rec-detail__host">{plainText(p.host)}</p>
        </div>

        <div className="rec-facts">
          <Fact icon="calendar" label="마감" value={ddayText(dday)} sub={dateLabel(dday, week)} accent={isNearDeadline(dday)} />
          <Fact icon="clock" label="활동 기간" value={p.durationLabel} sub={p.when} />
          <Fact icon={p.format === 'online' ? 'compass' : 'friends'} label="방식" value={fmt.main} sub={fmt.sub ?? '이동 없이 참여'} />
          <Fact icon="doc" label="준비물" value={`${prep.length}개`} sub={prep.map(i => i.label).join(', ')} />
        </div>

        <ul className="rec-checks" aria-label="확인한 것">
          <li><Badge tone={checks.eligible ? 'green' : 'orange'} icon={checks.eligible ? 'check' : 'alert'}>{checks.eligible ? '신청 대상' : '신청 대상 아님'}</Badge></li>
          <li><Badge tone={checks.overlap ? 'orange' : 'green'} icon={checks.overlap ? 'alert' : 'check'}>{checks.overlap ? '일정 겹침' : '일정 안 겹침'}</Badge></li>
          {checks.team && <li><Badge icon="friends">팀 필요</Badge></li>}
          {checks.team && <li><a className="rec-link" href={hrefOf('profile/recruit')}>팀원 모집 보기</a></li>}
        </ul>

        <section className="rec-why" aria-labelledby="rec-why-h">
          <div className="rec-why__head">
            <h3 id="rec-why-h">왜 추천했나</h3>
            <button type="button" className="rec-link" onClick={() => setWhy(true)}>근거 기록 보기<Icon name="chevron" size={14} /></button>
          </div>
          <ReasonTrace nodes={nodes} title={p.title} />
        </section>
      </div>

      <div className="rec-detail__go">
        <Button variant="primary" onClick={() => actions.onPrepare(p)}>신청 준비</Button>
        <Button onClick={() => actions.onLater(p)}>나중에 보기</Button>
        <Button onClick={() => actions.onDismiss(p)}>관심 없음</Button>
        <span className="rec-detail__note"><Icon name="lock" size={14} />신청은 내가 누를 때만 나가요</span>
      </div>

      <Drawer open={why} title="근거 기록" eyebrow={p.title} onClose={() => setWhy(false)}>
        <section aria-labelledby="why-r" className="rec-drawer__sec">
          <h3 id="why-r" className="rec-drawer__h">추천 이유</h3>
          <ul className="rec-drawer__list">
            {sortedReasons(primary.reasons).map(r => (
              <li key={r.kind} className="rec-drawer__item">
                <Badge tone={r.recordId ? 'navy' : 'neutral'}>{REASON_LABEL[r.kind]}</Badge>
                <p>{r.text}</p>
                {r.url && <a className="rec-link" href={r.url} target="_blank" rel="noopener noreferrer">{r.source}<Icon name="external" size={14} /></a>}
                {!r.url && r.source && <p className="rec-muted">{r.source}</p>}
              </li>
            ))}
          </ul>
        </section>
      </Drawer>
    </Card>
  );
}
