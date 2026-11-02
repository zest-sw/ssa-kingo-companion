import { useMemo } from 'react';
import { buildMap, layoutMap, visibleEdges, type EdgeAnswers } from '../../domain/analysis/map';
import type { FlowRow } from '../../domain/analysis/flow';
import type { TreeGlanceRow } from '../../domain/analysis/glance';
import type { StrengthRow } from '../../domain/analysis/strengths';
import { FIELD_GROUP } from '../../domain/vocab';
import type { RecordItem } from '../../domain/types';

// 분석 L1 타일 안의 작은 그림. 타일 전체가 링크라서 여기에는 누르는 요소를 두지 않는다.

const KIND_CLASS = { done: 'is-done', ongoing: 'is-ongoing', candidate: 'is-candidate' } as const;

export function TreePic({ rows }: { rows: TreeGlanceRow[] }) {
  return (
    <span className="an-glance an-glance--tree">
      {rows.map(r => (
        <span key={r.group} className={`an-glance__line an-g--${r.group}`}>
          {r.cells.map((c, i) => <span key={i} className={`an-gdot ${c ? KIND_CLASS[c] : 'is-blank'}`} />)}
        </span>
      ))}
    </span>
  );
}

const MAP_SIZE = { padLeft: 12, padTop: 12, colW: 36, rowH: 20, slotH: 10, padRight: 12, padBottom: 12 };

export function MapPic({ records, answers }: { records: RecordItem[]; answers: EdgeAnswers }) {
  const map = useMemo(() => buildMap(records), [records]);
  const layout = useMemo(() => layoutMap(map, MAP_SIZE), [map]);
  return (
    <svg className="an-glance an-glance--map" viewBox={`0 0 ${layout.width} ${layout.height}`}>
      {visibleEdges(map, answers).map(e => {
        const a = layout.pos[e.a];
        const b = layout.pos[e.b];
        return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={answers[e.id] === 'yes' ? 'an-gedge an-gedge--yes' : 'an-gedge'} />;
      })}
      {map.nodes.map(n => <circle key={n.id} cx={layout.pos[n.id].x} cy={layout.pos[n.id].y} r={4} className={`an-gnode an-g--${FIELD_GROUP[n.record.field]}`} />)}
    </svg>
  );
}

export function FlowPic({ rows }: { rows: FlowRow[] }) {
  return (
    <span className="an-glance an-glance--flow">
      {rows.map(r => (
        <span key={r.semester} className="an-gbar">
          {r.segments.map(s => <span key={s.group} className={`an-gbar__seg an-g--${s.group}`} style={{ flexGrow: s.count }} />)}
        </span>
      ))}
    </span>
  );
}

const SEEN_DOTS = { none: 0, low: 1, mid: 2, high: 3 } as const;

/** 역량마다 점 세 개를 아래부터 채운다. 기록이 없으면 빈 점. */
export function StrengthPic({ rows }: { rows: StrengthRow[] }) {
  return (
    <span className="an-glance an-glance--str">
      {rows.map(r => (
        <span key={r.axis} className="an-gcol">
          <span className="an-gcol__dots">
            {[3, 2, 1].map(n => <span key={n} className={`an-gdot${SEEN_DOTS[r.seen] >= n ? ' is-done' : ' is-blank'}`} />)}
          </span>
          <span className="an-gcol__label">{r.label}</span>
        </span>
      ))}
    </span>
  );
}

export const EmptyPic = ({ text }: { text: string }) => <span className="an-glance__empty">{text}</span>;
