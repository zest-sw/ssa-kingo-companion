import { Button, EmptyState } from '../../components';
import { navigate } from '../../app/router';
import { BOARD_COLUMNS, groupByColumn } from '../../domain/activities';
import type { Activity, BoardColumn } from '../../domain/types';
import { ActivityCard } from './ActivityCard';

const EMPTY: Record<BoardColumn, { message: string; cta?: { label: string; to: string } }> = {
  todo: { message: '추천에서 신청 준비를 누르면 여기에 생겨요.', cta: { label: '추천 보러 가기', to: 'recommend' } },
  doing: { message: '신청한 활동이 시작되면 여기로 옮겨 와요.' },
  done: { message: '활동이 끝나면 여기에 모여요. 회고를 쓰면 기록 보관함에 쌓여요.' }
};

export function BoardView({ activities, onOpen }: { activities: Activity[]; onOpen: (id: string) => void }) {
  const cols = groupByColumn(activities);
  return (
    <div className="act-board">
      {BOARD_COLUMNS.map(c => {
        const empty = EMPTY[c.id];
        const cta = empty.cta;
        return (
          <section key={c.id} className="act-col" aria-labelledby={`col-${c.id}`}>
            <h2 id={`col-${c.id}`} className="act-col__head">
              {c.label}
              <span className="act-col__count num"><span className="sr-only">{cols[c.id].length}개</span><span aria-hidden="true">{cols[c.id].length}</span></span>
            </h2>
            {cols[c.id].length === 0 ? (
              <EmptyState icon="board" message={empty.message} action={cta && <Button size="sm" onClick={() => navigate(cta.to)}>{cta.label}</Button>} />
            ) : (
              <ul className="act-col__list">
                {cols[c.id].map(a => <li key={a.id}><ActivityCard a={a} onOpen={onOpen} /></li>)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
