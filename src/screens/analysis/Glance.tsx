import { useEffect, useMemo, useRef, useState } from 'react';
import type { EdgeAnswers } from '../../domain/analysis/map';
import type { FlowRow } from '../../domain/analysis/flow';
import type { TreeGlanceRow } from '../../domain/analysis/glance';
import { radarScale, radarSpots, radarSub, type Strength } from '../../domain/analysis/strengths';
import { TREE_COLUMNS } from '../../domain/analysis/techtree';
import { buildGraph, miniGraph } from '../../domain/analysis/graph';
import { textWidth } from '../../domain/analysis/graphLayout';
import { flowBars } from '../../domain/analysis/visual';
import { Radar } from '../../components';
import './strengths.css';
import type { RecordItem } from '../../domain/types';
import './techtree.css';
import './map.css';

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

const MINI = { rowH: 28, padY: 4, dotR: 3.5, dotStep: 9, dots: 6, nameX: 64, hubR: 9, labelW: 64, minW: 240 };

/** 칸 너비를 재서 그림을 늘이거나 줄이지 않고 그대로 그린다(글자가 늘 12px). 재지 못하면 기본 너비. */
function useSvgWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [w, setW] = useState<number>(MINI.minW + 60);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(Math.max(MINI.minW, Math.floor(el.getBoundingClientRect().width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * 경험 지도 작은 그림(지도와 같은 결): 왼쪽은 큰 묶음(활동 점은 분야 색 + 묶음 이름), 오른쪽은 역량 허브(남색 원),
 * 묶음에서 역량으로 근거 선(확인 실선, AI 추정 점선).
 */
export function MapPic({ records, answers }: { records: RecordItem[]; answers: EdgeAnswers }) {
  const mini = useMemo(() => miniGraph(buildGraph(records, answers)), [records, answers]);
  const [ref, width] = useSvgWidth();
  const height = MINI.padY * 2 + MINI.rowH * Math.max(1, mini.clusters.length);
  const rowY = (i: number) => MINI.padY + MINI.rowH * i + MINI.rowH / 2;
  const hubX = width - MINI.labelW - MINI.hubR;
  const hubY = (i: number) => MINI.padY + ((height - MINI.padY * 2) * (i + 0.5)) / Math.max(1, mini.axes.length);
  // 선은 가장 긴 묶음 이름 끝 한 줄에서 출발해 부드러운 곡선으로 허브에 닿는다(엇갈려도 덜 어지럽다)
  const x1 = MINI.nameX + Math.max(0, ...mini.clusters.map(c => textWidth(c.name, 12))) + 8;
  const x2 = hubX - MINI.hubR - 2;
  const label = mini.clusters.map(c => `${c.name} 활동 ${c.groups.length}개`).join(', ');
  return (
    <svg ref={ref} className="xm" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`관련 활동 묶음과 근거가 된 역량: ${label}`}>
      {mini.links.map(l => {
        const i = mini.clusters.findIndex(c => c.id === l.cluster);
        const j = mini.axes.findIndex(a => a.axis === l.axis);
        const mid = (x1 + x2) / 2;
        return <path key={`${l.cluster}-${l.axis}`} d={`M${x1} ${rowY(i)}C${mid} ${rowY(i)} ${mid} ${hubY(j)} ${x2} ${hubY(j)}`} className={l.confirmed ? 'xm__edge xm__edge--yes' : 'xm__edge'} />;
      })}
      {mini.clusters.map((c, i) => (
        <g key={c.id}>
          {c.groups.slice(0, MINI.dots).map((g, k) => <circle key={k} cx={MINI.dotR + 2 + k * MINI.dotStep} cy={rowY(i)} r={MINI.dotR} className={`xm__dot an-g--${g}`} />)}
          <text x={MINI.nameX} y={rowY(i)} dy="0.35em" className="xm__name">{c.name}</text>
        </g>
      ))}
      {mini.axes.map((a, j) => (
        <g key={a.axis}>
          <circle cx={hubX} cy={hubY(j)} r={MINI.hubR} className="xm__hub" />
          <text x={hubX + MINI.hubR + 6} y={hubY(j)} dy="0.35em" className="xm__axis">{a.label}</text>
        </g>
      ))}
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
