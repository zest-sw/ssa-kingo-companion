import { useId, useMemo, useState } from 'react';
import { useLinkPaths, type LinkSpec } from '../../components';
import { TREE_COLUMNS, rootTargets, splitTreeRows, type TechTree, type TreeCell, type TreeLink, type TreeRow } from '../../domain/analysis/techtree';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { ddayText } from '../../domain/text';
import { usePictureKeys } from './usePictureKeys';

/**
 * 분야마다 왼쪽 시작점에서 오른쪽으로 뻗는 가지. 심화 수준(입문→중급→심화)은 칸이 아니라 위치로 읽힌다.
 * 내가 지나온 길은 분야색 실선, 건너뛴 단계를 지나는 구간은 회색, 할 수 있는 활동으로 가는 선은 옅게.
 * 다른 분야로 건너가는 경로(점선)는 평소에 숨긴다. 여러 줄을 세로로 가로질러 노드 사이가 지저분해져서, 노드에 올리거나 누르거나 포커스했을 때 그 노드의 경로만 그린다.
 */
export function TreeGraph({ tree, onOpen, onCandidate, onFold }: {
  tree: TechTree; onOpen: (cell: TreeCell) => void; onCandidate: (cell: TreeCell) => void; onFold: (row: TreeRow, col: number) => void;
}) {
  const links = useMemo(() => treeLinks(tree), [tree]);
  const { wrap, nodeRef, paths } = useLinkPaths<HTMLDivElement>(links);
  const { drawn, untried } = splitTreeRows(tree.rows);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hover ?? pinned;
  const cross = useMemo(() => new Map<string, TreeLink>(tree.links.filter(l => l.cross).map(l => [`${l.from}>${l.to}`, l])), [tree.links]);
  const shown = (key: string) => { const l = cross.get(key); return !l || (!!active && (l.from === active || l.to === active)); };
  const hasCross = (id: string) => tree.links.some(l => l.cross && (l.from === id || l.to === id));
  // 경험 지도와 같은 키 규칙: 그림 전체가 Tab 한 번, 방향키로 가까운 활동, [ ] 로 분야 사이, Esc 로 그림 밖
  const keys = usePictureKeys(wrap, { scroll: true });
  const hint = useId();

  return (
    <div ref={wrap} className="an-tree" role="group" aria-label="테크 트리 그림" aria-describedby={hint} onFocus={keys.onFocus} onKeyDown={e => { keys.onKeyDown(e); }}>
      <p id={hint} className="sr-only">방향키로 가까운 활동, [ 와 ] 로 분야 사이를 옮겨요. Enter 로 열고, Esc 로 그림에서 나가요.</p>
      <svg className="an-tree__lines" aria-hidden="true">
        {paths.filter(p => shown(p.key)).map(p => <path key={p.key} d={p.d} className={p.className} />)}
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
                  tabIndex={-1}
                  data-rove={c.id}
                  data-rove-group={row.group}
                  className={`an-pill an-pill--${c.kind}${active === c.id && hasCross(c.id) ? ' is-linked' : ''}`}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(c.id)}
                  onBlur={() => setHover(null)}
                  onClick={() => { setPinned(c.id); if (c.kind === 'candidate') onCandidate(c); else onOpen(c); }}
                  aria-label={labelOf(c, name)}
                >
                  <span className="an-pill__text">{c.label}</span>
                  {c.kind === 'ongoing' && <span className="an-pill__tag">하는 중</span>}
                  {c.kind === 'skipped' && <span className="an-pill__tag">건너뜀</span>}
                  {c.kind === 'candidate' && c.dday !== undefined && <span className={`an-pill__dday num${isNearDeadline(c.dday) ? '' : ' an-pill__dday--far'}`}>{ddayText(c.dday)}</span>}
                </button>
              ))}
              {row.folds.filter(f => f.col === col).map(f => (
                <button key="more" ref={nodeRef(foldId(row, col))} type="button" tabIndex={-1} data-rove={foldId(row, col)} data-rove-group={row.group} className="an-pill an-pill--more" aria-haspopup="dialog" onClick={() => onFold(row, col)} aria-label={`${row.label} ${name}: 활동 ${f.cells.length}개 더 보기`}>
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

/** 시작점→첫 노드, 노드→노드 선. 선 색은 도착 노드의 분야. 건너뛴 단계에 닿는 구간은 회색, 할 수 있는 활동으로 가는 선은 옅게. */
function treeLinks(tree: TechTree): LinkSpec[] {
  const cellOf = new Map(tree.rows.flatMap(r => r.cells.map(c => [c.id, c] as const)));
  const tone = (to: TreeCell, from?: TreeCell) =>
    to.kind === 'candidate' ? 'soft' : to.kind === 'skipped' || from?.kind === 'skipped' ? 'skip' : 'trunk';
  const cls = (to: TreeCell, cross = false, from?: TreeCell) => `an-line an-line--${cross ? 'cross' : tone(to, from)} an-g--${to.group}`;
  const out: LinkSpec[] = [];
  for (const row of tree.rows) {
    for (const id of rootTargets(row)) out.push({ key: `${row.group}>${id}`, from: rootId(row), to: id, className: cls(cellOf.get(id)!) });
  }
  for (const l of tree.links) {
    const to = cellOf.get(l.to);
    if (to) out.push({ key: `${l.from}>${l.to}`, from: l.from, to: l.to, className: cls(to, l.cross, cellOf.get(l.from)) });
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

const KIND_SAY = { done: '한 활동', ongoing: '하는 중', skipped: '건너뛴 단계', candidate: '지금 할 수 있는 활동' } as const;
const labelOf = (c: TreeCell, col: string) => `${c.label}, ${col}, ${KIND_SAY[c.kind]}. 자세히 보기`;
