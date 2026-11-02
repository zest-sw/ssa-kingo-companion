import { toneClass, type DiagramTone } from './Piece';

export type LegendMark = 'dot' | 'ring' | 'dashed' | 'diamond' | 'circle' | 'fill' | 'hatch' | 'faded' | 'today';
export type LegendItem = { label: string; mark: LegendMark; tone?: DiagramTone };

/** 그림 옆 한 줄 범례. 그림 안의 모양과 같은 클래스를 써서 생김새가 늘 같다. */
export function Legend({ items, label = '범례' }: { items: LegendItem[]; label?: string }) {
  if (!items.length) return null;
  return (
    <ul className="ui-dg-legend" aria-label={label}>
      {items.map(it => (
        <li key={it.label + it.mark} className={toneClass(it.tone)}>
          <span className={`ui-dg-legend__mark ui-dg-mark--${it.mark}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
