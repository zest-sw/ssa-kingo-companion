import { useEffect, useRef, type ReactNode } from 'react';
import { setPageScrollTop } from './pageScroll';

type Props = {
  title: ReactNode;
  /** 오른쪽 주 행동. 하나만 둔다 */
  actions?: ReactNode;
  /**
   * 작은 회색 구역 이름(설정 화면처럼). 요약 화면에서는 쓰지 않는다.
   * @deprecated 제목 위 눈썹 라벨은 템플릿 장식처럼 읽힌다. 새로 쓰지 않는다(쓰던 곳은 그대로 보인다).
   */
  eyebrow?: ReactNode;
  /**
   * 흐름 화면(신청 준비, 회고 인터뷰)에서만 준다. 빵부스러기 '부모 › 이 화면' 한 줄을 그리고, 부모 칸이 돌아가는 유일한 길이다.
   * 사이드바에 있는 화면은 주지 않는다(사이드바가 위치를 보여 준다). 앱 쪽에서는 parentLink('activities/records') 로 만든다.
   */
  parent?: { label: string; href: string };
  /** 빵부스러기 끝 이름. 제목이 길 때 짧게. 없으면 제목 */
  crumb?: string;
  /** 구역 탭 줄(SectionTabs). 내 활동·나의 분석의 요약·하위 화면에만 둔다. 흐름 화면(parent 가 있는 화면)에는 두지 않는다 */
  tabs?: ReactNode;
};

/**
 * 본문 머리: 제목 + 오른쪽 주 행동 1개. 흐름 화면이면 제목 위에 빵부스러기 한 줄. 뒤로 버튼은 두지 않는다(브라우저 뒤로 가기는 그대로 된다).
 * 제목(h1)은 화면을 옮길 때 앱 틀이 포커스를 준다(data-page-title). 흐름 화면은 열릴 때 맨 위에서 시작하고 제목에 포커스가 간다.
 */
export function PageHeader({ eyebrow, title, actions, parent, crumb, tabs }: Props) {
  const h1 = useRef<HTMLHeadingElement>(null);
  const isFlow = parent !== undefined;
  useEffect(() => {
    if (!isFlow) return;
    setPageScrollTop(0);
    h1.current?.focus({ preventScroll: true });
  }, [isFlow]);

  const head = (
    <header className={`ui-page-head${tabs && !isFlow ? ' ui-page-head--tabs' : ''}`}>
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
  // 탭 줄은 머리 바로 아래 형제로 둔다(.os 틀이 머리·탭·본문을 차례로 쌓는다).
  return tabs && !isFlow ? <>{head}{tabs}</> : head;
}
