import { useState } from 'react';
import { Badge, Button, Card, Drawer, Icon } from '../../components';
import { hrefOf } from '../../app/router';
import { AGENT_TASKS, APPLY_URL } from '../../data/recommend';
import { ddayOf, sortedReasons, mainReason } from '../../domain/recommend';
import { checksOf, dateLabel, formatText, isNearDeadline, plainText, prepItemsFor } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import type { Activity, Program, RecordItem, Scored } from '../../domain/types';
import { DID_LABEL, FIELD_LABEL, REASON_LABEL } from '../../domain/vocab';

export type CardActions = { onPrepare: (p: Program) => void; onLater: (p: Program) => void; onDismiss: (p: Program) => void };

/** 후보 하나의 상세. 추천 상세(L2)와 목록-상세의 오른쪽 칸이 함께 쓴다. 적합도 점수는 화면에 내지 않는다. */
export function CandidateDetail({ primary, isPrimary, week, records, activities, actions, stacked }: {
  primary: Scored; isPrimary: boolean; week: number; records: RecordItem[]; activities: Activity[]; actions: CardActions; stacked?: boolean;
}) {
  const [why, setWhy] = useState(false);

  const p = primary.p;
  const dday = ddayOf(p, week);
  const prep = prepItemsFor(p, week, '').filter(i => i.by === 'me');
  const reason = mainReason(primary.reasons);
  const chips = sortedReasons(primary.reasons).map(r => ({ r, rec: r.recordId ? records.find(x => x.id === r.recordId) : undefined }));
  const checks = checksOf(p, activities);

  return (
    <>
      <Card className={`rec-top${stacked ? ' rec-top--stacked' : ''}`} aria-labelledby="rec-top-title">
        <div className="rec-top__main">
          <div className="rec-top__meta">
            <Badge tone={isPrimary ? 'lime' : 'neutral'}>{isPrimary ? '가장 추천' : '고른 후보'}</Badge>
            <span className="rec-top__kind">{FIELD_LABEL[p.field]} · {DID_LABEL[p.did[0]]}</span>
            <a className="rec-link rec-top__src" href={APPLY_URL} target="_blank" rel="noopener noreferrer">모집글 원문 보기<Icon name="external" size={14} /></a>
          </div>
          <h2 id="rec-top-title" className="rec-top__title">{p.title}</h2>
          <p className="rec-top__host">{plainText(p.host)}</p>

          <dl className="rec-facts">
            <div className="rec-fact"><dt>마감</dt><dd className={isNearDeadline(dday) ? 'rec-fact__accent num' : 'num'}>{ddayText(dday)}</dd><dd className="rec-fact__sub">{dateLabel(dday, week)}</dd></div>
            <div className="rec-fact"><dt>활동 기간</dt><dd>{p.durationLabel}</dd><dd className="rec-fact__sub">{p.when}</dd></div>
            <div className="rec-fact"><dt>방식</dt><dd>{formatText(p).main}</dd><dd className="rec-fact__sub">{formatText(p).sub ?? '이동 없이 참여'}</dd></div>
            <div className="rec-fact"><dt>준비할 것</dt><dd className="num">{prep.length}개</dd><dd className="rec-fact__sub">{prep.map(i => i.label).join(', ')}</dd></div>
          </dl>

          <ul className="rec-checks" aria-label="확인한 것">
            <li><Badge tone="green" icon="check">{checks.eligible ? (p.target === '전 학년' ? '신청 대상 맞음' : `${p.target} 신청 대상 맞음`) : '신청 대상이 아니에요'}</Badge></li>
            {!checks.overlap && <li><Badge tone="green" icon="check">시간표와 안 겹침</Badge></li>}
            {checks.overlap && <li><Badge tone="orange">다른 활동과 일정이 겹쳐요</Badge></li>}
            {checks.team && <li className="rec-checks__team"><Badge>팀이 필요해요</Badge><a className="rec-link" href={hrefOf('profile/recruit')}>팀원 모집 보기</a></li>}
          </ul>

          <div className="rec-why">
            <p className="rec-why__label">왜 추천했나</p>
            <p className="rec-why__text">{reason?.text ?? `${FIELD_LABEL[p.field]} 분야의 이번 주 활동이에요.`}</p>
            <div className="rec-why__chips">
              {chips.map(({ r, rec }) => <Badge key={r.kind} tone={rec ? 'navy' : 'neutral'}>{rec ? `${rec.title} · ${rec.date}` : REASON_LABEL[r.kind]}</Badge>)}
              <button type="button" className="rec-link rec-why__more" onClick={() => setWhy(true)}>근거 기록 보기<Icon name="chevron" size={14} /></button>
            </div>
          </div>
        </div>

        <aside className="rec-aside" aria-label="신청 준비">
          <p className="rec-aside__head">‘신청 준비’를 누르면 에이전트가</p>
          <ul className="rec-aside__tasks">
            {AGENT_TASKS.map(t => <li key={t.text}><span className="rec-aside__icon"><Icon name={t.icon} size={16} /></span>{t.text}</li>)}
          </ul>
          <div className="rec-aside__btns">
            <Button variant="primary" block onClick={() => actions.onPrepare(p)}>신청 준비</Button>
            <div className="rec-aside__row">
              <Button block onClick={() => actions.onLater(p)}>나중에 보기</Button>
              <Button block onClick={() => actions.onDismiss(p)}>관심 없음</Button>
            </div>
          </div>
          <p className="rec-aside__note">신청은 내가 확인하고 누를 때만 나가요</p>
        </aside>
      </Card>

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
    </>
  );
}
