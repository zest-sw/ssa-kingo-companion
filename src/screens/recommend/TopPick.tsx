import { openEntity } from '../../app/entity';
import { hrefOf } from '../../app/router';
import { Badge, Button, FieldTag, Piece } from '../../components';
import { ddayOf, mainReason } from '../../domain/recommend';
import { dateLabel, isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import type { Scored } from '../../domain/types';
import { FIELD_LABEL } from '../../domain/vocab';

/** 막대가 가득 차는 남은 날. 이보다 멀면 가득 찬 막대다. */
const BAR_DAYS = 14;

/** 마감까지 남은 날을 막대 길이로. 누르면 그 기회의 서랍이 열린다. */
export function DeadlineBar({ programId, title, dday, week }: { programId: string; title: string; dday: number; week: number }) {
  const ratio = Math.min(1, Math.max(0, dday) / BAR_DAYS);
  const near = isNearDeadline(dday);
  return (
    <div className="ui-dg rec-dl">
      <Piece
        label={`${title}, 마감까지 ${Math.max(0, dday)}일, ${dateLabel(dday, week)}`}
        tip={`${dateLabel(dday, week)} 마감 · 눌러서 자세히`}
        tipAlign="start"
        className="rec-dl__piece"
        onSelect={() => openEntity({ kind: 'opportunity', id: programId })}
      >
        <span className="rec-dl__track">
          <span className={`rec-dl__fill${near ? ' rec-dl__fill--near' : ''}`} style={{ width: `${Math.max(ratio, 0.04) * 100}%` }} />
        </span>
        <span className={`rec-dl__text num${near ? ' rec-dl__text--near' : ''}`}>{ddayText(dday)}</span>
      </Piece>
    </div>
  );
}

type Props = {
  pick: Scored;
  week: number;
  onPrepare: () => void;
  /** 가장 추천이 아닌 후보를 크게 보여 줄 때 */
  label?: string;
  /** 제목을 누르면 갈 곳(홈에서 추천 화면의 그 후보). 추천 화면 안에서는 주지 않는다 */
  href?: string;
};

/** 가장 추천 하나: 제목·분야·마감 막대·이유 한 줄·신청 준비. 홈과 추천 화면이 함께 쓴다. 자세히 가는 길은 제목 링크 하나다. */
export function TopPick({ pick, week, onPrepare, label = '가장 추천', href }: Props) {
  const { p } = pick;
  const dday = ddayOf(p, week);
  const reason = mainReason(pick.reasons)?.text ?? `${FIELD_LABEL[p.field]} 분야의 이번 주 활동이에요.`;
  return (
    <div className="rec-pick">
      <div className="rec-pick__meta">
        <Badge tone="lime">{label}</Badge>
        <FieldTag field={p.field} detail />
      </div>
      <h2 className="rec-pick__title">{href ? <a href={hrefOf(href)}>{p.title}</a> : p.title}</h2>
      <DeadlineBar programId={p.id} title={p.title} dday={dday} week={week} />
      <p className="rec-pick__why">{reason}</p>
      <div className="rec-pick__go">
        <Button variant="primary" onClick={onPrepare}>신청 준비</Button>
      </div>
    </div>
  );
}
