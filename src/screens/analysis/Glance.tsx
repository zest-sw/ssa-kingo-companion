import { useEffect, useMemo, useRef, useState } from 'react';
import type { EdgeAnswers } from '../../domain/analysis/map';
import type { FlowRow } from '../../domain/analysis/flow';
import type { TreeGlanceRow } from '../../domain/analysis/glance';
import { radarScale, radarSpots, radarSub, type Strength } from '../../domain/analysis/strengths';
import { TREE_COLUMNS } from '../../domain/analysis/techtree';
import { wrapWords } from '../../domain/analysis/wrap';
import { flowBars, mapPic } from '../../domain/analysis/visual';
import { Radar } from '../../components';
import './strengths.css';
import type { RecordItem } from '../../domain/types';
import './techtree.css';

// 나의 분석 요약 카드의 그림. 모든 표시는 그 학생의 기록이고, 이름표는 그림 안에 직접 붙인다.
// 카드 전체가 링크라서 여기에는 누르는 요소를 두지 않는다.

const KIND_CLASS = { done: 'is-done', ongoing: 'is-ongoing', skipped: 'is-skipped', candidate: 'is-candidate' } as const;

/** 단계 i 의 가로 위치(%). 세 단계(입문·중급·심화)를 같은 간격으로 둔다. */
const stagePct = (i: number) => ((i + 0.5) / TREE_COLUMNS.length) * 100;
const stageAt = (i: number) => `${stagePct(i)}%`;

/** 시작점(0%)에서 점과 점 사이 구간. 건너뛴 단계에 닿거나 할 수 있는 활동으로 가는 구간은 회색. */
function segments(cells: TreeGlanceRow['cells']) {
  const out: { from: number; to: number; gray: boolean }[] = [];
  let prev = -1;
  cells.forEach((c, i) => {
    if (!c) return;
    const gray = c === 'skipped' || c === 'candidate' || (prev >= 0 && cells[prev] === 'skipped');
    out.push({ from: prev < 0 ? 0 : stagePct(prev), to: stagePct(i), gray });
    prev = i;
  });
  return out;
}

/**
 * 분야마다 짧은 가지 하나: 시작점에서 단계 위치의 점까지 구간을 잇는다. 가로 = 심화 수준(입문 → 심화).
 * 한 활동 분야색 점, 하는 중 겹테두리, 건너뛴 단계 회색 점, 할 수 있는 활동 회색 점선 점. 안 해 본 분야는 시작점이 '?'.
 */
export function TreePic({ rows }: { rows: TreeGlanceRow[] }) {
  // 기타 줄은 해 본 칸이 있을 때만 그린다(없는 줄을 그려 카드를 키우지 않는다).
  const shown = rows.filter(r => r.group !== 'other' || r.cells.some(c => c === 'done' || c === 'ongoing'));
  return (
    <span className="an-tp" role="img" aria-label="분야별로 해 본 활동의 심화 수준 가지">
      <span className="an-tp__row an-tp__row--axis">
        <span />
        <span className="an-tp__track">{TREE_COLUMNS.map((c, i) => <span key={c} className="an-tp__tick" style={{ left: stageAt(i) }}>{c}</span>)}</span>
      </span>
      {shown.map(r => {
        const unknown = !r.cells.some(c => c === 'done' || c === 'ongoing');
        return (
          <span key={r.group} className={`an-tp__row an-g--${r.group}${unknown ? ' is-unknown' : ''}`}>
            <span className="an-tp__name">{r.label}</span>
            <span className="an-tp__track">
              {segments(r.cells).map(g => <span key={g.to} className={`an-tp__line${g.gray ? ' is-gray' : ''}`} style={{ left: `${g.from}%`, width: `${g.to - g.from}%` }} />)}
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

/** 요약 판의 나의 강점: 작은 육각형(확인 = 실선+옅은 채움, AI 추정까지 = 점선). 값은 역량별 근거 기록 수다. */
export function StrengthPic({ rows }: { rows: Strength[] }) {
  const spots = radarSpots(rows);
  const { max, ticks } = radarScale(spots);
  const vertices = spots.map(s => ({ key: s.axis, name: s.label, solid: s.confirmed, dashed: s.total, sub: radarSub(s) }));
  return (
    <span className="an-spic" role="img" aria-label={spots.map(s => `${s.label} 확인 ${s.confirmed}개 전체 ${s.total}개`).join(', ')}>
      <Radar mini vertices={vertices} max={max} ticks={ticks} label="역량별 근거 기록 수" radius={52} />
    </span>
  );
}
