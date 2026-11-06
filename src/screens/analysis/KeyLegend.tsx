/**
 * 분석 그림의 범례. 모양은 공용 Legend(ui-dg-legend: 12px, 기호 16px 칸, 간격 4/16)와 같고, 기호만 그림 속 선·칸을 그대로 줄여 쓴다.
 * 자리: 카드 머리가 있으면 머리 오른쪽, 없으면 그림 아래 왼쪽 한 줄.
 */
export function KeyLegend({ items, label = '범례' }: { items: { label: string; key: string }[]; label?: string }) {
  return (
    <ul className="ui-dg-legend an-keylegend" aria-label={label}>
      {items.map(it => (
        <li key={it.label}>
          <span className="an-keylegend__mark" aria-hidden="true"><span className={it.key} /></span>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
