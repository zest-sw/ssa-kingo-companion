import { hrefOf } from '../../app/router';
import { Badge, Button, FieldTag, Icon } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { candidateHref, dateLabel } from '../../domain/recommend-flow/flow';
import { traceNodes } from '../../domain/recommend-flow/trace';
import { ddayText } from '../../domain/text';
import type { RecordItem, Scored } from '../../domain/types';
import type { CardActions } from '../recommend/actions';
import { Meter } from '../recommend/Meter';

type Props = { pick: Scored; alternatives: Scored[]; week: number; records: RecordItem[]; actions: CardActions };

/**
 * 홈 층 구조(layout-reference A): 가장 추천 하나를 크게, 그 아래 다른 대안 두 줄을 작게.
 * 가장 추천은 신청 준비(주) / 나중에 보기 / 관심 없음 중 하나만 누르면 된다. 자세히 가는 길은 제목 링크 하나, 대안은 줄마다 그 후보의 자세히로 간다.
 */
export function HomePick({ pick, alternatives, week, records, actions }: Props) {
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
        {why && <li className="home-pick__why"><Icon name="sparkle" size={16} /><b>{why.label}</b><span>{why.detail}</span></li>}
      </ul>
      <div className="home-pick__go">
        <Button variant="primary" onClick={() => actions.onPrepare(p)}>신청 준비</Button>
        <Button variant="ghost" onClick={() => actions.onLater(p)}>나중에 보기</Button>
        <Button variant="ghost" onClick={() => actions.onDismiss(p)}>관심 없음</Button>
      </div>
      {alternatives.length > 0 && (
        <section className="home-alt" aria-labelledby="home-alt-h">
          <h3 id="home-alt-h" className="home-alt__head">다른 대안</h3>
          <ul className="home-alt__list">
            {alternatives.map(({ p: a }) => (
              <li key={a.id}>
                <a className="home-alt__row" href={hrefOf(candidateHref(a.id))}>
                  <FieldTag field={a.field} />
                  <span className="home-alt__title">{a.title}</span>
                  <span className="home-alt__dday num">{ddayText(ddayOf(a, week))}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
