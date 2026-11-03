import type { TraceNode } from '../../domain/recommend-flow/trace';

/** 왜 추천했나: 근거(내 기록·관심·진로…)가 이 활동으로 이어지는 작은 도식. 글은 키워드만 둔다. 점수는 없다. */
export function ReasonTrace({ nodes, title }: { nodes: TraceNode[]; title: string }) {
  if (nodes.length === 0) return <p className="rec-muted">아직 이어진 근거가 없어요. 기록을 남기면 여기에 이어져요.</p>;
  return (
    <div className="rec-trace" role="img" aria-label={`추천 근거 ${nodes.length}개가 ${title}로 이어져요: ${nodes.map(n => `${n.label} ${n.detail}`).join(', ')}`}>
      <ul className="rec-trace__nodes">
        {nodes.map(n => (
          <li key={n.kind} className="rec-trace__node" data-record={n.recordId ? 'yes' : 'no'} title={`${n.label} · ${n.detail}`}>
            <b>{n.label}</b>
            <span>{n.detail}{n.date ? ` · ${n.date}` : ''}</span>
          </li>
        ))}
      </ul>
      <span className="rec-trace__bus" aria-hidden="true" />
      <span className="rec-trace__goal" title={title}>{title}</span>
    </div>
  );
}
