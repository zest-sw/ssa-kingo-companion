import type { ReactNode } from 'react';
import { toneClass, type DiagramTone } from './Piece';

export type LegendMark = 'dot' | 'ring' | 'dashed' | 'diamond' | 'circle' | 'fill' | 'hatch' | 'faded' | 'today';
export type LegendItem = { label: string; mark: LegendMark; tone?: DiagramTone };

type Props = {
  items: LegendItem[];
  label?: string;
  /**
   * 'below'(기본): 그림 아래 한 줄, 그림과 떨어뜨린다.
   * 'head': 카드·칸 머리 줄 안. 위 여백 없이 머리 줄 높이에 맞춘다. Card action 안이면 따로 주지 않아도 된다.
   */
  place?: 'below' | 'head';
};

/** 그림 옆 한 줄 범례. 그림 안의 모양과 같은 클래스를 써서 생김새가 늘 같다. */
export function Legend({ items, label = '범례', place }: Props) {
  if (!items.length) return null;
  return (
    <LegendList label={label} place={place}>
      {items.map(it => (
        <li key={it.label + it.mark} className={toneClass(it.tone)}>
          <span className={`ui-dg-legend__mark ui-dg-mark--${it.mark}`} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </LegendList>
  );
}

/** 범례 틀(글자 크기·간격·여백). 기호가 그림 모양이 아닌 범례(확인 점 등)도 이 틀을 쓴다 */
export function LegendList({ label = '범례', place, className, children }: { label?: string; place?: 'below' | 'head'; className?: string; children: ReactNode }) {
  return (
    <ul className={`ui-dg-legend${className ? ` ${className}` : ''}`} aria-label={label} data-place={place === 'head' ? 'head' : undefined}>
      {children}
    </ul>
  );
}
