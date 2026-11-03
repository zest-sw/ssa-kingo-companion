import { hrefOf } from '../../app/router';
import { Badge, Button, FieldTag, Icon } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, dateLabel, formatText } from '../../domain/recommend-flow/flow';
import { traceNodes } from '../../domain/recommend-flow/trace';
import type { RecordItem, Scored } from '../../domain/types';
import { Meter } from '../recommend/Meter';

/** 가장 추천 한 장: 분야 점·마감 막대·방식 아이콘이 그림이고, 이유는 키워드 한 줄이다. 자세히 가는 길은 제목 링크 하나다. */
export function HomePick({ pick, week, records, onPrepare }: { pick: Scored; week: number; records: RecordItem[]; onPrepare: () => void }) {
  const { p } = pick;
  const dday = ddayOf(p, week);
  const why = traceNodes(pick.reasons, records, p)[0];
  return (
    <div className="home-pick">
      <div className="home-pick__meta">
        <Badge tone="lime">가장 추천</Badge>
        <FieldTag field={p.field} />
      </div>
      <h2 className="home-pick__title"><a href={hrefOf(candidateHref(p.id))}>{p.title}</a></h2>
      <div className="home-pick__dl">
        <Meter dday={dday} />
        <span className="home-pick__date num">{dateLabel(dday, week)} 마감</span>
      </div>
      <ul className="home-pick__facts" aria-label="활동 정보">
        <li><Icon name="clock" size={16} />{p.durationLabel}</li>
        <li><Icon name={p.format === 'online' ? 'compass' : 'friends'} size={16} />{formatText(p).main}</li>
        {why && <li className="home-pick__why"><Icon name="sparkle" size={16} /><b>{why.label}</b><span>{why.detail}</span></li>}
      </ul>
      <div className="home-pick__go"><Button variant="primary" onClick={onPrepare}>신청 준비</Button></div>
    </div>
  );
}
