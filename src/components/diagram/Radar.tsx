// 육각형 레이더. 축 6개의 값은 점수가 아니라 센 개수다. 실선+옅은 채움 = 확인한 수, 점선 윤곽 = AI 추정까지 합친 수.
// 이름표는 꼭짓점에 직접 붙이고, 같은 수치를 읽을 표를 화면 밖에 둔다(스크린 리더).
import { useLayoutEffect, useRef, useState } from 'react';
import './radar.css';

export type RadarVertex = {
  key: string;
  name: string;
  /** 실선·채움으로 그릴 값(확인한 수) */
  solid: number;
  /** 점선 윤곽으로 그릴 값(AI 추정까지 합친 수). solid 이상 */
  dashed: number;
  /** 이름표 둘째 줄. 예: '확인 2 · 전체 5'. 첫 조각이 진하게 보인다 */
  sub: string;
  /** 이름표만 조금 진하게 */
  strong?: boolean;
};

type Props = {
  vertices: RadarVertex[];
  /** 바깥 육각형이 뜻하는 개수 */
  max: number;
  /** 동심 육각형 눈금(개수). 위 축에 한 번만 적는다 */
  ticks: number[];
  label: string;
  /** 비교용 가는 선(지난 나와 비교할 때의 '지금'). vertices 와 같은 순서의 값 */
  trace?: number[];
  selected?: string | null;
  /** 있으면 꼭짓점을 눌러 고른다 */
  onSelect?: (key: string) => void;
  radius?: number;
  /** 칸이 주는 폭·높이 중 작은 쪽에 맞춰 크기를 정한다(칸이 높이를 가져야 한다). radius 는 처음 값 */
  fit?: boolean;
  /** 이름표·눈금·표 없이 모양만. 요약 판의 작은 그림 */
  mini?: boolean;
  /** 근거가 아직 없을 때: 윤곽만 */
  empty?: boolean;
  unit?: string;
};

const SIDE = 112;
const TOP = 52;
/** '확인 2 · 전체 11' 처럼 ' · ' 로 이은 이름표 둘째 줄. 부분/전체는 앱 전체가 '확인 n / 전체 m' 이라 '/' 로 다시 잇고, 앞 조각(확인한 수)을 더 진하게 그린다 */
const subParts = (s: string) => s.split(' · ');
const rad = (k: number) => ((-90 + 60 * k) * Math.PI) / 180;

const R_MIN = 64;
const R_MAX = 240;

export function Radar({ vertices, max, ticks, label, trace, selected, onSelect, radius = 104, fit, mini, empty, unit = '개' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!fit || !el) return;
    const read = () => setRoom({ w: el.clientWidth, h: el.clientHeight });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);
  // 글자는 늘 같은 크기로 두고 육각형만 키운다: 이름표 자리(SIDE·TOP)를 뺀 칸 안에 들어가는 가장 큰 반지름
  const R = fit && room && room.w > 0 && room.h > 0 ? Math.max(R_MIN, Math.min(R_MAX, Math.floor(Math.min(room.w - 2 * SIDE, room.h - 2 * TOP) / 2))) : radius;
  const padX = mini ? 4 : SIDE;
  const padY = mini ? 4 : TOP;
  const W = 2 * (R + padX);
  const H = 2 * (R + padY);
  const cx = W / 2;
  const cy = H / 2;
  const pt = (k: number, v: number) => {
    const r = (Math.min(v, max) / max) * R;
    return [cx + r * Math.cos(rad(k)), cy + r * Math.sin(rad(k))] as const;
  };
  const poly = (vals: number[]) => vals.map((v, k) => pt(k, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const ring = (v: number) => poly(vertices.map(() => v));

  return (
    <div ref={box} className={`ui-radar${mini ? ' ui-radar--mini' : ''}${fit ? ' ui-radar--fit' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role={mini ? undefined : 'group'} aria-label={mini ? undefined : label} aria-hidden={mini ? true : undefined}>
        <polygon points={ring(max)} className="ui-radar__frame" />
        {!mini && ticks.filter(t => t < max).map(t => <polygon key={t} points={ring(t)} className="ui-radar__ring" />)}
        {!mini && vertices.map((v, k) => <line key={v.key} x1={cx} y1={cy} x2={pt(k, max)[0]} y2={pt(k, max)[1]} className="ui-radar__spoke" />)}
        {!empty && trace && <polygon points={poly(trace)} className="ui-radar__trace" />}
        {!empty && <polygon points={poly(vertices.map(v => v.dashed))} className="ui-radar__est" />}
        {!empty && <polygon points={poly(vertices.map(v => v.solid))} className="ui-radar__own" />}
        {!mini && !empty && vertices.map((v, k) => v.solid > 0 && <circle key={v.key} cx={pt(k, v.solid)[0]} cy={pt(k, v.solid)[1]} r={3.5} className="ui-radar__dot" />)}
        {!mini && ticks.map(t => (
          <text key={t} x={cx + 5} y={cy - (t / max) * R - 3} className="ui-radar__tick">{t}{t === ticks[ticks.length - 1] ? unit : ''}</text>
        ))}
        {!mini && vertices.map((v, k) => {
          const [x, y] = pt(k, max);
          const top = k === 0;
          const bottom = k === 3;
          const right = k === 1 || k === 2;
          const anchor = top || bottom ? 'middle' : right ? 'start' : 'end';
          const dx = top || bottom ? 0 : right ? 14 : -14;
          const y1 = top ? y - 36 : bottom ? y + 18 : y - 2;
          const hitW = 112;
          const hitX = anchor === 'middle' ? x - hitW / 2 : anchor === 'start' ? x + 6 : x - 6 - hitW;
          const sel = selected === v.key;
          return (
            <g
              key={v.key}
              className={`ui-radar__vx${sel ? ' is-selected' : ''}${v.strong ? ' is-strong' : ''}`}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-pressed={onSelect ? sel : undefined}
              aria-label={`${v.name}, ${v.sub}`}
              onClick={() => onSelect?.(v.key)}
              onKeyDown={e => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(v.key); } }}
            >
              <rect x={hitX} y={y1 - 16} width={hitW} height={44} rx={4} className="ui-radar__hit" />
              <circle cx={x} cy={y} r={sel ? 6 : 4} className="ui-radar__tip" />
              <text x={x + dx} y={y1} textAnchor={anchor} className="ui-radar__name">{v.name}</text>
              <text x={x + dx} y={y1 + 16} textAnchor={anchor} className="ui-radar__sub">{subParts(v.sub).map((t, i) => <tspan key={i} className={i === 0 ? 'ui-radar__lead' : undefined}>{i === 0 ? t : ` / ${t}`}</tspan>)}</text>
            </g>
          );
        })}
      </svg>
      {!mini && (
        <table className="sr-only">
          <caption>{label}</caption>
          <thead><tr><th scope="col">역량</th><th scope="col">확인한 근거</th><th scope="col">AI 추정까지 전체</th></tr></thead>
          <tbody>{vertices.map(v => <tr key={v.key}><th scope="row">{v.name}</th><td>{v.solid}{unit}</td><td>{v.dashed}{unit}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
