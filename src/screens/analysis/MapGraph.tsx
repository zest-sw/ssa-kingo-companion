import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useZoomPan, ZoomIcon, ZoomPanBar } from '../../components';
import { RELATION_LABEL, clusterLinks, focusSet, hubTags, isTentative, type GraphEdge, type GraphFocus, type GraphNode, type KnowledgeGraph, type RecordNode } from '../../domain/analysis/graph';
import { GRAPH_METRICS as M, hullExit, keywordLine, layoutGraph, nameSize, textWidth, placeEdgeLabels, placeHubTags, radiusOf, trimSegment, type GraphLayout, type Pt } from '../../domain/analysis/graphLayout';
import {
  centerOn, clusterBounds, dotInv, findNodes, fitView, keepInView, layoutBounds, nodeBrief, nodeInv, pinLayout, scaleBoxes, textInv, toScreen, zoomDetail, ZOOM, type View
} from '../../domain/analysis/graphView';

/** 두 번 누르거나 Enter: 활동은 기록 서랍, 역량은 근거 서랍, 이어짐 선은 맞는지 답하기 */
export type GraphOpen = { kind: 'record' | 'axis' | 'follow'; id: string };
/** 그 묶음으로 맞춰 확대하거나 그 노드로 옮겨 달라는 요청. n 이 바뀔 때마다 한 번 움직인다 */
export type GraphCamera = { kind: 'cluster' | 'node'; id: string; n: number };

type Props = {
  graph: KnowledgeGraph; selected: GraphFocus | null; camera: GraphCamera | null;
  onSelect: (f: GraphFocus | null) => void; onOpen: (o: GraphOpen) => void;
};

/** 오른쪽 도구 막대 칸. 그래프 배치는 이 칸을 뺀 폭에 맞춘다(맞춤 상태에서 막대가 노드를 덮지 않게) */
const TOOL_W = 48;
const FIT_PAD = 12;
/** 묶음으로 맞출 때 확대 상한. 묶음과 그 묶음이 잇는 역량을 함께 맞추고, 그래도 너무 키우지 않는다 */
const CLUSTER_MAX_K = 1.6;
const NO_PINS: Record<string, Pt> = {};

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

const keys = (fn: (e: KeyboardEvent) => void) => ({ role: 'button' as const, tabIndex: 0, onKeyDown: fn });
const hullPath = (pts: Pt[]) => (pts.length ? `M${pts.map(p => `${p.x} ${p.y}`).join('L')}Z` : '');
const focusOf = (nodeId: string): GraphFocus => (nodeId.startsWith('ax:') ? { kind: 'axis', id: nodeId.slice(3) } : { kind: 'node', id: nodeId });
const openOf = (nodeId: string): GraphOpen => (nodeId.startsWith('ax:') ? { kind: 'axis', id: nodeId.slice(3) } : { kind: 'record', id: nodeId });
const isPicked = (s: GraphFocus | null, nodeId: string) => !!s && ((s.kind === 'node' && s.id === nodeId) || (s.kind === 'axis' && `ax:${s.id}` === nodeId));

/**
 * 경험 지도 지식 그래프. 첫눈에는 묶음 이름(가장 큰 묶음이 주인공), 활동은 분야 색 작은 원, 역량은 옅은 원으로 물러나 있다.
 * 휠·핀치로 확대, 빈 곳을 끌어 이동, 노드를 끌어 옮기면 그 자리에 고정된다. 한 번 누르면 선택, 두 번 누르면 서랍.
 * 의미 기반 확대: 축소(far)하면 묶음 이름·역량만, 기본(mid)은 활동 이름까지, 확대(near)하면 활동마다의 근거 선과 관계 이름까지.
 */
export function MapGraph({ graph, selected, camera, onSelect, onOpen }: Props) {
  const [ref, box] = useBox();
  const W = Math.max(320, Math.floor(box.w) - TOOL_W), H = Math.max(280, Math.floor(box.h));
  const base = useMemo(() => layoutGraph(graph, W, H), [graph, W, H]);
  const [pinned, setPinned] = useState<{ of: GraphLayout; pins: Record<string, Pt> }>({ of: base, pins: NO_PINS });
  const pins = pinned.of === base ? pinned.pins : NO_PINS;
  const layout = useMemo(() => pinLayout(base, graph, pins), [base, graph, pins]);
  const boxH = Math.floor(box.h);
  const frame = useMemo(() => ({ x: 0, y: 0, w: W, h: boxH }), [W, boxH]);

  const content = useRef<SVGGElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const live = useRef({ layout, base, frame, bounds: layoutBounds(layout), hover });
  live.current = { layout, base, frame, bounds: live.current.layout === layout ? live.current.bounds : layoutBounds(layout), hover };
  const dragFrom = useRef<Pt | null>(null);
  const pending = useRef<{ id: string; p: Pt } | null>(null);
  const raf = useRef(0);

  const placeTip = useCallback((v: View) => {
    const el = tipRef.current, id = live.current.hover;
    const p = id && live.current.layout.pos[id];
    if (!el || !p) return;
    const r = (id.startsWith('ax:') ? M.axisR * nodeInv(v.k) : M.recR * dotInv(v.k)) * v.k;
    const s = toScreen(v, p);
    const below = s.y - r < 72;
    el.dataset.flip = below ? 'down' : 'up';
    el.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(below ? s.y + r + 8 : s.y - r - 8)}px)`;
  }, []);

  const zp = useZoomPan(ref, content, {
    fit: () => fitView(live.current.bounds, live.current.frame, FIT_PAD, 1),
    bound: v => keepInView(v, live.current.bounds, live.current.frame),
    styleOf: k => ({ vars: { '--zp-node': String(nodeInv(k)), '--zp-dot': String(dotInv(k)), '--zp-text': String(textInv(k)) }, detail: zoomDetail(k) }),
    hit: t => {
      const key = t.closest('[data-zp-id]')?.getAttribute('data-zp-id');
      return key ? { id: key, drag: key.startsWith('node|') } : null;
    },
    onDrag: (key, d, phase) => {
      const id = key.slice(5);
      if (phase === 'start') { dragFrom.current = live.current.layout.pos[id] ?? null; setHover(null); }
      const from = dragFrom.current;
      if (!from) return;
      pending.current = { id, p: { x: Math.round(from.x + d.x), y: Math.round(from.y + d.y) } };
      if (!raf.current) {
        raf.current = requestAnimationFrame(() => {
          raf.current = 0;
          const next = pending.current;
          if (!next) return;
          const b = live.current.base;
          setPinned(s => ({ of: b, pins: { ...(s.of === b ? s.pins : NO_PINS), [next.id]: next.p } }));
        });
      }
      if (phase === 'end') dragFrom.current = null;
    },
    onTap: (key, count) => {
      if (!key) { onSelect(null); return; }
      const [kind, id] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
      if (kind === 'node') (count === 2 ? onOpen(openOf(id)) : onSelect(focusOf(id)));
      else if (kind === 'cluster') { onSelect({ kind: 'cluster', id }); goCluster(id); }
      else if (kind === 'follow') onOpen({ kind: 'follow', id });
    },
    onPaint: placeTip
  });

  const goCluster = (id: string) => { const b = clusterBounds(live.current.layout, id, clusterLinks(graph).filter(l => l.cluster === id).map(l => l.to)); if (b) zp.set(fitView(b, live.current.frame, 32, CLUSTER_MAX_K), 'animate'); };
  const goNode = (id: string) => { const p = live.current.layout.pos[id]; if (p) zp.set(centerOn(zp.view(), p, live.current.frame, Math.max(zp.view().k, 1.25)), 'animate'); };

  // 처음 열 때와 칸 크기·기록이 바뀌어 배치가 새로 나오면 화면에 맞춘다
  useLayoutEffect(() => { zp.fit('now'); }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { placeTip(zp.view()); }, [hover, placeTip]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!camera) return;
    if (camera.kind === 'cluster') goCluster(camera.id); else goNode(camera.id);
  }, [camera?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const reset = () => { setPinned({ of: base, pins: NO_PINS }); zp.set(fitView(layoutBounds(base), frame, FIT_PAD, 1), 'animate'); };

  const k = zp.settled.k;
  const detail = zoomDetail(k);
  const inv = nodeInv(k), dinv = dotInv(k), tinv = textInv(k);
  // 화살 머리: 화면에서 6~10px. 선 굵기는 CSS(non-scaling-stroke)로 화면 기준을 지킨다
  const arrow = (8 * Math.min(1.25, Math.max(0.75, k))) / k;
  const links = useMemo(() => clusterLinks(graph), [graph]);
  const active: GraphFocus | null = zp.dragging ? { kind: 'node', id: zp.dragging.slice(5) } : hover ? { kind: 'node', id: hover } : selected;
  const hot = useMemo(() => focusSet(graph, active), [graph, active?.kind, active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const drawn = useMemo(() => graph.edges.filter(e => e.kind === 'follow' || detail === 'near' || hot?.edges.has(e.id)), [graph, detail, hot]);
  // 관계 이름. '근거'는 허브 옆 '근거 n' 한 번이 기본이고, 선마다는 그 선이나 그 활동에 마우스를 올렸을 때만.
  // '이어짐'은 강조했을 때, 확대(near)하면 늘. 자리가 없으면 생략(겹쳐 그리지 않는다)
  const relEdges = useMemo(
    () => drawn.filter(e => (e.kind === 'follow'
      ? (hot ? hot.edges.has(e.id) : detail === 'near')
      : e.id === hoverEdge || (!!hover && !hover.startsWith('ax:') && e.from === hover))),
    [drawn, detail, hot, hover, hoverEdge]
  );
  // 자리 찾기는 지금 그려진 크기의 상자로(허브는 inv, 활동·이름표는 글자 보정 tinv)
  const drawnBoxes = useMemo(() => scaleBoxes(layout, id => (id.startsWith('ax:') ? inv : tinv)), [layout, inv, tinv]);
  const relPos = useMemo(() => placeEdgeLabels(relEdges.map(e => ({ id: e.id, from: e.from, to: e.to, label: RELATION_LABEL[e.kind] })), drawnBoxes, M, 12 * tinv), [relEdges, drawnBoxes, tinv]);
  const tags = useMemo(() => (hot ? hubTags(graph, hot.edges) : []), [graph, hot]);
  const tagPos = useMemo(() => placeHubTags(tags, layout, { ...M, axisR: M.axisR * inv }, 12 * tinv), [tags, layout, inv, tinv]);
  const clusterName = useMemo(() => Object.fromEntries(graph.clusters.map(c => [c.id, c.name])), [graph]);
  const nodeById = useMemo(() => new Map(graph.nodes.map(n => [n.id, n])), [graph]);
  const brief = useMemo(() => (hover && !zp.dragging ? nodeBrief(graph, hover) : null), [graph, hover, zp.dragging]);
  const mk = useId().replace(/:/g, '');
  const tipId = `${mk}-tip`;
  const selCluster = selected?.kind === 'cluster' ? selected.id : null;
  const dim = (id: string) => (hot && !hot.nodes.has(id) ? ' is-dim' : hot ? ' is-hot' : '');
  const rOf = (id: string) => radiusOf(id) * (id.startsWith('ax:') ? inv : dinv);

  const hoverOn = (id: string) => ({
    onMouseEnter: () => setHover(id), onMouseLeave: () => setHover(h => (h === id ? null : h)),
    onFocus: () => {
      setHover(id);
      // 키보드로 화면 밖 노드에 오면 그 노드로 옮긴다
      const p = live.current.layout.pos[id], s = p && toScreen(zp.view(), p);
      if (s && (s.x < 24 || s.y < 24 || s.x > frame.w - 24 || s.y > frame.h - 24)) goNode(id);
    },
    onBlur: () => setHover(h => (h === id ? null : h))
  });
  const nodeKeys = (id: string) => keys(e => {
    if (e.key === 'Enter') { e.preventDefault(); onOpen(openOf(id)); }
    else if (e.key === ' ') { e.preventDefault(); onSelect(focusOf(id)); }
  });
  const pickFound = (n: GraphNode) => {
    onSelect(focusOf(n.id));
    goNode(n.id);
    (ref.current?.querySelector(`[data-zp-id="node|${n.id}"]`) as SVGGElement | null)?.focus({ preventScroll: true });
  };

  const edgeEl = (e: GraphEdge) => {
    const on = hot?.edges.has(e.id);
    const a = layout.pos[e.from], b = layout.pos[e.to];
    if (!a || !b) return null;
    const s = trimSegment(a, rOf(e.from) + 2, b, rOf(e.to) + 3);
    // near 에서만 그리는 선(강조 안 한 근거 선)은 표시해 두고, 축소하는 순간 CSS 가 먼저 숨긴다(상태는 멈춘 뒤에 바뀐다)
    const nearOnly = e.kind === 'evidence' && !on ? ' xg-near-only' : '';
    // 활동끼리 선: 규칙으로 이음(얇은 실선) · AI 가 이음(점선, 확인 전) · 내가 확인(진한 실선). 근거 선: 확인(실선) · AI 추정(점선)
    const tone = e.confirmed ? 'yes' : e.kind === 'follow' && e.origin === 'rule' ? 'rule' : 'est';
    const cls = `xg-edge xg-edge--${e.kind} xg-edge--${tone}${hot ? (on ? ' is-hot' : ' is-dim') : ''}${nearOnly}`;
    const marker = `url(#${mk}-${on ? (e.confirmed ? 'yes' : 'hot') : 'base'})`;
    const line = <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} className="xg-edge__line" markerEnd={marker} />;
    const hit = <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} className="xg-edge__hit" />;
    const edgeHover = { onMouseEnter: () => setHoverEdge(e.id), onMouseLeave: () => setHoverEdge(h => (h === e.id ? null : h)) };
    if (e.kind !== 'follow') return <g key={e.id} className={`${cls}${hoverEdge === e.id ? ' is-over' : ''}`} {...edgeHover}>{hit}{line}</g>;
    const from = nodeById.get(e.from) as RecordNode | undefined;
    const to = nodeById.get(e.to) as RecordNode | undefined;
    return (
      <g key={e.id} className={`${cls} xg-edge--press`} data-zp-id={`follow|${e.id}`} aria-label={`${from?.label}와 ${to?.label} 이어짐, ${e.confirmed ? '내가 확인' : e.origin === 'llm' ? 'AI 추정' : '공통점으로 이음'}. 왜 이어졌는지 보기`}
        {...edgeHover} {...keys(ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen({ kind: 'follow', id: e.id }); } })}>
        {hit}
        {line}
      </g>
    );
  };

  return (
    <div
      ref={ref} className={`xg-stage${zp.dragging ? ' is-dragging' : ''}`} data-fill data-zoom={detail} tabIndex={0} role="group"
      aria-label="경험 지도 그림. +, - 로 확대·축소, 0 으로 화면에 맞춤, 방향키로 이동해요."
      {...zp.handlers}
      onKeyDown={e => { if (e.key === 'Escape' && selected && !(e.target as Element).closest('input')) { e.preventDefault(); onSelect(null); return; } zp.handlers.onKeyDown(e); }}
    >
      <ZoomPanBar className="xg-tools" k={k} announce={zp.announce} onIn={() => zp.zoomBy(ZOOM.step)} onOut={() => zp.zoomBy(1 / ZOOM.step)} onFit={() => zp.fit()} onReset={reset}>
        <GraphSearch graph={graph} onPick={pickFound} />
      </ZoomPanBar>
      <svg className="xg" width={Math.floor(box.w)} height={boxH} role="group" aria-label="경험 지도: 활동 묶음과 역량의 연결">
        <defs>
          {(['base', 'hot', 'yes'] as const).map(m => (
            <marker key={m} id={`${mk}-${m}`} className={`xg-arrow xg-arrow--${m}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth={arrow} markerHeight={arrow} markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0 0L8 4L0 8Z" />
            </marker>
          ))}
        </defs>
        <g ref={content}>
          <g aria-hidden="true">
            {graph.clusters.map(c => (
              <path key={c.id} d={hullPath(layout.hulls[c.id])} className={`xg-hull${isTentative(c) ? ' xg-hull--ai' : ''}${selCluster === c.id ? ' is-picked' : ''}${hot && selCluster && selCluster !== c.id ? ' is-dim' : ''}`} />
            ))}
          </g>
          {!selected && detail !== 'near' && (
            <g aria-hidden="true" className={hot ? 'xg-links is-dim' : 'xg-links'}>
              {links.map(l => {
                const to = layout.pos[l.to];
                const from = to && hullExit(layout.hulls[l.cluster] ?? [], to);
                if (!to || !from) return null;
                const s = trimSegment(from, 0, to, M.axisR * inv + 3);
                return <line key={l.id} x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} className={`xg-link${l.confirmed ? ' is-yes' : ''}`} />;
              })}
            </g>
          )}
          <g>{drawn.map(edgeEl)}</g>
          <g aria-hidden="true">
            {relEdges.map(e => relPos[e.id] && (
              <text key={e.id} x={relPos[e.id].x} y={relPos[e.id].y} dy="0.35em" textAnchor="middle" className={`xg-rel${e.confirmed ? ' is-yes' : ''}${e.kind === 'follow' && !hot ? ' xg-near-only' : ''}`}>{RELATION_LABEL[e.kind]}</text>
            ))}
          </g>
          {graph.clusters.map((c, ci) => {
            const p = layout.names[c.id];
            const b = layout.boxes[`name:${c.id}`];
            const on = selCluster === c.id;
            const kw = keywordLine(c.keywords);
            const size = nameSize(ci === 0);
            const pillW = textWidth(c.name, size.charW) + 16;
            const why = kw ? `, 키워드 ${kw}` : isTentative(c) ? ', AI가 제안한 이름, 확인 전' : '';
            return (
              <g key={c.id} className={`xg-name${ci === 0 ? ' xg-name--hero' : ''}${isTentative(c) ? ' xg-name--ai' : ''}${on ? ' is-picked' : ''}${hot && !on && selCluster ? ' is-dim' : ''}`} data-zp-id={`cluster|${c.id}`} aria-label={`${c.name} 묶음, 활동 ${c.recordIds.length}개${why}. 이 묶음으로 확대해서 분석 보기`} aria-pressed={on}
                {...keys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect({ kind: 'cluster', id: c.id }); goCluster(c.id); } })}>
                <title>{kw ? `키워드 ${kw}` : isTentative(c) ? 'AI가 제안한 이름이에요. 옆 칸에서 확인해 주세요' : c.name}</title>
                <rect x={p.x - pillW / 2} y={b.y} width={pillW} height={size.h} rx={size.h / 2} className="xg-name__bg" />
                <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="xg-name__text">{c.name}</text>
              </g>
            );
          })}
          {graph.nodes.map(n => {
            const p = layout.pos[n.id];
            if (!p) return null;
            const on = isPicked(selected, n.id);
            const pin = pins[n.id] ? '. 옮겨서 고정함' : '';
            const common = { 'data-zp-id': `node|${n.id}`, 'aria-pressed': on, 'aria-describedby': hover === n.id ? tipId : undefined, ...hoverOn(n.id), ...nodeKeys(n.id) };
            if (n.kind === 'axis') {
              return (
                <g key={n.id} className={`xg-axis${n.evidence === 0 ? ' is-empty' : ''}${on ? ' is-picked' : ''}${dim(n.id)}`} aria-label={`역량 ${n.label}, 근거 활동 ${n.evidence}개${pin}. 누르면 선택, Enter 로 근거 보기`} {...common}>
                  <circle cx={p.x} cy={p.y} r={M.axisR} className="xg-axis__dot" />
                  <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="xg-axis__label">{n.label}</text>
                  {pins[n.id] && <circle cx={p.x + M.axisR * 0.72} cy={p.y - M.axisR * 0.72} r={4} className="xg-pin" />}
                </g>
              );
            }
            const lines = layout.lines[n.id] ?? [n.label];
            return (
              <g key={n.id} className={`xg-rec an-g--${n.group}${on ? ' is-picked' : ''}${active?.kind === 'node' && active.id === n.id ? ' is-focus' : ''}${dim(n.id)}`} aria-label={`${n.label}, ${clusterName[n.cluster]} 묶음${pin}. 누르면 선택, Enter 로 기록 보기`} {...common}>
                <circle cx={p.x} cy={p.y} r={M.recR + 6} className="xg-rec__hit" />
                <circle cx={p.x} cy={p.y} r={M.recR} className="xg-rec__dot" />
                <text x={p.x} y={p.y + M.recR * dinv + M.labelGap * tinv} className="xg-rec__label" textAnchor="middle">
                  {lines.map((l, i) => <tspan key={i} x={p.x} dy={i === 0 ? '1em' : `${M.lineH / 12}em`}>{l}</tspan>)}
                </text>
                {pins[n.id] && <circle cx={p.x + M.recR * 0.8 * dinv} cy={p.y - M.recR * 0.8 * dinv} r={3 * dinv} className="xg-pin" />}
              </g>
            );
          })}
          <g aria-hidden="true">
            {tags.map(t => tagPos[t.id] && (
              <text key={t.id} x={tagPos[t.id].x} y={tagPos[t.id].y} dy="0.35em" textAnchor="middle" className="xg-tag">{t.text}</text>
            ))}
          </g>
        </g>
      </svg>
      <div ref={tipRef} id={tipId} className="xg-tip" role="tooltip" hidden={!brief}>
        {brief && (
          <div className="xg-tip__in">
            <b>{brief.name}</b>
            <span>{brief.kind === 'record' ? `${brief.where} 묶음의 활동` : '역량'}</span>
            <span>확인 근거 <b className="num">{brief.confirmed}</b> · 추정 <b className="num">{brief.estimated}</b></span>
            <span>{brief.kind === 'record' ? '이어진 활동' : '근거 활동'} <b className="num">{brief.linked}</b>개</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** 활동 찾기: 도구 막대의 아이콘 하나로 접어 둔다. 이름 일부를 치면 맞는 노드를 고르고 그쪽으로 옮긴다. */
function GraphSearch({ graph, onPick }: { graph: KnowledgeGraph; onPick: (n: GraphNode) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const hits = useMemo(() => findNodes(graph, q), [graph, q]);
  const id = useId().replace(/:/g, '');
  const btn = useRef<HTMLButtonElement>(null);
  const close = (back: boolean) => { setOpen(false); setQ(''); setAt(0); if (back) btn.current?.focus(); };
  const choose = (n: GraphNode | undefined) => { if (!n) return; close(false); onPick(n); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setAt(i => (hits.length ? (i + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(hits[at]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  };
  return (
    <div className="xg-find">
      <button ref={btn} type="button" className={`ui-icon-btn${open ? ' is-on' : ''}`} aria-label="활동 찾기" title="활동 찾기" aria-expanded={open} aria-controls={open ? `${id}-box` : undefined} onClick={() => (open ? close(false) : setOpen(true))}>
        <ZoomIcon><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></ZoomIcon>
      </button>
      {open && (
        <div className="xg-find__box" id={`${id}-box`}>
          <input
            autoFocus name="map-find" autoComplete="off" className="xg-find__input" placeholder="활동 찾기" aria-label="활동 찾기" role="combobox" aria-expanded={hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={hits[at] ? `${id}-${at}` : undefined} value={q} onChange={e => { setQ(e.target.value); setAt(0); }} onKeyDown={onKey}
          />
          {q.trim() && (hits.length > 0 ? (
            <ul className="xg-find__list" role="listbox" id={`${id}-list`} aria-label="찾은 활동">
              {hits.map((n, i) => (
                <li key={n.id} id={`${id}-${i}`} role="option" aria-selected={i === at} className={i === at ? 'is-on' : undefined} onPointerDown={e => e.preventDefault()} onClick={() => choose(n)}>
                  <span>{n.label}</span><span className="xg-find__kind">{n.kind === 'axis' ? '역량' : '활동'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="xg-find__empty">맞는 활동이 없어요. 이름 일부로 찾아보세요.</p>)}
        </div>
      )}
    </div>
  );
}
