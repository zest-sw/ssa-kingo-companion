import { useMemo } from 'react';
import { edgeState, layoutMap, visibleEdges, type EdgeAnswers, type ExperienceMap, type MapEdge, type MapNode } from '../../domain/analysis/map';
import { semesterLabel } from '../../domain/analysis/semester';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';

export type MapPick = { kind: 'node'; id: string } | { kind: 'edge'; id: string };

const SIZE = { padLeft: 112, padTop: 72, colW: 200, rowH: 96, slotH: 64, padRight: 24, padBottom: 24 };
const NODE_R = 11;
const MAX_LABEL = 11;

const short = (s: string) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL)}…` : s);

/** 기록은 점, 같은 일·같은 분야로 이어진 기록은 선. 점선은 확인 전의 AI 추정, 채운 선은 학생이 확인한 연결. */
export function MapGraph({ map, answers, picked, onPick }: { map: ExperienceMap; answers: EdgeAnswers; picked: MapPick | null; onPick: (p: MapPick) => void }) {
  const layout = useMemo(() => layoutMap(map, SIZE), [map]);
  const nodeOf = useMemo(() => Object.fromEntries(map.nodes.map(n => [n.id, n])) as Record<string, MapNode>, [map]);
  const visible = visibleEdges(map, answers);
  const press = (p: MapPick) => ({
    role: 'button' as const, tabIndex: 0, onClick: () => onPick(p),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p); } }
  });

  return (
    <svg className="an-map" viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label="경험 지도">
      {map.semesters.map((s, i) => (
        <text key={s} x={layout.colX[i]} y={24} className="an-map__col" textAnchor="middle">{semesterLabel(s)}</text>
      ))}
      {map.groups.map((g, i) => (
        <g key={g}>
          {i > 0 && <line x1={8} x2={layout.width - 8} y1={layout.rowY[i] - 40} y2={layout.rowY[i] - 40} className="an-map__rule" />}
          <text x={8} y={layout.rowY[i] + 4} className="an-map__row">{GROUP_LABEL[g]}</text>
        </g>
      ))}
      {visible.map(e => {
        const a = layout.pos[e.a];
        const b = layout.pos[e.b];
        const confirmed = edgeState(e, answers) === 'confirmed';
        const sel = picked?.kind === 'edge' && picked.id === e.id;
        return (
          <g key={e.id} className={`an-edge${sel ? ' is-picked' : ''}`} aria-label={edgeLabel(e, nodeOf, confirmed)} {...press({ kind: 'edge', id: e.id })}>
            <path d={curve(a, b)} className="an-edge__hit" />
            <path d={curve(a, b)} className={confirmed ? 'an-edge__line an-edge__line--yes' : 'an-edge__line an-edge__line--est'} />
          </g>
        );
      })}
      {map.nodes.map(n => {
        const p = layout.pos[n.id];
        const sel = picked?.kind === 'node' && picked.id === n.id;
        return (
          <g key={n.id} className={`an-node an-g--${FIELD_GROUP[n.record.field]}${sel ? ' is-picked' : ''}`} aria-label={`${n.record.title}, ${semesterLabel(n.record.semester)}. 연결 보기`} {...press({ kind: 'node', id: n.id })}>
            <circle cx={p.x} cy={p.y} r={NODE_R + 8} className="an-node__hit" />
            <circle cx={p.x} cy={p.y} r={NODE_R} className="an-node__dot" />
            <text x={p.x} y={p.y + NODE_R + 18} textAnchor="middle" className="an-node__label">{short(n.record.title)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  if (Math.abs(a.x - b.x) < 1) return `M${a.x} ${a.y} C${a.x + 56} ${a.y} ${b.x + 56} ${b.y} ${b.x} ${b.y}`;
  const dx = (b.x - a.x) / 2;
  return `M${a.x} ${a.y} C${a.x + dx} ${a.y} ${b.x - dx} ${b.y} ${b.x} ${b.y}`;
}

function edgeLabel(e: MapEdge, nodeOf: Record<string, MapNode>, confirmed: boolean) {
  return `${nodeOf[e.a].record.title}와 ${nodeOf[e.b].record.title}의 연결, ${confirmed ? '확인한 연결' : '확인 전 AI 추정'}. 맞는지 보기`;
}
