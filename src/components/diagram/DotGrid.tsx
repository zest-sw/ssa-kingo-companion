import type { ReactNode } from 'react';
import { layoutGrid } from './geometry';
import { Piece, toneClass, type DiagramTone } from './Piece';

export type DotItem = {
  id: string;
  row: string;
  col: string;
  /** 채운 점(예: 학교 확인) / 테두리 점(예: 직접 입력) */
  filled: boolean;
  label: string;
  tone?: DiagramTone;
  tip?: string;
};
export type GridAxisItem = { id: string; label: string };

type Props = {
  label: string;
  rows: GridAxisItem[];
  cols: GridAxisItem[];
  items: DotItem[];
  onSelect: (id: string) => void;
  empty: ReactNode;
  selectedId?: string;
};

/** 행·열 격자에 점. 한 칸에 여러 개면 칸 안에서 줄을 바꿔 놓는다. 행·열에 없는 항목은 그리지 않는다. */
export function DotGrid({ label, rows, cols, items, onSelect, empty, selectedId }: Props) {
  const { cells } = layoutGrid(rows.map(r => r.id), cols.map(c => c.id), items);
  const placed = cells.some(row => row.some(c => c.items.length));
  return (
    <div className="ui-dg ui-dg-grid" role="group" aria-label={label} style={{ gridTemplateColumns: `fit-content(var(--dg-label-w)) repeat(${Math.max(1, cols.length)}, minmax(0, 1fr))` }}>
      <span className="ui-dg-grid__corner" />
      {cols.map(c => <span key={c.id} className="ui-dg-grid__col" title={c.label}>{c.label}</span>)}
      {rows.map((r, ri) => (
        <div key={r.id} className="ui-dg-grid__line" style={{ gridColumn: `1 / span ${cols.length + 1}` }}>
          <span className="ui-dg-grid__row" title={r.label}>{r.label}</span>
          {cells[ri].map((cell, ci) => (
            <div key={cell.col} className="ui-dg-grid__cell">
              {cell.items.map(it => {
                const colLabel = cols[ci].label;
                return (
                  <Piece
                    key={it.id} label={`${it.label}, ${r.label}, ${colLabel}`} tip={it.tip ?? it.label}
                    tipAlign={cols.length > 1 && ci === 0 ? 'start' : cols.length > 1 && ci === cols.length - 1 ? 'end' : 'center'}
                    className={`ui-dg-grid__dot ui-dg-mark--${it.filled ? 'dot' : 'ring'} ${toneClass(it.tone)}`}
                    selected={selectedId === undefined ? undefined : selectedId === it.id}
                    onSelect={() => onSelect(it.id)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ))}
      {!placed && <p className="ui-dg-empty ui-dg-empty--block" style={{ gridColumn: `1 / span ${cols.length + 1}` }}>{empty}</p>}
    </div>
  );
}
