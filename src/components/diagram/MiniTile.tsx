import type { ReactNode } from 'react';
import { Icon } from '../Icon';

type Props = {
  title: string;
  /** 한 줄 캡션(25자 안팎) */
  line?: string;
  /** 오른쪽 위 작은 표시(예: 확인할 발견 개수 배지) */
  badge?: ReactNode;
  /** 작은 그림. 타일 전체가 링크라서 그림 안에는 누르는 요소를 두지 않는다 */
  children: ReactNode;
} & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

/** 작은 그림 슬롯 + 제목 + 한 줄 + 화살표. 타일 전체가 하나의 링크(또는 버튼)다. */
export function MiniTile({ title, line, badge, children, ...go }: Props) {
  const body = (
    <>
      <span className="ui-dg-tile__pic" aria-hidden="true">{children}</span>
      <span className="ui-dg-tile__text">
        <span className="ui-dg-tile__title">{title}{badge}</span>
        {line && <span className="ui-dg-tile__line">{line}</span>}
      </span>
      <span className="ui-dg-tile__arrow" aria-hidden="true"><Icon name="chevron" /></span>
    </>
  );
  return 'href' in go && go.href !== undefined
    ? <a className="ui-dg-tile" href={go.href}>{body}</a>
    : <button type="button" className="ui-dg-tile" onClick={go.onSelect}>{body}</button>;
}
