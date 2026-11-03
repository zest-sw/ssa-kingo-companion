import { useEffect, useMemo, useRef, useState } from 'react';
import type { EdgeAnswers } from '../../domain/analysis/map';
import type { FlowRow } from '../../domain/analysis/flow';
import type { TreeGlanceRow } from '../../domain/analysis/glance';
import type { StrengthRow } from '../../domain/analysis/strengths';
import { TREE_COLUMNS } from '../../domain/analysis/techtree';
import { wrapWords } from '../../domain/analysis/wrap';
import { flowBars, mapPic, strengthDots, topStrengthDots } from '../../domain/analysis/visual';
import type { RecordItem } from '../../domain/types';

// 나의 분석 요약 카드의 그림. 모든 표시는 그 학생의 기록이고, 이름표는 그림 안에 직접 붙인다.
// 카드 전체가 링크라서 여기에는 누르는 요소를 두지 않는다.

const KIND_CLASS = { done: 'is-done', ongoing: 'is-ongoing', candidate: 'is-candidate' } as const;

/** 단계 i 의 가로 위치(%). 네 단계를 같은 간격으로 둔다. */
const stageAt = (i: number) => `${((i + 0.5) / TREE_COLUMNS.length) * 100}%`;

/**
 * 분야마다 짧은 가지 하나: 시작점에서 가장 뒤 단계의 점까지 선을 긋고, 단계 위치에 점을 찍는다.
 * 해 본 단계 채운 점, 하는 중 겹테두리, 후보 점선 테두리. 안 해 본 분야는 시작점이 '?'. 칸·격자 선은 그리지 않는다.
 */
export function TreePic({ rows }: { rows: TreeGlanceRow[] }) {
  // 기타 줄은 해 본 칸이 있을 때만 그린다(없는 줄을 그려 카드를 키우지 않는다).
  const shown = rows.filter(r => r.group !== 'other' || r.cells.some(c => c === 'done' || c === 'ongoing'));
  return (
    <span className="an-tp" role="img" aria-label="분야별로 해 본 활동 단계 가지">
      <span className="an-tp__row an-tp__row--axis">
        <span />
        <span className="an-tp__track">{TREE_COLUMNS.map((c, i) => <span key={c} className="an-tp__tick" style={{ left: stageAt(i) }}>{c}</span>)}</span>
      </span>
      {shown.map(r => {
        const unknown = !r.cells.some(c => c === 'done' || c === 'ongoing');
        const last = r.cells.reduce((n, c, i) => (c ? i : n), -1);
        return (
          <span key={r.group} className={`an-tp__row an-g--${r.group}${unknown ? ' is-unknown' : ''}`}>
            <span className="an-tp__name">{r.label}</span>
            <span className="an-tp__track">
              {last >= 0 && <span className="an-tp__line" style={{ width: stageAt(last) }} />}
              <span className="an-tp__root">{unknown ? '?' : null}</span>
              {r.cells.map((c, i) => c && <span key={i} className={`an-tp__dot ${KIND_CLASS[c]}`} style={{ left: stageAt(i) }} />)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const MAP = { rowH: 40, padX: 10, padTop: 8, labelH: 22, r: 6, minW: 240 };

/** 칸 너비를 재서 그림을 늘이거나 줄이지 않고 그대로 그린다(글자가 늘 12px). 재지 못하면 기본 너비. */
function useWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState<number>(MAP.minW + 60);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(Math.max(MAP.minW, Math.floor(el.getBoundingClientRect().width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** 기록 노드 4개와 이름(낱말 단위 두 줄), 연결선(확인=실선, 추정=옅은 점선), 아래에 학기 이름. */
export function MapPic({ records, answers }: { records: RecordItem[]; answers: EdgeAnswers }) {
  const pic = useMemo(() => mapPic(records, answers, 4, undefined, 40), [records, answers]);
  const [ref, width] = useWidth();
  const colW = (width - MAP.padX * 2) / pic.semesters.length;
  const perLine = Math.max(4, Math.floor((colW - MAP.r * 2 - 12) / 12));
  const height = MAP.padTop + MAP.rowH * pic.rows + MAP.labelH;
  const at = (n: { col: number; row: number }) => ({ x: MAP.padX + colW * n.col + MAP.r + 1, y: MAP.padTop + MAP.rowH * n.row + MAP.rowH / 2 });
  const pos = Object.fromEntries(pic.nodes.map(n => [n.id, at(n)]));
  return (
    <svg ref={ref} className="an-mp" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="기록이 이어진 경험 지도">
      {pic.edges.map(e => <line key={e.id} x1={pos[e.a].x} y1={pos[e.a].y} x2={pos[e.b].x} y2={pos[e.b].y} className={e.confirmed ? 'an-mp__edge an-mp__edge--yes' : 'an-mp__edge'} />)}
      {pic.nodes.map(n => {
        const lines = wrapWords(n.label, perLine);
        return (
          <g key={n.id} className={`an-g--${n.group}`}>
            <circle cx={pos[n.id].x} cy={pos[n.id].y} r={MAP.r} className="an-mp__node" />
            <text x={pos[n.id].x + MAP.r + 5} y={pos[n.id].y - (lines.length - 1) * 7} className="an-mp__label">
              {lines.map((l, i) => <tspan key={i} x={pos[n.id].x + MAP.r + 5} dy={i === 0 ? '0.35em' : 14}>{l}</tspan>)}
            </text>
          </g>
        );
      })}
      {pic.semesters.map((sm, i) => <text key={sm} x={MAP.padX + colW * i} y={height - 4} className="an-mp__sem">{sm.replace(/^d{2}/, '').replace('-', ' ')}</text>)}
    </svg>
  );
}

/** 학기별 가로 누적 막대. 학기 이름은 왼쪽, 가장 큰 조각에 분야 이름. */
export function FlowPic({ rows }: { rows: FlowRow[] }) {
  const bars = flowBars(rows);
  return (
    <span className="an-fp" role="img" aria-label="학기별 분야 비율">
      {bars.map(b => (
        <span key={b.semester} className="an-fp__row">
          <span className="an-fp__sem">{b.label}</span>
          <span className="an-fp__bar">
            {b.segments.map(s => (
              <span key={s.group} className={`an-fp__seg an-g--${s.group}`} style={{ flexGrow: s.count }}>{s.main && <span className="an-fp__name">{s.name}</span>}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

const THREE = [1, 2, 3] as const;
const STR_ROWS = 4;

/** 역량 이름마다 점 행 두 줄: 기록(채운 점) vs 내 생각(빈 점). 둘이 다른 역량은 띠로 강조. */
export function StrengthPic({ rows }: { rows: StrengthRow[] }) {
  const { shown, more } = topStrengthDots(strengthDots(rows), STR_ROWS);
  return (
    <span className="an-sp" role="img" aria-label="역량별 기록과 내 생각 비교">
      <span className="an-sp__legend"><span className="an-gdot is-done" />기록<span className="an-gdot is-self" />내 생각</span>
      {shown.map(d => (
        <span key={d.axis} className={`an-sp__row${d.differs ? ' is-diff' : ''}`}>
          <span className="an-sp__name">{d.label}</span>
          <span className="an-sp__dots">{THREE.map(n => <span key={n} className={`an-gdot${d.seen >= n ? ' is-done' : ' is-blank'}`} />)}</span>
          <span className="an-sp__dots">{THREE.map(n => <span key={n} className={`an-gdot${d.self >= n ? ' is-self' : ' is-blank'}`} />)}</span>
        </span>
      ))}
      {more > 0 && <span className="an-sp__more">외 {more}</span>}
    </span>
  );
}
