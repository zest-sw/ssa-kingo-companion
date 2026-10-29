import type { ReactNode } from 'react';

/** 큰 숫자 하나. 홈의 '이번 학기 숫자', 추천의 '마감 D-3' 칸. 횟수·마감만 쓰고 점수는 쓰지 않는다. */
export function Stat({ label, value, unit, sub, tone = 'default' }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: 'default' | 'accent' }) {
  return (
    <div className="ui-stat">
      <span className="ui-stat__label">{label}</span>
      <span className={`ui-stat__value num${tone === 'accent' ? ' ui-stat__value--accent' : ''}`}>
        {value}{unit && <span className="ui-stat__unit">{unit}</span>}
      </span>
      {sub && <span className="ui-stat__sub">{sub}</span>}
    </div>
  );
}
