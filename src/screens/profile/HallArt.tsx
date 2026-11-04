// 전당 배경: 얇은 선의 기둥과 아치, 바닥 줄. 장식이라 옅게 깔고 읽지 않는다(aria-hidden).
const W = 1200;
const H = 400;
const ARCHES = 5;

export function HallArt() {
  const span = W / ARCHES;
  return (
    <svg className="hall-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d={`M0 40 H${W} M0 52 H${W}`} />
      {Array.from({ length: ARCHES }, (_, i) => {
        const x0 = i * span + 24;
        const x1 = (i + 1) * span - 24;
        const r = (x1 - x0) / 2;
        return (
          <g key={i}>
            <path d={`M${x0} ${H - 40} V${120 + r} A${r} ${r} 0 0 1 ${x1} ${120 + r} V${H - 40}`} />
            <path d={`M${x0 - 10} ${H - 40} V64 M${x0 - 2} ${H - 40} V64`} />
          </g>
        );
      })}
      <path d={`M${W - 14} ${H - 40} V64 M${W - 6} ${H - 40} V64`} />
      <path d={`M0 ${H - 40} H${W} M0 ${H - 24} H${W} M0 ${H - 8} H${W}`} />
    </svg>
  );
}
