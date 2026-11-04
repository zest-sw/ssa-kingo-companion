import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { RELATION_LABEL, clusterLinks, focusSet, hubTags, type GraphEdge, type GraphFocus, type KnowledgeGraph, type RecordNode } from '../../domain/analysis/graph';
import { GRAPH_METRICS as M, hullExit, layoutGraph, placeEdgeLabels, placeHubTags, radiusOf, trimSegment, type Pt } from '../../domain/analysis/graphLayout';

/** 그래프를 누른 것: 활동(기록 서랍), 역량·묶음(강조 켜고 끄기), 이어짐 선(맞는지 답하기) */
export type GraphPick = { kind: 'record' | 'axis' | 'cluster' | 'follow'; id: string };

type Props = { graph: KnowledgeGraph; selected: GraphFocus | null; onPick: (p: GraphPick) => void };

/** 칸의 폭·높이를 따라간다. 그래프 배치가 칸 크기에 맞춰 다시 계산된다. */
function useBox(fallback = { w: 720, h: 480 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setBox(b => {
      const w = el.clientWidth || fallback.w, h = el.clientHeight || fallback.h;
      return Math.abs(b.w - w) < 2 && Math.abs(b.h - h) < 2 ? b : { w, h };
    });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback.w, fallback.h]);
  return [ref, box] as const;
}

const press = (fn: () => void) => ({
  role: 'button' as const, tabIndex: 0, onClick: fn,
  onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }
});

/** 볼록 껍질 점을 이은 길. 모서리는 CSS 의 둥근 이음(stroke-linejoin)으로 부드럽게 한다 */
const hullPath = (pts: Pt[]) => (pts.length ? `M${pts.map(p => `${p.x} ${p.y}`).join('L')}Z` : '');
/** 요약 선 굵기: 근거 수에 비례, 1.5~7px */
const linkWidth = (n: number) => Math.min(7, 1 + n * 0.8);

/**
 * 경험 지도 지식 그래프. 역량은 남색 큰 원(허브), 활동은 분야 색 작은 원, 묶음은 옅은 영역.
 * 기본 화면은 묶음 단위로 접는다: 묶음 → 역량 굵은 선 하나씩(굵기 = 근거 수), 활동마다의 선은 그리지 않는다.
 * 묶음·역량을 고르거나 노드에 마우스를 올리면 그 부분의 활동 선이 펼쳐지고, 허브 옆에 '근거 n' 이 한 번 붙는다.
 */
export function MapGraph({ graph, selected, onPick }: Props) {
  const [ref, box] = useBox();
  const layout = useMemo(() => layoutGraph(graph, Math.max(320, Math.floor(box.w)), Math.max(280, Math.floor(box.h))), [graph, box.w, box.h]);
  const links = useMemo(() => clusterLinks(graph), [graph]);
  const [hover, setHover] = useState<string | null>(null);
  const active: GraphFocus | null = hover ? { kind: 'node', id: hover } : selected;
  const hot = useMemo(() => focusSet(graph, active), [graph, active?.kind, active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const hotFollows = useMemo(() => graph.edges.filter(e => e.kind === 'follow' && hot?.edges.has(e.id)), [graph, hot]);
  const relPos = useMemo(() => placeEdgeLabels(hotFollows.map(e => ({ id: e.id, from: e.from, to: e.to, label: RELATION_LABEL.follow })), layout), [hotFollows, layout]);
  const tags = useMemo(() => (hot ? hubTags(graph, hot.edges) : []), [graph, hot]);
  const tagPos = useMemo(() => placeHubTags(tags, layout), [tags, layout]);
  const clusterName = useMemo(() => Object.fromEntries(graph.clusters.map(c => [c.id, c.name])), [graph]);
  const mk = useId().replace(/:/g, '');
  const hoverOn = (id: string) => ({ onMouseEnter: () => setHover(id), onMouseLeave: () => setHover(h => (h === id ? null : h)), onFocus: () => setHover(id), onBlur: () => setHover(h => (h === id ? null : h)) });
  const dim = (id: string) => (hot && !hot.nodes.has(id) ? ' is-dim' : hot ? ' is-hot' : '');
  const selCluster = selected?.kind === 'cluster' ? selected.id : null;

  const edgeEl = (e: GraphEdge) => {
    const on = hot?.edges.has(e.id);
    // 활동 → 역량 선은 강조한 것만 그린다. 기본 화면은 묶음 요약 선이 대신한다.
    if (e.kind === 'evidence' && !on) return null;
    const a = layout.pos[e.from], b = layout.pos[e.to];
    if (!a || !b) return null;
    const s = trimSegment(a, radiusOf(e.from) + 2, b, radiusOf(e.to) + 3);
    const cls = `xg-edge xg-edge--${e.kind} xg-edge--${e.confirmed ? 'yes' : 'est'}${hot ? (on ? ' is-hot' : ' is-dim') : ''}`;
    const marker = `url(#${mk}-${on ? (e.confirmed ? 'yes' : 'hot') : 'base'})`;
    const line = <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} className="xg-edge__line" markerEnd={marker} />;
    if (e.kind !== 'follow') return <g key={e.id} className={cls}>{line}</g>;
    const from = graph.nodes.find(n => n.id === e.from) as RecordNode | undefined;
    const to = graph.nodes.find(n => n.id === e.to) as RecordNode | undefined;
    return (
      <g key={e.id} className={`${cls} xg-edge--press`} aria-label={`${from?.label}에서 ${to?.label}(으)로 이어짐, ${e.confirmed ? '확인함' : 'AI 추정'}. 맞는지 보기`} {...press(() => onPick({ kind: 'follow', id: e.id }))}>
        <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} className="xg-edge__hit" />
        {line}
      </g>
    );
  };

  return (
    <div ref={ref} className="xg-stage" data-fill>
      <svg className="xg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label="경험 지도: 활동 묶음과 역량의 연결">
        <defs>
          {(['base', 'hot', 'yes'] as const).map(k => (
            <marker key={k} id={`${mk}-${k}`} className={`xg-arrow xg-arrow--${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          ))}
        </defs>
        <g aria-hidden="true">
          {graph.clusters.map(c => (
            <path key={c.id} d={hullPath(layout.hulls[c.id])} className={`xg-hull${selCluster === c.id ? ' is-picked' : ''}${hot && selCluster && selCluster !== c.id ? ' is-dim' : ''}`} />
          ))}
        </g>
        {!selected && (
          <g aria-hidden="true" className={hot ? 'xg-links is-dim' : 'xg-links'}>
            {links.map(l => {
              const to = layout.pos[l.to];
              const from = to && hullExit(layout.hulls[l.cluster] ?? [], to);
              if (!to || !from) return null;
              const s = trimSegment(from, 0, to, M.axisR + 3);
              return <line key={l.id} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} strokeWidth={linkWidth(l.count)} className={`xg-link${l.confirmed ? ' is-yes' : ''}`} markerEnd={`url(#${mk}-base)`} />;
            })}
          </g>
        )}
        <g>{graph.edges.map(edgeEl)}</g>
        <g aria-hidden="true">
          {hotFollows.map(e => relPos[e.id] && (
            <text key={e.id} x={relPos[e.id].x} y={relPos[e.id].y} dy="0.35em" textAnchor="middle" className={`xg-rel${e.confirmed ? ' is-yes' : ''}`}>{RELATION_LABEL.follow}</text>
          ))}
        </g>
        {graph.clusters.map(c => {
          const p = layout.names[c.id];
          const b = layout.boxes[`name:${c.id}`];
          const on = selCluster === c.id;
          return (
            <g key={c.id} className={`xg-name${on ? ' is-picked' : ''}${hot && !on && selCluster ? ' is-dim' : ''}`} aria-label={`${c.name} 묶음, 활동 ${c.recordIds.length}개. ${on ? '강조 끄기' : '강조해서 분석 보기'}`} aria-pressed={on} {...press(() => onPick({ kind: 'cluster', id: c.id }))}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={M.nameH / 2} className="xg-name__bg" />
              <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="xg-name__text">{c.name}</text>
            </g>
          );
        })}
        {graph.nodes.map(n => {
          const p = layout.pos[n.id];
          if (!p) return null;
          if (n.kind === 'axis') {
            const on = selected?.kind === 'axis' && `ax:${selected.id}` === n.id;
            return (
              <g key={n.id} className={`xg-axis${n.evidence === 0 ? ' is-empty' : ''}${on ? ' is-picked' : ''}${dim(n.id)}`} aria-label={`역량 ${n.label}, 근거 활동 ${n.evidence}개. ${on ? '강조 끄기' : '근거 활동 강조'}`} aria-pressed={on} {...hoverOn(n.id)} {...press(() => onPick({ kind: 'axis', id: n.axis }))}>
                <circle cx={p.x} cy={p.y} r={M.axisR} className="xg-axis__dot" />
                <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="xg-axis__label">{n.label}</text>
              </g>
            );
          }
          const lines = layout.lines[n.id] ?? [n.label];
          return (
            <g key={n.id} className={`xg-rec an-g--${n.group}${dim(n.id)}`} aria-label={`${n.label}, ${clusterName[n.cluster]} 묶음. 기록 보기`} {...hoverOn(n.id)} {...press(() => onPick({ kind: 'record', id: n.id }))}>
              <circle cx={p.x} cy={p.y} r={M.recR + 6} className="xg-rec__hit" />
              <circle cx={p.x} cy={p.y} r={M.recR} className="xg-rec__dot" />
              <text x={p.x} y={p.y + M.recR + M.labelGap} className="xg-rec__label" textAnchor="middle">
                {lines.map((l, i) => <tspan key={i} x={p.x} dy={i === 0 ? M.lineH - 3 : M.lineH}>{l}</tspan>)}
              </text>
            </g>
          );
        })}
        <g aria-hidden="true">
          {tags.map(t => tagPos[t.id] && (
            <text key={t.id} x={tagPos[t.id].x} y={tagPos[t.id].y} dy="0.35em" textAnchor="middle" className="xg-tag">{t.text}</text>
          ))}
        </g>
      </svg>
    </div>
  );
}
