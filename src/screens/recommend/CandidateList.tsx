import { FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import type { Scored } from '../../domain/types';

/** 왼쪽 후보 목록: 행마다 제목·분야·D-n 만. 가장 추천이 맨 위. 이 칸만 안에서 스크롤한다. */
export function CandidateList({ list, currentId, week, onPick, heading }: {
  list: Scored[]; currentId?: string; week: number; onPick: (id: string) => void; heading: string;
}) {
  return (
    <section className="rec-list" data-fill aria-label={heading}>
      <h2 className="rec-list__head">{heading}</h2>
      <ul className="rec-cands os-scroll">
        {list.map(s => {
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
        })}
      </ul>
    </section>
  );
}
