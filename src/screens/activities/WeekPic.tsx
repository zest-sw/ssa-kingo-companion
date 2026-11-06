import type { CSSProperties, ReactNode } from 'react';
import { rowNote, type Week, type WeekRow } from './week';

const at = (day: number) => `${((day + 0.5) / 7) * 100}%`;
const span = (from: number, to: number): CSSProperties => ({ left: `${(from / 7) * 100}%`, width: `${((to - from + 1) / 7) * 100}%` });

/** 줄 하나의 그림: 마감은 오늘에서 마감일까지 가는 1px 선 + ◆, 하는 중은 분야색 틴트 얇은 막대 + 모이는 날 점. */
function Track({ r }: { r: WeekRow }) {
  if (r.kind === 'due') {
    return (
      <span className="act-wk__track" aria-hidden="true">
        {r.day > r.from && <span className="act-wk__wait" style={{ left: at(r.from), width: `${((r.day - r.from) / 7) * 100}%` }} />}
        <span className="act-wk__due" data-near={r.near || undefined} style={{ left: at(r.day) }} />
      </span>
    );
  }
  return (
    <span className="act-wk__track" aria-hidden="true">
      <span className="act-wk__bar" style={span(r.from, r.to)} />
      {r.meets.map(d => <span key={d} className="act-wk__meet" style={{ left: at(d) }} />)}
    </span>
  );
}

const sayRow = (r: WeekRow, w: Week) => {
  if (r.kind === 'due') return `${r.title}, ${rowNote(r)}, ${w.days[r.day].name}요일`;
  return `${r.title}, 하는 중${r.every ? `, ${r.every} ${r.meetName}요일` : ''}`;
};

/**
 * 이번 주(월~일) 날짜 축 하나에 마감과 하는 중인 활동을 놓는다. 요일 칸 선은 그림 아래까지 이어지고, 오늘은 1px 주황 선 하나.
 * 줄 전체가 버튼이라 누르면 그 활동 서랍이 열린다. 줄이 없으면 같은 틀을 옅게 두고 그 위에 empty(한 줄 + 버튼)를 놓는다.
 */
export function WeekPic({ week, onOpen, empty }: { week: Week; onOpen: (id: string) => void; empty?: ReactNode }) {
  return (
    <div className="act-wk" role="group" aria-label="이번 주 일정">
      <div className="act-wk__head" aria-hidden="true">
        <span />
        {week.days.map(d => (
          <span key={d.iso} className="act-wk__day" data-today={d.today || undefined}>
            {d.name} <b className="num">{d.date}</b>{d.today && <em>오늘</em>}
          </span>
        ))}
      </div>
      <div className="act-wk__body" data-fill>
        <div className="act-wk__lanes" aria-hidden="true">
          {week.days.map(d => <span key={d.iso} data-today={d.today || undefined} />)}
        </div>
        {week.rows.length === 0 && (
          <>
            <div className="act-wk__ghost" aria-hidden="true"><span /><span /><span /></div>
            <div className="act-wk__empty">{empty}</div>
          </>
        )}
        {week.rows.length > 0 && <ul className="act-wk__rows">
          {week.rows.map(r => (
            <li key={r.id} className={`ui-dg-tone--${r.tone}`}>
              <button type="button" className="act-wk__row" aria-haspopup="dialog" aria-label={sayRow(r, week)} onClick={() => onOpen(r.id)}>
                <span className="act-wk__label">
                  <span className="act-wk__name">{r.title}</span>
                  <span className="act-wk__note" data-near={(r.kind === 'due' && r.near) || undefined}>{rowNote(r)}</span>
                </span>
                <Track r={r} />
              </button>
            </li>
          ))}
        </ul>}
      </div>
    </div>
  );
}
