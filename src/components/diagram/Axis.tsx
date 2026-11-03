import { edgeAlign, fractionOf, inRange, pickTicks, shortDate, type DateRange } from './geometry';

const pct = (x: number) => `${(x * 100).toFixed(3)}%`;
export { pct };

/** 가로 날짜 눈금. 폭이 좁으면 눈금을 성기게 찍어 글자가 겹치지 않는다. */
export function DateAxis({ range, width, minGap = 52 }: { range: DateRange; width: number; minGap?: number }) {
  const ticks = pickTicks(range, width, minGap);
  return (
    <div className="ui-dg-axis" aria-hidden="true">
      {ticks.map(t => {
        const x = fractionOf(t, range);
        // 눈금 글자는 가운데 정렬이 기본이고, 반쯤(약 20px) 밖으로 나갈 만큼 끝에 붙은 눈금만 안쪽으로 붙인다(간격이 고르게 보이게).
        const align = width ? (x * width < 20 ? 'start' : (1 - x) * width < 20 ? 'end' : 'center') : edgeAlign(x);
        return <span key={t} className="ui-dg-axis__tick" data-align={align} style={{ left: pct(x) }}>{shortDate(t)}</span>;
      })}
    </div>
  );
}

/** 오늘 세로선. 범위 밖이면 그리지 않는다. 라벨은 위쪽 한 번만. */
export function TodayLine({ range, today }: { range: DateRange; today?: string }) {
  if (!today) return null;
  const x = fractionOf(today, range);
  if (!inRange(x)) return null;
  return (
    <span className="ui-dg-today" data-align={edgeAlign(x)} style={{ left: pct(x) }} aria-hidden="true">
      <span className="ui-dg-today__label">오늘</span>
    </span>
  );
}
