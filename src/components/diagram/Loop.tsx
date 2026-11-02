import { Piece } from './Piece';

export type LoopNode = { id: string; label: string; /** 노드 아래 작은 값(예: '기록 6개') */ value?: string };

type Props = {
  label: string;
  nodes: [LoopNode, LoopNode, LoopNode];
  onSelect: (id: string) => void;
  selectedId?: string;
};

/** 노드 3개가 왼쪽에서 오른쪽으로 이어지고, 마지막에서 처음으로 돌아오는 고리. */
export function Loop({ label, nodes, onSelect, selectedId }: Props) {
  return (
    <ol className="ui-dg ui-dg-loop" aria-label={label}>
      {nodes.map((n, i) => (
        <li key={n.id} className="ui-dg-loop__item">
          <Piece
            label={n.value ? `${n.label}, ${n.value}` : n.label} tip={i === nodes.length - 1 ? `${n.label} → 다시 ${nodes[0].label}` : `${n.label} → ${nodes[i + 1].label}`}
            className="ui-dg-loop__node" selected={selectedId === undefined ? undefined : selectedId === n.id}
            onSelect={() => onSelect(n.id)}
          >
            <span className="ui-dg-loop__label">{n.label}</span>
            {n.value && <span className="ui-dg-loop__value">{n.value}</span>}
          </Piece>
          {i < nodes.length - 1 && <span className="ui-dg-loop__arrow" aria-hidden="true" />}
        </li>
      ))}
      <li className="ui-dg-loop__back" aria-hidden="true" />
    </ol>
  );
}
