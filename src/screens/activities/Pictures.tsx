import type { StatusBar } from './visual';

// 내 활동 요약의 그림. 모든 표시는 그 학생의 활동·기록이고 이름표는 그림 안에 직접 붙인다.

/** 할 것·하는 중·끝난 것 상태 막대(라벨 + 개수). 길이는 가장 큰 칸 기준의 개수 비교다. */
export function StatusBarsPic({ bars }: { bars: StatusBar[] }) {
  const max = Math.max(1, ...bars.map(b => b.count));
  return (
    <ul className="act-sb" aria-label="상태별 활동 수">
      {bars.map(b => (
        <li key={b.id} className="act-sb__row">
          <span className="act-sb__label">{b.label}</span>
          <span className="act-sb__track"><span className={`act-sb__bar act-sb__bar--${b.id}`} style={{ width: `${(b.count / max) * 100}%` }} /></span>
          <b className="act-sb__n num">{b.count}</b>
        </li>
      ))}
    </ul>
  );
}
