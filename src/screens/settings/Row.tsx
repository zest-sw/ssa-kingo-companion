import type { ReactNode } from 'react';

/** 설정 한 줄: 왼쪽 제목·설명, 오른쪽 조작(스위치, 배지 등) */
export function Row({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <li className="st-row">
      <div className="st-row__text">
        <p className="st-row__title">{title}</p>
        {sub && <p className="st-row__sub">{sub}</p>}
      </div>
      {children && <div className="st-row__control">{children}</div>}
    </li>
  );
}

/** 제목 달린 설정 묶음. 묶음 사이는 선으로만 나눈다 */
export function Group({ title, sub, action, children }: { title: string; sub?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="st-group" aria-label={title}>
      <div className="st-group__head">
        <div>
          <h2 className="st-group__title">{title}</h2>
          {sub && <p className="st-group__sub">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
