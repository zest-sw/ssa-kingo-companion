import type { ReactNode } from 'react';

/**
 * 본문 머리: 작은 회색 구역 이름, 큰 제목, 오른쪽 주요 행동 1~2개.
 * 제목(h1)은 화면을 옮길 때 앱 틀이 포커스를 준다(data-page-title).
 */
export function PageHeader({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="ui-page-head">
      <div className="ui-page-head__text">
        {eyebrow && <p className="ui-page-head__eyebrow">{eyebrow}</p>}
        <h1 tabIndex={-1} data-page-title className="ui-page-head__title">{title}</h1>
      </div>
      {actions && <div className="ui-page-head__actions">{actions}</div>}
    </header>
  );
}
