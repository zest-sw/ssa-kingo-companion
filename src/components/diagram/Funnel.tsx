import type { ReactNode } from 'react';
import { funnelRatios } from './geometry';
import { Piece } from './Piece';

export type FunnelStep = { id: string; label: string; count: number };

type Props = {
  label: string;
  steps: FunnelStep[];
  onSelect: (id: string) => void;
  unit?: string;
  empty: ReactNode;
  selectedId?: string;
};

/** 단계별 가로 막대 + 개수. 행 전체가 버튼이다. 마지막 단계만 진한 색으로 '결과'임을 보인다. */
export function Funnel({ label, steps, onSelect, unit = '개', empty, selectedId }: Props) {
  const parts = funnelRatios(steps.map(s => s.count));
  if (!steps.length) return <div className="ui-dg"><p className="ui-dg-empty ui-dg-empty--block">{empty}</p></div>;
  return (
    <ol className="ui-dg ui-dg-funnel" aria-label={label}>
      {steps.map((s, i) => {
        const kept = parts[i].keptFromPrev;
        const tip = kept === undefined ? `${s.label} ${s.count}${unit}` : `앞 단계에서 ${Math.round(kept * 100)}% 남았어요`;
        return (
          <li key={s.id}>
            <Piece
              label={`${s.label} ${s.count}${unit}`} tip={tip} tipAlign="start"
              className="ui-dg-funnel__step" selected={selectedId === undefined ? undefined : selectedId === s.id}
              onSelect={() => onSelect(s.id)}
            >
              <span className="ui-dg-funnel__label">{s.label}</span>
              <span className="ui-dg-funnel__track">
                <span className="ui-dg-funnel__fill" data-last={i === steps.length - 1} style={{ width: `${(parts[i].ratio * 100).toFixed(2)}%` }} />
              </span>
              <span className="ui-dg-funnel__count">{s.count}<small>{unit}</small></span>
            </Piece>
          </li>
        );
      })}
    </ol>
  );
}
