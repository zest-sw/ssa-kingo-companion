import { Fragment, useMemo } from 'react';
import { useLinkPaths, type DotItem, type GridAxisItem } from '../../components';
import { mapLinks } from './map';

/**
 * 기록 지도: 학기 흐름(가로) 위에 분야마다 점과 이름이 놓이고, 같은 분야의 앞뒤 학기 기록은 분야색 선으로 이어진다.
 * 칸 선은 그리지 않는다. 학기 이름은 위 한 줄 눈금, 분야 사이는 여백으로 나눈다.
 * 채운 점 = 학교 확인, 테두리 점 = 직접 입력. 점을 누르면 그 기록 서랍이 열린다.
 */
export function RecordMap({ label, rows, cols, items, selectedId, onSelect }: {
  label: string; rows: GridAxisItem[]; cols: GridAxisItem[]; items: DotItem[]; selectedId?: string; onSelect: (id: string) => void;
}) {
  const links = useMemo(() => {
    const tone = new Map(items.map(i => [i.id, i.tone ?? 'global']));
    return mapLinks(items, cols).map(l => ({ key: `${l.from}>${l.to}`, ...l, className: `rm__line rm-tone--${tone.get(l.to)}` }));
  }, [items, cols]);
  const { wrap, nodeRef, paths } = useLinkPaths<HTMLDivElement>(links);

  return (
    <div ref={wrap} className="rm" role="group" aria-label={label} style={{ gridTemplateColumns: `fit-content(var(--rm-label-w)) repeat(${cols.length}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${rows.length}, minmax(var(--rm-row-min), 1fr))` }}>
      <svg className="rm__lines" aria-hidden="true">
        {paths.map(p => <path key={p.key} d={p.d} className={p.className} />)}
      </svg>
      <span className="rm__corner" />
      {cols.map(c => <span key={c.id} className="rm__col"><span>{c.label}</span></span>)}
      {rows.map(r => (
        <Fragment key={r.id}>
          <span className="rm__row">{r.label}</span>
          {cols.map(c => (
            <div key={c.id} className="rm__cell">
              {items.filter(i => i.row === r.id && i.col === c.id).map(i => (
                <button
                  key={i.id} ref={nodeRef(i.id)} type="button" className="rm__item" aria-pressed={selectedId === i.id} title={i.tip ?? i.label}
                  aria-label={`${i.label}, ${r.label}, ${c.label}, ${i.filled ? '학교 확인' : '직접 입력'}`} onClick={() => onSelect(i.id)}
                >
                  <span className={`rm__dot rm-tone--${i.tone ?? 'global'}`} data-filled={i.filled} aria-hidden="true" />
                  <span className="rm__label">{i.label}</span>
                </button>
              ))}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
