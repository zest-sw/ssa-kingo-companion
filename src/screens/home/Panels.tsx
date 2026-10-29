import { ConfirmDot, ConfirmLegend, Badge, Button, Card, EmptyState, Icon } from '../../components';
import { hrefOf, navigate } from '../../app/router';
import { FIELD_LABEL, GROUP_LABEL } from '../../domain/vocab';
import { ddayOf, mainReason } from '../../domain/recommend';
import { candidateHref, isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import { discoveryQuestion, type AxisRow, type FlowRow } from '../../domain/recommend-flow/home';
import type { Discovery, DiscState, FieldGroup, RecordItem, Scored } from '../../domain/types';

/** 역량 근거: 점 행. 점수로 바꾸지 않고 근거 기록 수만큼 점을 찍는다. */
export function EvidencePanel({ rows, records }: { rows: AxisRow[]; records: RecordItem[] }) {
  const title = (id: string) => records.find(r => r.id === id)?.title ?? '기록';
  const MAX = 6;
  return (
    <Card title="역량 근거" action={<ConfirmLegend />} className="home-evidence">
      <ul className="home-rows">
        {rows.map(r => (
          <li key={r.axis} className="home-row">
            <span className="home-row__label">{r.label}</span>
            <span className="home-row__body">
              {r.dots.length === 0 ? (
                <>
                  <span className="home-muted">아직 없음</span>
                  <a className="home-link" href={hrefOf('recommend')}>후보 보기</a>
                </>
              ) : (
                <>
                  {r.dots.slice(0, MAX).map(d => <ConfirmDot key={d.recordId} state={d.state} label={`${title(d.recordId)} · ${d.state === 'confirmed' ? '확인' : 'AI 추정'}`} />)}
                  {r.dots.length > MAX && <span className="home-muted num">+{r.dots.length - MAX}</span>}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const GROUP_ORDER: FieldGroup[] = ['ai', 'dev', 'plan', 'mentor', 'global', 'other'];

/** 관심 흐름: 학기별 가로 막대. 기록한 활동의 분야 비율일 뿐 점수가 아니다. */
export function FlowPanel({ rows }: { rows: FlowRow[] }) {
  const used = GROUP_ORDER.filter(g => rows.some(r => r.groups.some(x => x.group === g)));
  return (
    <Card title="관심 흐름" action={<a className="home-link" href={hrefOf('analysis')}>학기별 보기<Icon name="chevron" size={14} /></a>} className="home-flow">
      {rows.length === 0 ? (
        <EmptyState icon="analysis" message="기록을 남기면 학기마다 어떤 분야에 마음이 갔는지 보여요." action={<Button size="sm" onClick={() => navigate('records')}>회고 쓰기</Button>} />
      ) : (
        <>
          <ul className="home-bars">
            {rows.map(r => (
              <li key={r.semester} className="home-bar">
                <span className="home-bar__label num">{r.label}</span>
                <span className="home-bar__track" role="img" aria-label={`${r.label}: ${[...r.groups].sort((a, b) => b.count - a.count).map(g => `${GROUP_LABEL[g.group]} ${g.count}개`).join(', ')}`}>
                  {GROUP_ORDER.flatMap(g => r.groups.filter(x => x.group === g)).map(g => (
                    <span key={g.group} className={`home-seg home-seg--${g.group}`} style={{ flexGrow: g.count }} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <ul className="home-legend" aria-label="범례">
            {used.map(g => <li key={g}><span className={`home-seg home-seg--${g} home-legend__dot`} aria-hidden="true" />{GROUP_LABEL[g]}</li>)}
          </ul>
        </>
      )}
    </Card>
  );
}

/** 확인할 발견 하나. 맞다고 한 것만 추천에 쓴다. */
export function DiscoveryPanel({ discovery, state, onAnswer, onWrite }: { discovery?: Discovery; state: DiscState; onAnswer: (d: Discovery, s: 'yes' | 'no') => void; onWrite: () => void }) {
  return (
    <Card title="확인할 발견" action={discovery && <Badge tone="dashed">AI 추정</Badge>} className="home-disc">
      {!discovery ? (
        <EmptyState icon="sparkle" message="지금 확인할 발견이 없어요. 회고를 쓰면 새 발견이 생겨요." action={<Button size="sm" onClick={onWrite}>회고 쓰기</Button>} />
      ) : (
        <>
          {state === 'changed' && <p className="home-note">근거가 바뀌었어요. 다시 확인해 주세요.</p>}
          <p className="home-disc__q">{discoveryQuestion(discovery)}</p>
          <ul className="home-disc__chips" aria-label="근거 기록">
            {discovery.evidence.map(r => <li key={r.id}><Badge>{r.title}</Badge></li>)}
          </ul>
          <div className="home-disc__btns">
            <Button variant="primary" block onClick={() => onAnswer(discovery, 'yes')}>맞아요</Button>
            <Button block onClick={() => onAnswer(discovery, 'no')}>아니에요</Button>
          </div>
        </>
      )}
    </Card>
  );
}

/** 이번 주 추천 세 줄: 가장 추천 + 대안 2개 */
export function WeeklyPanel({ items, week }: { items: Scored[]; week: number }) {
  return (
    <Card title="이번 주 추천" action={items.length > 0 && <a className="home-link" href={hrefOf('recommend/compare')}>다른 대안 보기<Icon name="chevron" size={14} /></a>} className="home-weekly">
      {items.length === 0 ? (
        <EmptyState icon="compass" message="지금은 맞는 후보가 없어요. 관심 분야나 시간을 바꿔 보세요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천에서 바꾸기</Button>} />
      ) : (
        <ul className="home-recs">
          {items.map((s, i) => {
            const d = ddayOf(s.p, week);
            return (
              <li key={s.p.id}>
                <a className={`home-rec${i === 0 ? ' home-rec--top' : ''}`} href={hrefOf(candidateHref(s.p.id))}>
                  <span className="home-rec__text">
                    <span className="home-rec__title">{s.p.title}{i === 0 && <Badge tone="lime">가장 추천</Badge>}</span>
                    <span className="home-rec__why">{mainReason(s.reasons)?.text ?? `${FIELD_LABEL[s.p.field]} 활동이에요`}</span>
                  </span>
                  <Badge tone={isNearDeadline(d) ? 'orange' : 'neutral'}>{ddayText(d)}</Badge>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
