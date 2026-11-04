import { hrefOf } from '../../app/router';
import { Badge, Button, Icon, Panel } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, dateLabel, formatText, isNearDeadline } from '../../domain/recommend-flow/flow';
import { weekLoad } from '../../domain/recommend-flow/load';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import type { Activity, Scored } from '../../domain/types';
import { DID_LABEL, fieldName } from '../../domain/vocab';
import type { CardActions } from './actions';
import { Fact } from './Fact';
import { LoadBadge } from './LoadBadge';
import { useBasis } from './useBasis';

/**
 * ① 고르기의 오른쪽 짧은 카드: 제목, 핵심 3가지(마감·기간·방식), 이번 주 부담(여유/빠듯), 이유 키워드 한 줄, 신청 준비를 누르면 에이전트가 맡을 일 한 줄.
 * 행동은 Linear 분류함처럼 신청 준비(주) / 나중에 보기 / 관심 없음. 자세히(#/recommend/<id>)는 이유 줄 끝 링크 하나다. 적합도 점수는 화면에 내지 않는다.
 */
export function CandidateCard({ pick, isPrimary, week, activities, actions }: { pick: Scored; isPrimary: boolean; week: number; activities: Activity[]; actions: CardActions }) {
  const basis = useBasis();
  const p = pick.p;
  const dday = ddayOf(p, week);
  const fmt = formatText(p);
  const why = traceNodes(pick.reasons, basis.records, p, basis.newcomer)[0];
  return (
    <Panel
      className="rec-pick"
      aria-label="고른 후보"
      footer={
        <>
          <Button variant="primary" onClick={() => actions.onPrepare(p)}>신청 준비</Button>
          <Button onClick={() => actions.onLater(p)}>나중에 보기</Button>
          <Button onClick={() => actions.onDismiss(p)}>관심 없음</Button>
        </>
      }
      note={<><Icon name="lock" size={14} />신청은 내가 누를 때만 나가요</>}
    >
      <div className="rec-pick__meta">
        {isPrimary && <Badge tone="lime">가장 추천</Badge>}
        <span className="rec-detail__kind">{fieldName(p.field)} · {DID_LABEL[p.did[0]]}</span>
        <LoadBadge load={weekLoad(p, activities, week)} />
      </div>
      <h2 className="rec-detail__title">{p.title}</h2>
      <div className="rec-facts rec-facts--3">
        <Fact icon="calendar" label="마감" value={ddayText(dday)} sub={dateLabel(dday, week)} accent={isNearDeadline(dday)} />
        <Fact icon="clock" label="활동 기간" value={p.durationLabel} sub={p.when} />
        <Fact icon={p.format === 'online' ? 'compass' : 'friends'} label="방식" value={fmt.main} sub={fmt.sub ?? '이동 없이 참여'} />
      </div>
      <p className="rec-pick__why">
        {why && <><Icon name="sparkle" size={16} /><b>{why.label}</b><span>{why.detail}</span></>}
        <a className="rec-link rec-pick__more" href={hrefOf(candidateHref(p.id))}>왜 추천했나 자세히<Icon name="chevron" size={14} /></a>
      </p>
      {/* 목업 recommend-top: 누르기 전에 에이전트가 맡을 일을 미리 보인다(귀찮은 일은 에이전트가) */}
      <p className="rec-pick__agent">
        <span>신청 준비를 누르면 에이전트가</span>
        <span className="rec-pick__task"><Icon name="doc" size={14} />신청서 초안 쓰기</span>
        <span className="rec-pick__task"><Icon name="calendar" size={14} />일정 등록</span>
        <span className="rec-pick__task"><Icon name="bell" size={14} />남은 마감 챙기기</span>
      </p>
    </Panel>
  );
}
