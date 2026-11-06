import { useCollapseRow, type Presence } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import type { RowLine } from '../../domain/recommend-flow/reasons';
import { ddayText } from '../../domain/text';
import type { Program } from '../../domain/types';

/**
 * 기회 한 줄(추천 활동·전체 기회 탭이 같이 쓴다). 요소는 셋: 이름(앞에 작은 분류), 오른쪽 D-n, 아래 옅은 한 줄(이유 또는 얻는 것).
 * 이번 주가 빠듯할 때만 D-n 옆에 '빠듯'이 붙는다. 행 전체가 눌리고, 누르면 가운데 모달로 자세히가 열린다.
 */
export function OppRow({ p, week, prefix, line, tight, presence, onOpen }: {
  p: Program; week: number; prefix?: string; line?: RowLine; tight?: boolean; onOpen: (p: Program) => void;
  /** 목록에서 빠지는 중(관심 없음·나중에 보기) / 되돌려 들어오는 중 */
  presence?: Presence;
}) {
  const d = ddayOf(p, week);
  const collapse = useCollapseRow(presence);
  return (
    <li {...collapse}>
      <button type="button" className="rec-row" data-id={p.id} onClick={() => onOpen(p)}>
        <span className="rec-row__top">
          {prefix && <span className="rec-row__pre">{prefix}</span>}
          <span className="rec-row__title">{p.title}</span>
          {tight && <span className="rec-row__tight">이번 주 빠듯</span>}
          <span className={`rec-row__dday num${isNearDeadline(d) ? ' rec-row__dday--near' : ''}`}>{ddayText(d)}</span>
        </span>
        {line && <span className="rec-row__line" data-kind={line.kind}>{line.text}</span>}
      </button>
    </li>
  );
}
