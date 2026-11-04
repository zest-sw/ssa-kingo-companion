import { FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import type { Scored } from '../../domain/types';

/**
 * 왼쪽 후보 목록: 행마다 제목·분야·D-n 만. '가장 추천' 한 개를 맨 위 따로 두고 나머지는 '대안'으로 묶는다(가장 좋은 하나 + 대안).
 * 필터로 가장 추천이 빠지면 한 묶음이다. 이 칸만 안에서 스크롤한다.
 */
export function CandidateList({ list, primaryId, currentId, week, onPick, label }: {
  list: Scored[]; primaryId?: string; currentId?: string; week: number; onPick: (id: string) => void; label: string;
}) {
  const top = list[0]?.p.id === primaryId ? list[0] : undefined;
  const rest = top ? list.slice(1) : list;
  const row = (s: Scored) => {
    const d = ddayOf(s.p, week);
    return (
      <li key={s.p.id}>
        <button type="button" className="rec-cand" aria-pressed={currentId === s.p.id} onClick={() => onPick(s.p.id)}>
          <span className="rec-cand__title">{s.p.title}</span>
          <span className="rec-cand__bot">
            <FieldTag field={s.p.field} />
            <span className={`rec-cand__dday num${isNearDeadline(d) ? ' rec-cand__dday--near' : ''}`}>{ddayText(d)}</span>
          </span>
        </button>
      </li>
    );
  };
  return (
    <section className="rec-list" data-fill aria-label={label}>
      <div className="rec-list__scroll os-scroll">
        {top && (
          <>
            <h2 className="rec-list__head rec-list__head--top">가장 추천</h2>
            <ul className="rec-cands">{row(top)}</ul>
          </>
        )}
        {rest.length > 0 && (
          <>
            <h2 className="rec-list__head">{top ? `대안 ${rest.length}개` : label}</h2>
            <ul className="rec-cands">{rest.map(row)}</ul>
          </>
        )}
      </div>
    </section>
  );
}
