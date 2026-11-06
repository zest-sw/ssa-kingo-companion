import type { ReactNode } from 'react';

/** 정의 목록 한 줄: 왼쪽 옅은 이름, 오른쪽 값(+ 옅은 보충). 기회 자세히의 사실과 얻는 것이 같은 모양을 쓴다. */
export function Fact({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: string }) {
  return (
    <div className="rec-dl__row">
      <dt>{label}</dt>
      <dd>
        {value}
        {sub && <span className="rec-dl__sub">{sub}</span>}
      </dd>
    </div>
  );
}
