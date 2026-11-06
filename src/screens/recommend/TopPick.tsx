import { Button, Icon } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { dateLabel, isNearDeadline } from '../../domain/recommend-flow/flow';
import { keyGains } from '../../domain/recommend-flow/row';
import { ddayText } from '../../domain/text';
import type { Program } from '../../domain/types';
import { GAIN_ICON } from './gains';

/**
 * 가장 추천 하나(화면의 주인공): 이름 크게, 왜 추천했나 한 줄, 얻는 것 둘, D-n, 주 버튼 '신청 준비'.
 * 이 화면에서 채운 버튼은 이것 하나다. '자세히'를 누르면 다른 행처럼 가운데 모달이 열린다(같은 목적지 진입점은 하나).
 */
export function TopPick({ p, week, why, tight, onOpen, onPrepare }: {
  p: Program; week: number; why?: string; tight?: boolean; onOpen: (p: Program) => void; onPrepare: (p: Program) => void;
}) {
  const d = ddayOf(p, week);
  const gains = keyGains(p, 2);
  return (
    <section className="rec-top" aria-labelledby="rec-top-title">
      <div className="rec-top__main">
        <p className="rec-top__label">가장 추천</p>
        <h2 id="rec-top-title" className="rec-top__title">
          {p.title}
        </h2>
        {why && <p className="rec-top__why">{why}</p>}
        {gains.length > 0 && (
          <ul className="rec-top__gains" aria-label="얻는 것">
            {gains.map(g => <li key={g.kind}><Icon name={GAIN_ICON[g.kind]} size={16} />{g.label}</li>)}
          </ul>
        )}
      </div>
      <div className="rec-top__side">
        <p className="rec-top__due">
          <b className={`num${isNearDeadline(d) ? ' rec-top__dday--near' : ''}`}>{ddayText(d)}</b>
          <span>{tight ? '이번 주 빠듯해요' : `${dateLabel(d, week)} 마감`}</span>
        </p>
        <div className="rec-top__btns">
          <Button onClick={() => onOpen(p)}>자세히</Button>
          <Button variant="primary" onClick={() => onPrepare(p)}>신청 준비</Button>
        </div>
      </div>
    </section>
  );
}
