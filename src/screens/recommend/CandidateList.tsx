import { Badge, FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import type { Scored } from '../../domain/types';
import { Meter } from './Meter';

/** 왼쪽 후보 목록: 제목 + 분야 점 + 마감 막대. 가장 추천이 맨 위. 이 칸만 안에서 스크롤한다. */
export function CandidateList({ list, primaryId, currentId, week, onPick, heading }: {
  list: Scored[]; primaryId?: string; currentId?: string; week: number; onPick: (id: string) => void; heading: string;
}) {
  return (
    <section className="rec-list" aria-label={heading}>
      <h2 className="rec-list__head">{heading}</h2>
      <ul className="rec-cands os-scroll">
        {list.map(s => (
          <li key={s.p.id}>
            <button type="button" className="rec-cand" aria-pressed={currentId === s.p.id} onClick={() => onPick(s.p.id)}>
              <span className="rec-cand__top">
                <span className="rec-cand__title">{s.p.title}</span>
                {s.p.id === primaryId && <Badge tone="lime">가장 추천</Badge>}
              </span>
              <span className="rec-cand__bot">
                <FieldTag field={s.p.field} />
                <Meter dday={ddayOf(s.p, week)} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
