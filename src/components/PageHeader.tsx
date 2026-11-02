import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  title: ReactNode;
  /** 오른쪽 주 행동. L1 에서는 하나만 둔다 */
  actions?: ReactNode;
  /** 작은 회색 구역 이름. L1 개요에서는 쓰지 않는다(설명 문단 없음) */
  eyebrow?: ReactNode;
  /**
   * 있으면 L2(상세) 머리다. 빵부스러기 '메뉴 › 상세'와 뒤로 버튼을 그리고, 뒤로는 parent.href(그 메뉴의 L1)로 간다.
   * 앱 쪽에서는 l1Of('activities') 로 만든다.
   */
  parent?: { label: string; href: string };
  /** 빵부스러기 끝 이름. 제목이 길 때 짧게. 없으면 제목 */
  crumb?: string;
};

/**
 * 본문 머리. L1: 제목 + 오른쪽 주 행동 1개. L2: 빵부스러기 + 뒤로 버튼 + 제목.
 * 제목(h1)은 화면을 옮길 때 앱 틀이 포커스를 준다(data-page-title). L2 는 열릴 때 맨 위에서 시작하고 제목에 포커스가 간다.
 */
export function PageHeader({ eyebrow, title, actions, parent, crumb }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const isL2 = parent !== undefined;
  useEffect(() => {
    if (!isL2) return;
    window.scrollTo({ top: 0 });
    h1.current?.focus({ preventScroll: true });
  }, [isL2]);

  return (
    <header className={['ui-page-head', isL2 && 'ui-page-head--l2'].filter(Boolean).join(' ')}>
      {parent && (
        <a className="ui-page-head__back" href={parent.href} aria-label={`${parent.label}(으)로 돌아가기`} title={`${parent.label}(으)로`}>
          <Icon name="back" />
        </a>
      )}
      <div className="ui-page-head__text">
        {parent && (
          <nav className="ui-crumbs" aria-label="현재 위치">
            <a href={parent.href}>{parent.label}</a>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{crumb ?? title}</span>
          </nav>
        )}
        {!parent && eyebrow && <p className="ui-page-head__eyebrow">{eyebrow}</p>}
        <h1 ref={h1} tabIndex={-1} data-page-title className="ui-page-head__title">{title}</h1>
      </div>
      {actions && <div className="ui-page-head__actions">{actions}</div>}
    </header>
  );
}
