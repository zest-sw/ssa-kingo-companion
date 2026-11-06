import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useState } from 'react';
import { AiMark, Button, ConfirmDot, EmptyState, FieldTag } from '../../components';
import { clusterGroups, clusterInsight, isTentative, type Cluster, type ClusterInsight, type GraphFocus, type KnowledgeGraph, type RecordNode } from '../../domain/analysis/graph';
import { nodeBrief } from '../../domain/analysis/graphView';
import { semesterLabel } from '../../domain/analysis/semester';
import { ddayOf } from '../../domain/recommend';
import { ddayText, josa } from '../../domain/text';
import { GROUP_LABEL } from '../../domain/vocab';
import type { GraphOpen } from './MapGraph';
import { EvidenceBar } from './EvidenceBar';
import { RecordSummary } from './RecordSummary';

export type NameAnswer = { ok?: boolean; name?: string };
type Props = {
  graph: KnowledgeGraph; selected: GraphFocus | null; onSelect: (f: GraphFocus | null, move?: boolean) => void; onOpen: (o: GraphOpen) => void;
  /** AI 제안 이름에 답하기(맞아요 / 바꾼 이름) */
  onName: (clusterId: string, a: NameAnswer) => void;
  /** '어떻게 만들었나' 열기 */
  onHow: () => void;
};

/** 고른 노드 분석에 보이는 근거 줄 상한(덩어리 안 항목 5개) */
const ITEMS = 5;

/**
 * 경험 지도 옆 칸 '지도에서 찾은 것'. 묶음 목록과, 아무것도 고르지 않았을 때 가장 많이 이어진 활동, 두 묶음을 잇는 활동, 이어 갈 기회, 아직 따로 있는 활동.
 * 배워야 하는 말(규칙 수, 중심성, 연결고리)은 쓰지 않는다. 만든 방법의 숫자는 '어떻게 만들었나' 모달에만 둔다.
 * 묶음을 누르면 그 묶음으로 확대하고 그 아래에 분석이 펼쳐진다. 활동·역량을 골랐으면 맨 위에 그 노드의 분석을 둔다.
 * 중심성 같은 값은 숫자로 내지 않고 '가장 많이 이어진' 같은 말로만 쓴다.
 */
export function ClusterPanel({ graph, selected, onSelect, onOpen, onName, onHow }: Props) {
  const { view } = useApp();
  const programs = view.scored.map(s => s.p);
  const node = selected && selected.kind !== 'cluster' ? selected : null;

  return (
    <aside className="xg-side os-scroll" aria-label="지도에서 찾은 것">
      {node && <NodeInsight graph={graph} focus={node} onSelect={onSelect} onOpen={onOpen} />}
      <div className="xg-side__head">
        <h3 className="xg-side__h">지도에서 찾은 것</h3>
        <button type="button" className="ui-link xg-how" onClick={onHow}>어떻게 만들었나</button>
      </div>
      <h4 className="xg-ka__h">활동 묶음</h4>
      <ul className="xg-cls">
        {graph.clusters.map(c => {
          const on = selected?.kind === 'cluster' && selected.id === c.id;
          const insight = on ? clusterInsight(graph, c.id, programs) : null;
          return (
            <li key={c.id} className={on ? 'is-picked' : undefined}>
              <button type="button" className="xg-cl" aria-pressed={on} aria-expanded={on} onClick={() => onSelect(on ? null : { kind: 'cluster', id: c.id }, !on)}>
                <span className="xg-cl__mark" aria-hidden="true">{clusterGroups(graph, c.id).slice(0, 3).map(g => <i key={g} className={`an-g--${g}`} />)}</span>
                <span className="xg-cl__name">{c.name}</span>
                {isTentative(c) ? <AiMark /> : c.source === 'llm' ? <span className="xg-src">내가 정함</span> : null}
                <span className="xg-cl__n">활동 <b className="num">{c.recordIds.length}</b>개</span>
              </button>
              {insight && <Insight insight={insight} graph={graph} onName={onName} />}
            </li>
          );
        })}
      </ul>
      {!selected && <KeyRows graph={graph} onSelect={onSelect} />}
    </aside>
  );
}

type NodeProps = { graph: KnowledgeGraph; focus: GraphFocus; onSelect: Props['onSelect']; onOpen: Props['onOpen'] };

/** 고른 노드 하나의 분석. 활동이면 기록 요약과 근거가 된 역량, 역량이면 근거 활동. 줄을 누르면 그 노드로 옮겨 고른다. */
function NodeInsight({ graph, focus, onSelect, onOpen }: NodeProps) {
  const id = focus.kind === 'axis' ? `ax:${focus.id}` : focus.id;
  const b = nodeBrief(graph, id);
  if (!b) return null;
  const record = b.kind === 'record' ? (graph.nodes.find(n => n.id === id) as RecordNode).record : null;
  const rest = b.items.length - ITEMS;
  return (
    <section className="xg-node" aria-label={`${b.name} 분석`}>
      {record ? <RecordSummary record={record} /> : (
        <p className="xg-node__head"><b>{b.name}</b> 근거 활동 <b className="num">{b.linked}</b>개 · 확인 <b className="num">{b.confirmed}</b>개</p>
      )}
      <h4 className="xg-in__h">{record ? '근거가 된 역량' : '근거 활동'}</h4>
      {b.items.length === 0 ? (
        <p className="an-muted">{record ? '아직 이어진 역량이 없어요. 회고를 더 쓰면 근거가 모여요.' : '아직 근거 활동이 없어요. 회고를 쓰면 여기에 모여요.'}</p>
      ) : (
        <ul className="xg-node__list">
          {b.items.slice(0, ITEMS).map(it => (
            <li key={it.id}>
              <button type="button" className="xg-node__item" onClick={() => onSelect(record ? { kind: 'axis', id: it.id } : { kind: 'node', id: it.id }, true)}>
                <ConfirmDot state={it.confirmed ? 'confirmed' : 'estimated'} />
                <span className="xg-node__label">{it.label}</span>
                {it.confirmed ? <span className="xg-node__state">확인</span> : <AiMark />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {rest > 0 && <p className="xg-in__more">{rest}개 더 있어요</p>}
      <span className="xg-node__acts">
        <Button size="sm" variant="primary" onClick={() => onOpen(record ? { kind: 'record', id } : { kind: 'axis', id: focus.id })}>{record ? '기록 보기' : '근거 자세히'}</Button>
        <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>선택 풀기</Button>
      </span>
    </section>
  );
}

/** 묶음 하나의 분석: 근거가 된 역량, 기간·분야, 대표 회고, 이어 갈 기회 */
function Insight({ insight, graph, onName }: { insight: ClusterInsight; graph: KnowledgeGraph; onName: Props['onName'] }) {
  const { state } = useApp();
  const { cluster, axes, first, last, groups, quotes, next } = insight;
  const period = first === last ? semesterLabel(first) : `${semesterLabel(first)} ~ ${semesterLabel(last)}`;
  return (
    <div className="xg-in" aria-label={`${cluster.name} 묶음 분석`}>
      <p className="xg-in__meta">{period} · {groups.map(g => GROUP_LABEL[g]).join(', ')}</p>
      <NameWhy cluster={cluster} onName={onName} />
      <h4 className="xg-in__h">근거가 된 역량</h4>
      {axes.length === 0 ? <p className="an-muted">근거를 모두 뺐어요. 회고를 더 쓰면 다시 모여요.</p> : (
        <ul className="xg-in__axes">
          {axes.slice(0, 3).map(a => (
            <li key={a.axis}>
              <span className="xg-in__axis">{a.label}</span>
              <EvidenceBar confirmed={a.confirmed} total={a.confirmed + a.estimated} max={Math.max(...axes.slice(0, 3).map(x => x.confirmed + x.estimated))} />
            </li>
          ))}
        </ul>
      )}
      {quotes.length > 0 && (
        <>
          <h4 className="xg-in__h">대표 회고</h4>
          <ul className="xg-in__quotes">{quotes.map(q => <li key={q.recordId}><span>“{q.text}”</span><span className="xg-in__src">{q.title}</span></li>)}</ul>
        </>
      )}
      <h4 className="xg-in__h">이어 갈 다음 활동</h4>
      {next.length === 0 ? (
        <EmptyState message="지금 후보 중에는 이 묶음과 이어지는 기회가 없어요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} />
      ) : (
        <ul className="xg-in__next">
          {next.map(p => (
            <li key={p.id}>
              <button type="button" className="xg-next" onClick={() => openEntity({ kind: 'opportunity', id: p.id }, { as: 'page' })}>
                <b className="xg-next__title">{p.title}</b>
                <span className="xg-next__meta"><FieldTag field={p.field} /><span>{ddayText(ddayOf(p, state.week))}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 이름이 왜 붙었나: 사전 키워드가 맞았으면 그 키워드, AI 제안이면 한 줄 요약과 맞아요 / 이름 바꾸기 */
function NameWhy({ cluster, onName }: { cluster: Cluster; onName: Props['onName'] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(cluster.name);
  if (cluster.source === 'taxonomy') {
    return (
      <p className="xg-in__name">
        <span className="xg-src">키워드</span>
        <span>{cluster.keywords.length ? `키워드 ${cluster.keywords.join('·')}${josa(cluster.keywords[cluster.keywords.length - 1], '이', '가')} 맞아서 붙인 이름이에요` : '분야가 같아서 붙인 이름이에요'}</span>
      </p>
    );
  }
  return (
    <>
      <p className="xg-in__name">
        {isTentative(cluster) ? <AiMark /> : <span className="xg-src">내가 정함</span>}
        <span>{cluster.summary ?? '맞는 키워드가 없어 AI가 지었어요'}</span>
      </p>
      {editing ? (
        <form className="xg-in__rename" onSubmit={e => { e.preventDefault(); if (draft.trim()) onName(cluster.id, { name: draft.trim() }); setEditing(false); }}>
          <input autoFocus aria-label="묶음 이름" value={draft} maxLength={16} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); } }} />
          <Button size="sm" variant="primary" type="submit">저장</Button>
        </form>
      ) : isTentative(cluster) && (
        <span className="xg-node__acts">
          <Button size="sm" variant="secondary" onClick={() => onName(cluster.id, { ok: true })}>맞아요</Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(cluster.name); setEditing(true); }}>이름 바꾸기</Button>
        </span>
      )}
    </>
  );
}

/** 기회가 왜 이 묶음과 이어지나: 같은 말을 다루거나, 같은 역량을 쓴다. 받침에 맞춰 */
const shareText = (cluster: string, keywords: string[], axes: number) => {
  if (!keywords.length) return `${cluster} 묶음과 같은 역량 ${axes}개를 써요`;
  const kw = keywords.slice(0, 2).join('·');
  return `${cluster} 묶음처럼 ‘${kw}’${josa(keywords[Math.min(1, keywords.length - 1)], '을', '를')} 다뤄요`;
};


/** 아무것도 고르지 않았을 때: 가장 많이 이어진 활동, 두 묶음을 잇는 활동, 이어 갈 기회, 아직 따로 있는 활동. 한 줄씩 */
function KeyRows({ graph, onSelect }: { graph: KnowledgeGraph; onSelect: Props['onSelect'] }) {
  const { center, bridge, guesses, loose } = graph.analysis;
  const name = (id: string) => graph.clusters.find(c => c.id === id)?.name ?? '';
  const pick = (id: string) => onSelect({ kind: 'node', id }, true);
  return (
    <div className="xg-ka">
      <h4 className="xg-ka__h">가장 많이 이어진 활동</h4>
      {center ? (
        <Row title={center.title} sub={`활동 ${center.links}개와 가장 많이 이어졌어요`} why="" onClick={() => pick(center.id)} />
      ) : <p className="an-muted">회고를 하나 더 쓰면 활동끼리 이어져요.</p>}
      <h4 className="xg-ka__h">두 묶음을 잇는 활동</h4>
      {bridge ? (
        <Row title={bridge.title} sub={`${name(bridge.joins[0])}${josa(name(bridge.joins[0]), '과', '와')} ${name(bridge.joins[1])}${josa(name(bridge.joins[1]), '을', '를')} 이어요`} why="" onClick={() => pick(bridge.id)} />
      ) : <p className="an-muted">묶음이 둘 이상 생기면 그 사이를 잇는 활동이 보여요.</p>}
      <h4 className="xg-ka__h">이어 갈 기회</h4>
      {guesses.length ? guesses.map(g => (
        <Row key={g.program.id} title={g.program.title}
          sub={shareText(g.clusterName, g.keywords, g.axes.length)}
          why=""
          onClick={() => openEntity({ kind: 'opportunity', id: g.program.id })} />
      )) : (
        <EmptyState message="지금 열린 기회 중 이어지는 게 없어요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} />
      )}
      <h4 className="xg-ka__h">아직 따로 있는 활동</h4>
      {loose.length ? loose.slice(0, 2).map(r => (
        <Row key={r.id} title={r.title} sub="한 일을 더 적으면 이어질 수 있어요" why="" onClick={() => openEntity({ kind: 'record', id: r.id })} />
      )) : <p className="an-muted">모든 활동이 어딘가와 이어져 있어요.</p>}
    </div>
  );
}

function Row({ title, sub, why, onClick }: { title: string; sub: string; why: string; onClick: () => void }) {
  return (
    <button type="button" className="xg-row" onClick={onClick} title={why ? `왜: ${why}` : undefined}>
      <span className="xg-row__main"><span className="xg-row__title">{title}</span><span className="xg-row__sub">{sub}</span></span>
      {why && <span className="xg-why" aria-label={`근거 ${why}`}>{why}</span>}
    </button>
  );
}
