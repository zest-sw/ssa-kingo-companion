import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { useState } from 'react';
import { Button, ConfirmDot, EmptyState, FieldTag } from '../../components';
import { clusterGroups, clusterInsight, isTentative, type Cluster, type ClusterInsight, type GraphFocus, type KnowledgeGraph, type RecordNode } from '../../domain/analysis/graph';
import { cohesionWord } from '../../domain/kg/analyze';
import { nodeBrief } from '../../domain/analysis/graphView';
import { semesterLabel } from '../../domain/analysis/semester';
import { ddayOf } from '../../domain/recommend';
import { ddayText, josa } from '../../domain/text';
import { GROUP_LABEL } from '../../domain/vocab';
import type { GraphOpen } from './MapGraph';
import { RecordSummary } from './RecordSummary';

export type NameAnswer = { ok?: boolean; name?: string };
type Props = {
  graph: KnowledgeGraph; selected: GraphFocus | null; onSelect: (f: GraphFocus | null, move?: boolean) => void; onOpen: (o: GraphOpen) => void;
  /** AI 제안 이름에 답하기(맞아요 / 바꾼 이름) */
  onName: (clusterId: string, a: NameAnswer) => void;
  /** '어떻게 만들었나' 열기 */
  onHow: () => void;
};

/** 근거 점을 한 줄에 그리는 상한. 넘으면 '+n' */
const DOTS = 6;
/** 고른 노드 분석에 보이는 근거 줄 상한(덩어리 안 항목 5개) */
const ITEMS = 5;

/**
 * 경험 지도 옆 칸 '그래프 분석'. 묶음 목록(이름 출처 표시)과, 아무것도 고르지 않았을 때 중심 활동 · 연결고리 · 이어질 수 있는 활동 · 아직 이어지지 않은 활동.
 * 묶음을 누르면 그 묶음으로 확대하고 그 아래에 분석이 펼쳐진다. 활동·역량을 골랐으면 맨 위에 그 노드의 분석을 둔다.
 * 중심성 같은 값은 숫자로 내지 않고 '가장 많이 이어진' 같은 말로만 쓴다.
 */
export function ClusterPanel({ graph, selected, onSelect, onOpen, onName, onHow }: Props) {
  const { view } = useApp();
  const programs = view.scored.map(s => s.p);
  const node = selected && selected.kind !== 'cluster' ? selected : null;

  return (
    <aside className="xg-side os-scroll" aria-label="그래프 분석">
      {node && <NodeInsight graph={graph} focus={node} onSelect={onSelect} onOpen={onOpen} />}
      <div className="xg-side__head">
        <h3 className="xg-side__h">그래프 분석</h3>
        <button type="button" className="xg-how" onClick={onHow}>어떻게 만들었나</button>
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
                {isTentative(c) ? <span className="xg-src xg-src--ai">AI 제안</span> : c.source === 'llm' ? <span className="xg-src">내가 정함</span> : null}
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
                <span className="xg-node__state">{it.confirmed ? '확인' : 'AI 추정'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rest > 0 && <p className="xg-in__more">그 밖에 {rest}개</p>}
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
  const { cluster, axes, first, last, terms, groups, quotes, next } = insight;
  const period = first === last ? semesterLabel(first) : `${semesterLabel(first)} ~ ${semesterLabel(last)}`;
  const stat = graph.analysis.stats.find(x => x.id === cluster.id);
  return (
    <div className="xg-in" aria-label={`${cluster.name} 묶음 분석`}>
      <p className="xg-in__meta">{period} · {terms}개 학기 · {groups.map(g => GROUP_LABEL[g]).join(' · ')}{stat ? ` · ${cohesionWord(stat.cohesion)}` : ''}</p>
      <NameWhy cluster={cluster} onName={onName} />
      <h4 className="xg-in__h">근거가 된 역량</h4>
      {axes.length === 0 ? <p className="an-muted">근거를 모두 뺐어요. 회고를 더 쓰면 다시 모여요.</p> : (
        <ul className="xg-in__axes">
          {axes.slice(0, 3).map(a => {
            const dots = [...Array(a.confirmed).fill('confirmed'), ...Array(a.estimated).fill('estimated')] as ('confirmed' | 'estimated')[];
            return (
              <li key={a.axis}>
                <span className="xg-in__axis">{a.label}</span>
                <span className="xg-in__dots" role="img" aria-label={`확인 ${a.confirmed}개, AI 추정 ${a.estimated}개`}>
                  {dots.slice(0, DOTS).map((d, i) => <span key={i} className={`ui-dot ui-dot--${d}`} />)}
                  {dots.length > DOTS && <span className="xg-in__more">+{dots.length - DOTS}</span>}
                </span>
                <span className="xg-in__count">확인 {a.confirmed} · 추정 {a.estimated}</span>
              </li>
            );
          })}
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
        <EmptyState message="지금 후보 중에는 이 묶음과 이어지는 기회가 없어요. 추천에서 다른 기회를 볼 수 있어요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} />
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
        <span className="xg-src">사전</span>
        <span>{cluster.keywords.length ? `키워드 ${cluster.keywords.join('·')}${josa(cluster.keywords[cluster.keywords.length - 1], '이', '가')} 맞아서 붙인 이름이에요` : '분야가 같아서 붙인 이름이에요'}</span>
      </p>
    );
  }
  return (
    <>
      <p className="xg-in__name">
        <span className="xg-src xg-src--ai">{isTentative(cluster) ? 'AI 제안' : '내가 정함'}</span>
        <span>{cluster.summary ?? '사전에 맞는 이름이 없어 AI 가 지었어요'}</span>
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

/** 'A과 B를 나눠요' 를 받침에 맞춰 */
const shareText = (cluster: string, what: string) => `${cluster}${josa(cluster, '과', '와')} ${what}${josa(what, '을', '를')} 나눠요`;

const whyText = (w: { rule: number; llm: number; student: number }) =>
  [w.rule && `규칙 ${w.rule}`, w.llm && `AI ${w.llm}`, w.student && `확인 ${w.student}`].filter(Boolean).join(' · ');

/** 아무것도 고르지 않았을 때: 중심 활동, 연결고리, 이어질 수 있는 활동, 아직 이어지지 않은 활동. 한 줄씩 */
function KeyRows({ graph, onSelect }: { graph: KnowledgeGraph; onSelect: Props['onSelect'] }) {
  const { center, bridge, guesses, loose } = graph.analysis;
  const name = (id: string) => graph.clusters.find(c => c.id === id)?.name ?? '';
  const pick = (id: string) => onSelect({ kind: 'node', id }, true);
  return (
    <div className="xg-ka">
      <h4 className="xg-ka__h">중심 활동</h4>
      {center ? (
        <Row title={center.title} sub={`활동 ${center.links}개와 가장 많이 이어졌어요`} why={whyText(center.why)} onClick={() => pick(center.id)} />
      ) : <p className="an-muted">활동이 서로 이어지면 중심 활동이 보여요. 회고를 하나 더 써 볼까요?</p>}
      <h4 className="xg-ka__h">연결고리 활동</h4>
      {bridge ? (
        <Row title={bridge.title} sub={`${name(bridge.joins[0])}${josa(name(bridge.joins[0]), '과', '와')} ${name(bridge.joins[1])}${josa(name(bridge.joins[1]), '을', '를')} 이어요`} why={whyText(bridge.why)} onClick={() => pick(bridge.id)} />
      ) : <p className="an-muted">묶음이 둘 이상 생기면 그 사이를 잇는 활동이 보여요.</p>}
      <h4 className="xg-ka__h">이어질 수 있는 활동</h4>
      {guesses.length ? guesses.map(g => (
        <Row key={g.program.id} title={g.program.title}
          sub={shareText(g.clusterName, g.keywords.length ? g.keywords.join('·') : `역량 ${g.axes.length}개`)}
          why={`규칙 ${g.keywords.length + g.axes.length + 1}`}
          onClick={() => openEntity({ kind: 'opportunity', id: g.program.id })} />
      )) : (
        <EmptyState message="지금 열린 기회 중 이어지는 게 없어요. 추천에서 다른 기회를 볼 수 있어요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} />
      )}
      <h4 className="xg-ka__h">아직 이어지지 않은 활동</h4>
      {loose.length ? loose.slice(0, 2).map(r => (
        <Row key={r.id} title={r.title} sub="회고로 연결을 찾아볼까요" why="" onClick={() => openEntity({ kind: 'record', id: r.id })} />
      )) : <p className="an-muted">모든 활동이 어딘가와 이어져 있어요. 새 활동을 하면 여기서 먼저 보여요.</p>}
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
