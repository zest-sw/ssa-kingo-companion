import { Fragment } from 'react';
import type { DotItem, GridAxisItem } from '../../components';

/**
 * 기록 지도: 가로 = 학기, 세로 = 분야 묶음, 점 = 기록. 점마다 기록 이름을 바로 붙인다(직접 라벨).
 * 채운 점 = 학교 확인, 테두리 점 = 직접 입력. 점을 누르면 오른쪽 보관함에서 그 기록이 펼쳐진다.
 */
export function RecordMap({ label, rows, cols, items, selectedId, onSelect, empty }: {
  label: string; rows: GridAxisItem[]; cols: GridAxisItem[]; items: DotItem[]; selectedId?: string; onSelect: (id: string) => void; empty: string;
}) {
  return (
    <div className="rm" role="group" aria-label={label} style={{ gridTemplateColumns: `fit-content(var(--rm-label-w)) repeat(${cols.length}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${rows.length}, minmax(var(--rm-row-min), 1fr))` }}>
      <span className="rm__corner" />
      {cols.map(c => <span key={c.id} className="rm__col">{c.label}</span>)}
      {rows.map(r => (
        <Fragment key={r.id}>
          <span className="rm__row">{r.label}</span>
          {cols.map(c => (
            <div key={c.id} className="rm__cell">
              {items.filter(i => i.row === r.id && i.col === c.id).map(i => (
                <button
                  key={i.id} type="button" className="rm__item" aria-pressed={selectedId === i.id} title={i.tip ?? i.label}
                  aria-label={`${i.label}, ${r.label}, ${c.label}, ${i.filled ? '학교 확인' : '직접 입력'}`} onClick={() => onSelect(i.id)}
                >
                  <span className="rm__dot" data-tone={i.tone} data-filled={i.filled} aria-hidden="true" />
                  <span className="rm__label">{i.label}</span>
                </button>
              ))}
            </div>
          ))}
        </Fragment>
      ))}
      {items.length === 0 && <p className="rm__empty">{empty}</p>}
    </div>
  );
}
