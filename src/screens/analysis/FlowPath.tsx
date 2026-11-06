import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useWidth } from '../../components';
import type { FlowRow } from '../../domain/analysis/flow';
import { semesterLabel } from '../../domain/analysis/semester';
import { semesterShort } from '../../domain/analysis/visual';
import type { FieldGroup } from '../../domain/types';
import { josa } from '../../domain/text';
import { GROUP_LABEL } from '../../domain/vocab';

// 그림 치수. CSS 는 style 변수로 같은 값을 받는다.
/** 분야 한 줄 높이: 남는 높이를 나눠 쓰되 이 사이에서. 너무 크면 점이 흩어져 흐름이 안 읽힌다 */
const ROW_MIN = 36;
const ROW_MAX = 88;
/** 학기 이름 칸 높이(--fl-head, space-8) */
const HEAD = 32;
const DOT_R = 5;
const DOT_GAP = 3;
const MAX_DOTS = 5;

type Props = {
  rows: FlowRow[];
  groups: FieldGroup[];
  tops: (FieldGroup | null)[];
  /** 다시 보기 중이면 지금까지 보여 준 학기 칸 번호, 아니면 null(전체) */
  upto: number | null;
  onPick: (i: number) => void;
};

/**
 * 관심 흐름의 길: 가로는 학기, 세로는 분야. 기록 하나 = 점 하나, 선은 학기마다 가장 많이 한 분야를 잇는다(Hero's Path).
 * 기록이 없는 학기는 옅은 칸으로만 둔다. 경고하지 않는다.
 */
export function FlowPath({ rows, groups, tops, upto, onPick }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(640);
  const [box, boxH] = useHeight<HTMLDivElement>();
  const colW = width / Math.max(1, rows.length);
  const ROW_H = Math.round(Math.min(ROW_MAX, Math.max(ROW_MIN, (boxH - HEAD) / Math.max(1, groups.length))));
  const h = groups.length * ROW_H;
  const cx = (i: number) => (i + 0.5) * colW;
  const cy = (g: FieldGroup) => (groups.indexOf(g) + 0.5) * ROW_H;
  const seen = (i: number) => upto === null || i <= upto;

  const pts = tops.flatMap((g, i) => (g && seen(i) ? [[cx(i), cy(g)] as const] : []));
  // 학기 사이는 가로로 부드럽게 휘는 곡선. 분야를 옮겨 간 곳이 비탈처럼 보인다.
  const d = pts.map(([x, y], k) => {
    if (k === 0) return `M${x},${y}`;
    const [px, py] = pts[k - 1];
    const mx = (px + x) / 2;
    return `C${mx},${py} ${mx},${y} ${x},${y}`;
  }).join(' ');

  const style = { '--fl-n': rows.length, '--fl-rows': groups.length, '--fl-row-h': `${ROW_H}px`, '--fl-row-min': `${ROW_MIN}px`, '--fl-row-max': `${ROW_MAX}px` } as CSSProperties;

  return (
    <div ref={box} className={`fl-map${upto !== null ? ' is-playing' : ''}`} style={style} data-fill>
      <ul className="fl-groups" aria-hidden="true">
        {groups.map(g => <li key={g} className={`an-g--${g}`}><span className="fl-groups__dot" />{GROUP_LABEL[g]}</li>)}
      </ul>
      <div className="fl-plot" ref={ref}>
        <div className="fl-cols">
          {rows.map((r, i) => {
            const label = semesterShort(r.semester);
            const cls = ['fl-col', upto === i && 'is-now', !seen(i) && 'is-ahead'].filter(Boolean).join(' ');
            if (r.total === 0) {
              return <div key={r.semester} className={`${cls} is-empty`} title="기록이 없는 학기예요"><span className="fl-col__sem">{label}</span></div>;
            }
            const top = tops[i];
            return (
              <button
                key={r.semester} type="button" className={cls} onClick={() => onPick(i)}
                aria-label={`${semesterLabel(r.semester)}: 기록 ${r.total}개${top ? `, ${GROUP_LABEL[top]}${josa(GROUP_LABEL[top], '이', '가')} 가장 많아요` : ''}. 자세히 보기`}
              >
                <span className="fl-col__sem">{label}</span>
              </button>
            );
          })}
        </div>
        <svg className="fl-svg" width={width} height={h} aria-hidden="true">
          {groups.map(g => <line key={g} className="fl-guide" x1={0} x2={width} y1={cy(g)} y2={cy(g)} />)}
          {pts.length > 1 && <path className="fl-path" d={d} />}
          {rows.map((r, i) => seen(i) && r.segments.map(s => {
            const k = Math.min(s.count, MAX_DOTS);
            const w = k * 2 * DOT_R + (k - 1) * DOT_GAP;
            const x0 = cx(i) - w / 2 + DOT_R;
            return (
              <g key={`${r.semester}-${s.group}`} className={`fl-cell an-g--${s.group}`}>
                {Array.from({ length: k }, (_, j) => <circle key={j} className="fl-dot" cx={x0 + j * (2 * DOT_R + DOT_GAP)} cy={cy(s.group)} r={DOT_R} />)}
                {s.count > MAX_DOTS && <text className="fl-more" x={x0 + w} y={cy(s.group) - DOT_R - 2}>+{s.count - MAX_DOTS}</text>}
              </g>
            );
          }))}
        </svg>
      </div>
    </div>
  );
}

/** 칸이 받은 높이(그림이 남는 높이를 채우게). 처음엔 0 이라 가장 낮은 줄 높이로 그린다 */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setH(el.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, h] as const;
}
