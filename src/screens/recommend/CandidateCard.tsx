import { navigate } from '../../app/router';
import { Badge, Button, Icon, Panel } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, dateLabel, formatText, isNearDeadline } from '../../domain/recommend-flow/flow';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import type { RecordItem, Scored } from '../../domain/types';
import { DID_LABEL, fieldName } from '../../domain/vocab';
import type { CardActions } from './actions';
import { Fact } from './Fact';

/**
 * ① 고르기의 오른쪽 짧은 카드: 제목, 핵심 3가지(마감·기간·방식), 이유 키워드 한 줄, 신청 준비(주) + 자세히(보조).
 * 사실 표·근거 도식·확인 표시는 '자세히'(#/recommend/<id>)로 보낸다. 적합도 점수는 화면에 내지 않는다.
 */
export function CandidateCard({ pick, isPrimary, week, records, actions }: { pick: Scored; isPrimary: boolean; week: number; records: RecordItem[]; actions: Pick<CardActions, 'onPrepare'> }) {
  const p = pick.p;
  const dday = ddayOf(p, week);
  const fmt = formatText(p);
  const why = traceNodes(pick.reasons, records, p)[0];
  return (
    <Panel
      className="rec-pick"
      aria-label="고른 후보"
      footer={
        <>
          <Button variant="primary" onClick={() => actions.onPrepare(p)}>신청 준비</Button>
          <Button icon="chevron" onClick={() => navigate(candidateHref(p.id))}>자세히</Button>
        </>
      }
      note={<><Icon name="lock" size={14} />신청은 내가 누를 때만 나가요</>}
    >
      <div className="rec-pick__meta">
        {isPrimary && <Badge tone="lime">가장 추천</Badge>}
        <span className="rec-detail__kind">{fieldName(p.field)} · {DID_LABEL[p.did[0]]}</span>
      </div>
      <h2 className="rec-detail__title">{p.title}</h2>
      <div className="rec-facts rec-facts--3">
        <Fact icon="calendar" label="마감" value={ddayText(dday)} sub={dateLabel(dday, week)} accent={isNearDeadline(dday)} />
        <Fact icon="clock" label="활동 기간" value={p.durationLabel} sub={p.when} />
        <Fact icon={p.format === 'online' ? 'compass' : 'friends'} label="방식" value={fmt.main} sub={fmt.sub ?? '이동 없이 참여'} />
      </div>
      {why && <p className="rec-pick__why"><Icon name="sparkle" size={16} /><b>{why.label}</b><span>{why.detail}</span></p>}
    </Panel>
  );
}
