import { useMemo } from 'react';
import { useLinkPaths, type LinkSpec } from '../../components';
import { LEVEL_NAME } from '../../domain/analysis/level';
import { pathNodes, type PathStep } from '../../domain/social/path';
import { FIELD_GROUP } from '../../domain/vocab';

const COLS = [LEVEL_NAME[1], LEVEL_NAME[2], LEVEL_NAME[3]];

/**
 * 공개한 활동 경로를 테크 트리처럼 짧게: 줄은 시간 순, 칸은 심화 수준(입문 → 중급 → 심화).
 * 앞 활동에서 다음 활동으로 선을 잇는다. 분야색 점은 테크 트리와 같은 분야 묶음 색이다.
 */
export function PathTree({ path, label }: { path: PathStep[]; label: string }) {
  const nodes = useMemo(() => pathNodes(path), [path]);
  const links = useMemo<LinkSpec[]>(
    () => nodes.slice(1).map((n, i) => ({ key: n.id, from: nodes[i].id, to: n.id, className: 'pt-link' })),
    [nodes]
  );
  const { wrap, nodeRef, paths } = useLinkPaths<HTMLDivElement>(links);
  return (
    <div className="pt" ref={wrap}>
      <div className="pt__head" aria-hidden="true">
        <span />
        {COLS.map(c => <span key={c} className="pt__col-name">{c}</span>)}
      </div>
      <svg className="pt__links" aria-hidden="true">
        {paths.map(p => <path key={p.key} d={p.d} className={p.className} />)}
      </svg>
      <ol className="pt__rows" aria-label={label}>
        {nodes.map(n => (
          <li key={n.id} className="pt__row">
            <span className="pt__when num">{n.when}</span>
            <span ref={nodeRef(n.id)} className="pt__node" style={{ gridColumn: n.col + 2 }}>
              <span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[n.field]}`} aria-hidden="true" />
              <span className="pt__title">{n.title}</span>
              <span className="sr-only">, {COLS[n.col]}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
