import type { ReactNode } from 'react';
import { segmentPercents } from './geometry';
import { Piece, toneClass, type DiagramTone } from './Piece';

export type Segment = { id: string; label: string; value: number; tone: DiagramTone };

type Props = {
  label: string;
  segments: Segment[];
  onSelect: (id: string) => void;
  unit?: string;
  empty: ReactNode;
  selectedId?: string;
  /** 막대 아래 한 줄 범례(이름 · 개수). 기본 켬 */
  legend?: boolean;
  /** 막대 안에 이름·개수를 적는다(상태처럼 색만으로 구분하면 안 될 때). 켜면 아래 범례는 끈다 */
  inline?: boolean;
};

/** 분야 비율 막대. 아주 작은 조각도 누를 수 있게 최소 폭을 둔다. 값이 0 인 조각은 빼고 그린다. */
export function SegmentBar({ label, segments, onSelect, unit = '개', empty, selectedId, legend = true, inline = false }: Props) {
  const shown = segments.filter(s => s.value > 0);
  const percents = segmentPercents(shown.map(s => s.value));
  if (!shown.length) return <div className="ui-dg"><p className="ui-dg-empty ui-dg-empty--block">{empty}</p></div>;
  return (
    <div className="ui-dg ui-dg-seg" role="group" aria-label={label}>
      <div className="ui-dg-seg__bar">
        {shown.map((s, i) => (
          <Piece
            key={s.id} label={`${s.label} ${s.value}${unit}, ${percents[i]}%`} tip={`${s.label} · ${s.value}${unit}`}
            tipAlign={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : 'center'}
            className={`ui-dg-seg__part ${toneClass(s.tone)}`} style={{ flexGrow: s.value }}
            selected={selectedId === undefined ? undefined : selectedId === s.id}
            onSelect={() => onSelect(s.id)}
          >
            {inline && <span className="ui-dg-seg__text">{s.label} {s.value}</span>}
          </Piece>
        ))}
      </div>
      {legend && !inline && (
        <ul className="ui-dg-legend" aria-hidden="true">
          {shown.map(s => (
            <li key={s.id} className={toneClass(s.tone)}>
              <span className="ui-dg-legend__mark ui-dg-mark--fill" />
              {s.label} <b>{s.value}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
