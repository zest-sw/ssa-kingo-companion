import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TREE_COLUMNS, rootTargets, type TechTree, type TreeCell, type TreeRow } from '../../domain/analysis/techtree';
import { ddayText } from '../../domain/text';

type Path = { key: string; d: string; kind: 'trunk' | 'soft' | 'cross'; group: string };

/**
 * 분야마다 왼쪽 시작점에서 오른쪽으로 뻗는 가지. 단계(들어 보기→나누기)는 칸이 아니라 위치로 읽힌다.
 * 노드 위치를 재서 선을 잇는다: 같은 분야는 분야색 실선(추천 후보로 가는 선은 옅게), 다른 분야로 건너가는 경로는 점선.
 */
export function TreeGraph({ tree, onOpen, onCandidate }: { tree: TechTree; onOpen: (cell: TreeCell) => void; onCandidate: (cell: TreeCell) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<Path[]>([]);

  const measure = useCallback(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const kindOf = new Map(tree.rows.flatMap(r => r.cells.map(c => [c.id, c] as const)));
    const curve = (a: DOMRect, b: DOMRect) => {
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const y2 = b.top + b.height / 2 - box.top;
      if (b.left - a.right > 8) {
        // 가지는 곧게 뻗다가 노드 앞에서만 휜다(노선도처럼). 먼 노드로 가는 선이 빈 단계를 비스듬히 가로지르지 않는다.
        const x2 = b.left - box.left;
        const fan = Math.min(x2 - x1, FAN);
        const xs = x2 - fan;
        return `M${x1} ${y1} L${xs} ${y1} C${xs + fan / 2} ${y1} ${x2 - fan / 2} ${y2} ${x2} ${y2}`;
      }
      // 같은 단계 위아래로 건너갈 때는 노드 오른쪽 바깥으로 돌아간다.
      const x2 = b.right - box.left;
      const out = Math.max(x1, x2) + 14;
      return `M${x1} ${y1} C${out} ${y1} ${out} ${y2} ${x2} ${y2}`;
    };
    const next: Path[] = [];
    for (const row of tree.rows) {
      const root = nodes.current.get(rootId(row))?.getBoundingClientRect();
      for (const id of rootTargets(row)) {
        const b = nodes.current.get(id)?.getBoundingClientRect();
        if (root && b) next.push({ key: `${row.group}>${id}`, d: curve(root, b), kind: kindOf.get(id)?.kind === 'candidate' ? 'soft' : 'trunk', group: row.group });
      }
    }
    for (const l of tree.links) {
      const a = nodes.current.get(l.from)?.getBoundingClientRect();
      const b = nodes.current.get(l.to)?.getBoundingClientRect();
      const to = kindOf.get(l.to);
      if (!a || !b || !to) continue;
      next.push({ key: `${l.from}>${l.to}`, d: curve(a, b), kind: l.cross ? 'cross' : to.kind === 'candidate' ? 'soft' : 'trunk', group: to.group });
    }
    setPaths(next);
  }, [tree]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const setNode = (id: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(id, el); else nodes.current.delete(id); };

  return (
    <div ref={wrap} className="an-tree">
      <svg className="an-tree__lines" aria-hidden="true">
        {paths.map(p => <path key={p.key} d={p.d} className={`an-line an-line--${p.kind} an-g--${p.group}`} />)}
      </svg>
      <div className="an-tree__axis" aria-hidden="true">
        <span /><span />
        {TREE_COLUMNS.map(c => <span key={c} className="an-tree__tick"><span>{c}</span></span>)}
      </div>
      {tree.rows.map(row => (
        <section key={row.group} className={`an-tree__row an-g--${row.group}`} aria-label={row.label}>
          <h3 className="an-tree__label">{row.label}</h3>
          {row.unknown
            ? <span ref={setNode(rootId(row))} className="an-tree__root an-tree__root--unknown" role="img" aria-label={`${row.label}: 아직 안 해 본 분야`}>?</span>
            : <span ref={setNode(rootId(row))} className="an-tree__root" aria-hidden="true" />}
          {!row.cells.length && <span className="an-tree__hint" aria-hidden="true">아직 안 해 본 분야</span>}
          {row.cells.length > 0 && TREE_COLUMNS.map((name, col) => (
            <div key={name} className="an-tree__stage">
              {row.cells.filter(c => c.col === col).map(c => (
                <button
                  key={c.id}
                  ref={setNode(c.id)}
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
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** 선이 휘는 구간의 가로 길이(px) */
const FAN = 56;
const rootId =(row: TreeRow) => `root:${row.group}`;

const labelOf = (c: TreeCell, col: string) =>
  c.kind === 'candidate' ? `${c.label}, ${col}, 지금 신청할 수 있는 추천. 자세히 보기` : c.kind === 'ongoing' ? `${c.label}, ${col}, 하는 중. 자세히 보기` : `${c.label}, ${col}, 한 활동. 자세히 보기`;
