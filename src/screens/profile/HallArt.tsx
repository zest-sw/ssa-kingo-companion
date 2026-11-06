// 전당 배경: 얇은 선의 기둥과 아치, 바닥 줄. 무대(카드 행렬 칸) 뒤에 깔고 그 크기에 맞춰 늘린다(선 굵기는 그대로).
// 아치 꼭대기가 카드 바로 위로 보이고 바닥 줄이 버튼 아래에 오도록, 무대 높이(약 400)에 맞춘 좌표다. 장식이라 옅게 깔고 읽지 않는다(aria-hidden).
const W = 1200;
const H = 400;
const ARCHES = 5;
/** 위 처마 줄 */
const EAVE = 8;
/** 아치 꼭대기. 카드 윗변(무대 위 여백)보다 조금 위 */
const APEX = 28;
/** 바닥 줄 */
const FLOOR = H - 28;

export function HallArt() {
  const span = W / ARCHES;
  return (
    <svg className="hall-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`M0 ${EAVE} H${W} M0 ${EAVE + 8} H${W}`} />
      {Array.from({ length: ARCHES }, (_, i) => {
        const x0 = i * span + 24;
        const x1 = (i + 1) * span - 24;
        const r = (x1 - x0) / 2;
        return (
          <g key={i}>
            <path d={`M${x0} ${FLOOR} V${APEX + r} A${r} ${r} 0 0 1 ${x1} ${APEX + r} V${FLOOR}`} />
            <path d={`M${x0 - 10} ${FLOOR} V${EAVE + 16} M${x0 - 2} ${FLOOR} V${EAVE + 16}`} />
          </g>
        );
      })}
      <path d={`M${W - 14} ${FLOOR} V${EAVE + 16} M${W - 6} ${FLOOR} V${EAVE + 16}`} />
      <path d={`M0 ${FLOOR} H${W} M0 ${FLOOR + 12} H${W}`} />
    </svg>
  );
}
