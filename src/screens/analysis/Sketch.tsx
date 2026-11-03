import type { ReactElement } from 'react';
import { TREE_COLUMNS, TREE_GROUPS } from '../../domain/analysis/techtree';
import { AXES, GROUP_LABEL } from '../../domain/vocab';
import { SEMESTER_NOW } from '../../data/analysis';
import { semesterLabel } from '../../domain/analysis/semester';

// 기록이 없을 때 그 칸에 생길 그림의 윤곽. 속이 찬 회색 띠 대신 옅은 점선 테두리만 쓴다(로딩 뼈대와 구분).
// 점선은 '아직 값이 없는 틀'이고, AI 추정을 나타내는 점선은 연결선에만 쓰므로 둘이 한 그림에 섞이지 않는다.

export type SketchKind = 'tree' | 'network' | 'flow' | 'strengths';

const POINTS = [12, 38, 62, 86];

export function Sketch({ kind }: { kind: SketchKind }) {
  return <span className={`an-sk an-sk--${kind}`} aria-hidden="true">{BODY[kind]()}</span>;
}

const BODY: Record<SketchKind, () => ReactElement> = {
  tree: () => (
    <span className="an-sk__grid">
      <span />
      {TREE_COLUMNS.map(c => <span key={c} className="an-sk__col">{c}</span>)}
      {TREE_GROUPS.slice(0, 3).map(g => [
        <span key={g} className="an-sk__name">{GROUP_LABEL[g]}</span>,
        ...TREE_COLUMNS.map(c => <span key={`${g}-${c}`} className="an-sk__cell" />)
      ])}
    </span>
  ),
  network: () => (
    <svg className="an-sk__net" viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet">
      {POINTS.slice(1).map((x, i) => <line key={x} x1={POINTS[i]} y1={i % 2 ? 28 : 12} x2={x} y2={i % 2 ? 12 : 28} />)}
      {POINTS.map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 28 : 12} r="3.2" />)}
    </svg>
  ),
  flow: () => (
    <span className="an-sk__row"><span className="an-sk__name">{semesterLabel(SEMESTER_NOW)}</span><span className="an-sk__track" /></span>
  ),
  strengths: () => (
    <>
      {AXES.slice(0, 3).map(a => (
        <span key={a.id} className="an-sk__row">
          <span className="an-sk__name">{a.label}</span>
          <span className="an-sk__dots">{[1, 2, 3].map(n => <span key={n} className="an-sk__dot" />)}</span>
        </span>
      ))}
    </>
  )
};
