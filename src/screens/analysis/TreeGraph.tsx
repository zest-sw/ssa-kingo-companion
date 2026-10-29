import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { TREE_COLUMNS, type TechTree, type TreeCell } from '../../domain/analysis/techtree';
import { ddayText } from '../../domain/text';

type Path = { key: string; d: string; cross: boolean };

/** 칸 위치를 재서 선을 잇는다. 줄 안은 실선, 다른 줄로 건너가는 경로는 점선. */
export function TreeGraph({ tree, onOpen, onCandidate }: { tree: TechTree; onOpen: (cell: TreeCell) => void; onCandidate: (cell: TreeCell) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<Path[]>([]);

  const measure = useCallback(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const next: Path[] = [];
    for (const l of tree.links) {
      const a = nodes.current.get(l.from)?.getBoundingClientRect();
      const b = nodes.current.get(l.to)?.getBoundingClientRect();
      if (!a || !b) continue;
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const y2 = b.top + b.height / 2 - box.top;
      let d: string;
      if (b.left - a.right > 8) {
        const x2 = b.left - box.left;
        const dx = (x2 - x1) / 2;
        d = `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
      } else {
        // 같은 칸 위아래로 건너갈 때는 칸 오른쪽 바깥으로 돌아간다.
        const x2 = b.right - box.left;
        const out = Math.max(x1, x2) + 14;
        d = `M${x1} ${y1} C${out} ${y1} ${out} ${y2} ${x2} ${y2}`;
      }
      next.push({ key: `${l.from}>${l.to}`, d, cross: l.cross });
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
        {paths.map(p => <path key={p.key} d={p.d} className={p.cross ? 'an-line an-line--cross' : 'an-line'} />)}
      </svg>
      <div className="an-tree__head" aria-hidden="true">
        <span />
        {TREE_COLUMNS.map(c => <span key={c}>{c}</span>)}
      </div>
      {tree.rows.map(row => {
        const emptyCol = [0, 1, 2, 3].find(c => !row.cells.some(x => x.col === c));
        return (
          <section key={row.group} className={`an-tree__row an-g--${row.group}`} aria-label={row.label}>
            <h3 className="an-tree__label"><span className="an-tree__dot" aria-hidden="true" />{row.label}</h3>
            {TREE_COLUMNS.map((name, col) => {
              const here = row.cells.filter(c => c.col === col);
              return (
                <div key={name} className="an-tree__col">
                  {row.unknown && col === emptyCol && (
                    <div className="an-unknown">
                      <span className="an-pill an-pill--unknown" role="img" aria-label={`${row.label}: 아직 안 해 본 분야`}>?</span>
                      <span className="an-tree__hint" aria-hidden="true">아직 안 해 본 분야</span>
                    </div>
                  )}
                  {here.map(c => (
                    <button
                      key={c.id}
                      ref={setNode(c.id)}
                      type="button"
                      className={`an-pill an-pill--${c.kind}`}
                      onClick={() => (c.kind === 'candidate' ? onCandidate(c) : onOpen(c))}
                      aria-label={labelOf(c, name)}
                      title={c.label}
                    >
                      <span className="an-pill__text">{c.label}</span>
                      {c.kind === 'ongoing' && <span className="an-pill__tag">하는 중</span>}
                      {c.kind === 'candidate' && c.dday !== undefined && <span className="an-pill__dday num">{ddayText(c.dday)}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

const labelOf = (c: TreeCell, col: string) =>
  c.kind === 'candidate' ? `${c.label}, ${col}, 지금 신청할 수 있는 추천. 추천 화면으로 가요` : c.kind === 'ongoing' ? `${c.label}, ${col}, 하는 중. 자세히 보기` : `${c.label}, ${col}, 한 활동. 자세히 보기`;
