import { useMemo } from 'react';
import { useLinkPaths, type LinkSpec } from '../../components';
import { TREE_COLUMNS, rootTargets, splitTreeRows, type TechTree, type TreeCell, type TreeRow } from '../../domain/analysis/techtree';
import { ddayText } from '../../domain/text';

/**
 * 분야마다 왼쪽 시작점에서 오른쪽으로 뻗는 가지. 단계(들어 보기→나누기)는 칸이 아니라 위치로 읽힌다.
 * 같은 분야는 분야색 실선(추천 후보로 가는 선은 옅게), 다른 분야로 건너가는 경로는 점선.
 */
export function TreeGraph({ tree, onOpen, onCandidate, onFold }: {
  tree: TechTree; onOpen: (cell: TreeCell) => void; onCandidate: (cell: TreeCell) => void; onFold: (row: TreeRow, col: number) => void;
}) {
  const links = useMemo(() => treeLinks(tree), [tree]);
  const { wrap, nodeRef, paths } = useLinkPaths<HTMLDivElement>(links);
  const { drawn, untried } = splitTreeRows(tree.rows);

  return (
    <div ref={wrap} className="an-tree">
      <svg className="an-tree__lines" aria-hidden="true">
        {paths.map(p => <path key={p.key} d={p.d} className={p.className} />)}
      </svg>
      <div className="an-tree__axis" aria-hidden="true">
        <span /><span />
        {TREE_COLUMNS.map(c => <span key={c} className="an-tree__tick"><span>{c}</span></span>)}
      </div>
      {drawn.map(row => (
        <section key={row.group} className={`an-tree__row an-g--${row.group}`} aria-label={row.label}>
          <h3 className="an-tree__label">{row.label}</h3>
          {row.unknown
            ? <span ref={nodeRef(rootId(row))} className="an-tree__root an-tree__root--unknown" role="img" aria-label={`${row.label}: 아직 안 해 본 분야`}>?</span>
            : <span ref={nodeRef(rootId(row))} className="an-tree__root" aria-hidden="true" />}
          {TREE_COLUMNS.map((name, col) => (
            <div key={name} className="an-tree__stage">
              {row.cells.filter(c => c.col === col).map(c => (
                <button
                  key={c.id}
                  ref={nodeRef(c.id)}
                  type="button"
                  className={`an-pill an-pill--${c.kind}`}
                  onClick={() => (c.kind === 'candidate' ? onCandidate(c) : onOpen(c))}
                  aria-label={labelOf(c, name)}
                >
                  <span className="an-pill__text">{c.label}</span>
                  {c.kind === 'ongoing' && <span className="an-pill__tag">하는 중</span>}
                  {c.kind === 'candidate' && c.dday !== undefined && <span className="an-pill__dday num">{ddayText(c.dday)}</span>}
                </button>
              ))}
              {row.folds.filter(f => f.col === col).map(f => (
                <button key="more" ref={nodeRef(foldId(row, col))} type="button" className="an-pill an-pill--more" aria-haspopup="dialog" onClick={() => onFold(row, col)} aria-label={`${row.label} ${name}: 노드 ${f.cells.length}개 더 보기`}>
                  +{f.cells.length}
                </button>
              ))}
            </div>
          ))}
        </section>
      ))}
      {untried.length > 0 && (
        <p className="an-tree__untried">
          <span>안 해 본 분야</span>
          <span className="an-tree__root an-tree__root--unknown" aria-hidden="true">?</span>
          <b>{untried.map(r => r.label).join(' · ')}</b>
        </p>
      )}
    </div>
  );
}

const rootId = (row: TreeRow) => `root:${row.group}`;
const foldId = (row: TreeRow, col: number) => `fold:${row.group}:${col}`;

/** 시작점→첫 노드, 노드→노드 선. 선 색은 도착 노드의 분야, 후보로 가는 선은 옅게. */
function treeLinks(tree: TechTree): LinkSpec[] {
  const cellOf = new Map(tree.rows.flatMap(r => r.cells.map(c => [c.id, c] as const)));
  const cls = (to: TreeCell, cross = false) => `an-line an-line--${cross ? 'cross' : to.kind === 'candidate' ? 'soft' : 'trunk'} an-g--${to.group}`;
  const out: LinkSpec[] = [];
  for (const row of tree.rows) {
    for (const id of rootTargets(row)) out.push({ key: `${row.group}>${id}`, from: rootId(row), to: id, className: cls(cellOf.get(id)!) });
  }
  for (const l of tree.links) {
    const to = cellOf.get(l.to);
    if (to) out.push({ key: `${l.from}>${l.to}`, from: l.from, to: l.to, className: cls(to, l.cross) });
  }
  // '+n' 노드는 같은 단계의 첫 노드와 같은 곳에서 옅은 선으로 뻗는다(가지 끝에 붙어 보이게).
  for (const row of tree.rows) {
    for (const f of row.folds) {
      const first = row.cells.find(c => c.col === f.col);
      const from = (first && tree.links.find(l => !l.cross && l.to === first.id)?.from) ?? rootId(row);
      out.push({ key: `${from}>${foldId(row, f.col)}`, from, to: foldId(row, f.col), className: `an-line an-line--soft an-g--${row.group}` });
    }
  }
  return out;
}

const labelOf = (c: TreeCell, col: string) =>
  c.kind === 'candidate' ? `${c.label}, ${col}, 지금 신청할 수 있는 추천. 자세히 보기` : c.kind === 'ongoing' ? `${c.label}, ${col}, 하는 중. 자세히 보기` : `${c.label}, ${col}, 한 활동. 자세히 보기`;
