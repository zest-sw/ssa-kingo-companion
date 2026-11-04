import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Button, ConfirmDot, EmptyState, FieldTag } from '../../components';
import { clusterGroups, clusterInsight, type ClusterInsight, type GraphFocus, type KnowledgeGraph, type RecordNode } from '../../domain/analysis/graph';
import { nodeBrief } from '../../domain/analysis/graphView';
import { semesterLabel } from '../../domain/analysis/semester';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import { GROUP_LABEL } from '../../domain/vocab';
import type { GraphOpen } from './MapGraph';
import { RecordSummary } from './RecordSummary';

type Props = { graph: KnowledgeGraph; selected: GraphFocus | null; onSelect: (f: GraphFocus | null, move?: boolean) => void; onOpen: (o: GraphOpen) => void };

/** 근거 점을 한 줄에 그리는 상한. 넘으면 '+n' */
const DOTS = 6;
/** 고른 노드 분석에 보이는 근거 줄 상한(덩어리 안 항목 5개) */
const ITEMS = 5;

/**
 * 경험 지도 옆 칸: 관련 활동 묶음 목록(이름 + 활동 수). 묶음을 누르면 그 묶음으로 확대하고 그 아래에 분석이 펼쳐진다.
 * 다시 누르면 해제한다. 활동·역량을 골랐으면 맨 위에 그 노드의 분석을 둔다.
 */
export function ClusterPanel({ graph, selected, onSelect, onOpen }: Props) {
  const { view } = useApp();
  const programs = view.scored.map(s => s.p);
  const node = selected && selected.kind !== 'cluster' ? selected : null;

  return (
    <aside className="xg-side os-scroll" aria-label="관련 활동 묶음">
      {node && <NodeInsight graph={graph} focus={node} onSelect={onSelect} onOpen={onOpen} />}
      <h3 className="xg-side__h">관련 활동 묶음</h3>
      <ul className="xg-cls">
        {graph.clusters.map(c => {
          const on = selected?.kind === 'cluster' && selected.id === c.id;
          const insight = on ? clusterInsight(graph, c.id, programs) : null;
          return (
            <li key={c.id} className={on ? 'is-picked' : undefined}>
              <button type="button" className="xg-cl" aria-pressed={on} aria-expanded={on} onClick={() => onSelect(on ? null : { kind: 'cluster', id: c.id }, !on)}>
                <span className="xg-cl__mark" aria-hidden="true">{clusterGroups(graph, c.id).slice(0, 3).map(g => <i key={g} className={`an-g--${g}`} />)}</span>
                <span className="xg-cl__name">{c.name}</span>
                <span className="xg-cl__n">활동 <b className="num">{c.recordIds.length}</b>개</span>
              </button>
              {insight && <Insight insight={insight} />}
            </li>
          );
        })}
      </ul>
      {!selected && <p className="xg-side__hint">선이 굵을수록 근거가 많아요. 묶음을 누르면 그쪽으로 확대해요.</p>}
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
function Insight({ insight }: { insight: ClusterInsight }) {
  const { state } = useApp();
  const { cluster, axes, first, last, terms, groups, quotes, next } = insight;
  const period = first === last ? semesterLabel(first) : `${semesterLabel(first)} ~ ${semesterLabel(last)}`;
  return (
    <div className="xg-in" aria-label={`${cluster.name} 묶음 분석`}>
      <p className="xg-in__meta">{period} · {terms}개 학기 · {groups.map(g => GROUP_LABEL[g]).join(' · ')}</p>
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
