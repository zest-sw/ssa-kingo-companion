import type { CSSProperties, ReactNode } from 'react';
import type { FieldGroup } from '../../domain/types';

/** 조각 색. 분야 묶음 색이 기본이고, 오늘·마감 임박만 accent, 분야와 상관없는 표시(마감 ◆·발표 ○)는 ink, 의미 없는 것은 muted, todo·doing·done 은 활동 상태. */
export type DiagramTone = FieldGroup | 'accent' | 'muted' | 'ink' | 'todo' | 'doing' | 'done';

export const toneClass = (tone: DiagramTone = 'muted') => `ui-dg-tone--${tone}`;

type Props = {
  /** 스크린 리더가 읽는 값. 이름과 날짜·개수를 함께 쓴다('AI 데이터 분석 경진대회, 마감 10월 15일') */
  label: string;
  /** hover·포커스 때 뜨는 한 줄. 없으면 label */
  tip?: string;
  tipAlign?: 'start' | 'center' | 'end';
  onSelect: () => void;
  selected?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * 다이어그램의 모든 조각(점·막대·노드)은 이 버튼이다. 그래서 클릭·Enter·Space·포커스 링이 저절로 된다.
 * 툴팁은 CSS 로 그린다(data-tip). 보이는 모양은 children 이나 className 으로 준다.
 */
export function Piece({ label, tip, tipAlign = 'center', onSelect, selected, className, style, children }: Props) {
  return (
    <button
      type="button"
      className={['ui-dg-piece', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={label}
      aria-pressed={selected === undefined ? undefined : selected}
      data-tip={tip ?? label}
      data-tip-align={tipAlign}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}
