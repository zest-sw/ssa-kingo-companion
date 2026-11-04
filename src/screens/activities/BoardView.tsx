import { useEffect, useState } from 'react';
import { Button, EmptyState } from '../../components';
import { navigate } from '../../app/router';
import { BOARD_COLUMNS, groupByColumn, splitDone } from '../../domain/activities';
import type { Activity, BoardColumn } from '../../domain/types';
import { ActivityCard } from './ActivityCard';
import { DOING_BUSY } from './helpers';
import { takeBoardFocus } from './boardFocus';

const EMPTY: Record<BoardColumn, { message: string; cta?: { label: string; to: string } }> = {
  todo: { message: '추천에서 신청 준비를 누르면 여기에 생겨요.', cta: { label: '추천 보러 가기', to: 'recommend' } },
  doing: { message: '신청한 활동이 시작되면 여기로 옮겨 와요.' },
  done: { message: '활동이 끝나면 여기에 모여요. 회고를 쓰면 기록 보관함에 쌓여요.' }
};

/** 칸 안 카드 목록. 끝난 것 칸은 기록됨·이번엔 안 됨을 '+n' 으로 접어 회고 쓸 활동이 먼저 보이게 한다. */
function ColumnList({ id, list, onOpen }: { id: BoardColumn; list: Activity[]; onOpen: (id: string) => void }) {
  const [more, setMore] = useState(false);
  const { open, settled } = id === 'done' ? splitDone(list) : { open: list, settled: [] };
  const shown = more ? [...open, ...settled] : open;
  return (
    <>
      {id === 'doing' && list.length >= DOING_BUSY && <p className="act-col__note">하는 중이 {list.length}개예요. 새로 시작하기 전에 지금 것부터 살펴봐요.</p>}
      <ul className="act-col__list">
        {shown.map(a => <li key={a.id}><ActivityCard a={a} onOpen={onOpen} /></li>)}
      </ul>
      {settled.length > 0 && (
        <Button size="sm" variant="ghost" icon={more ? 'down' : 'chevron'} aria-expanded={more} onClick={() => setMore(m => !m)}>
          {more ? '정리된 활동 접기' : `기록함·안 됨 ${settled.length}개 더 보기`}
        </Button>
      )}
    </>
  );
}

export function BoardView({ activities, onOpen }: { activities: Activity[]; onOpen: (id: string) => void }) {
  const cols = groupByColumn(activities);
  // 개요의 요약 막대에서 칸을 눌러 왔으면 그 칸 제목으로 포커스를 주고 표시한다.
  const [focus] = useState(takeBoardFocus);
  useEffect(() => {
    if (focus) document.getElementById(`col-${focus}`)?.focus({ preventScroll: false });
  }, [focus]);
  return (
    <div className="act-board">
      {BOARD_COLUMNS.map(c => {
        const empty = EMPTY[c.id];
        const cta = empty.cta;
        return (
          <section key={c.id} className="act-col" data-fill data-focus={focus === c.id || undefined} aria-labelledby={`col-${c.id}`}>
            <h2 id={`col-${c.id}`} tabIndex={-1} className="act-col__head">
              {c.label}
              <span className="act-col__count num"><span className="sr-only">{cols[c.id].length}개</span><span aria-hidden="true">{cols[c.id].length}</span></span>
            </h2>
            {cols[c.id].length === 0 ? (
              <EmptyState icon="board" message={empty.message} action={cta && <Button size="sm" onClick={() => navigate(cta.to)}>{cta.label}</Button>} />
            ) : (
              <ColumnList id={c.id} list={cols[c.id]} onOpen={onOpen} />
            )}
          </section>
        );
      })}
    </div>
  );
}
