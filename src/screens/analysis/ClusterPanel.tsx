import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Button, EmptyState, FieldTag } from '../../components';
import { axisCount, clusterGroups, clusterInsight, type ClusterInsight, type GraphFocus, type KnowledgeGraph } from '../../domain/analysis/graph';
import { semesterLabel } from '../../domain/analysis/semester';
import { ddayOf } from '../../domain/recommend';
import { ddayText } from '../../domain/text';
import type { Axis } from '../../domain/types';
import { AXES, GROUP_LABEL } from '../../domain/vocab';

type Props = { graph: KnowledgeGraph; selected: GraphFocus | null; onSelect: (f: GraphFocus | null) => void };

/** 근거 점을 한 줄에 그리는 상한. 넘으면 '+n' */
const DOTS = 6;

/**
 * 경험 지도 옆 칸: 관련 활동 묶음 목록(이름 + 활동 수). 묶음을 누르면 그 아래에 분석이 펼쳐지고 그래프에서 그 묶음만 진해진다.
 * 다시 누르면 해제한다. 역량을 골랐으면 맨 위에 그 역량의 근거 수 한 줄을 둔다.
 */
export function ClusterPanel({ graph, selected, onSelect }: Props) {
  const { view } = useApp();
  const programs = view.scored.map(s => s.p);
  const axis = selected?.kind === 'axis' ? (selected.id as Axis) : null;

  return (
    <aside className="xg-side os-scroll" aria-label="관련 활동 묶음">
      {axis && <AxisNote axis={axis} graph={graph} onClear={() => onSelect(null)} />}
      <h3 className="xg-side__h">관련 활동 묶음</h3>
      <ul className="xg-cls">
        {graph.clusters.map(c => {
          const on = selected?.kind === 'cluster' && selected.id === c.id;
          const insight = on ? clusterInsight(graph, c.id, programs) : null;
          return (
            <li key={c.id} className={on ? 'is-picked' : undefined}>
              <button type="button" className="xg-cl" aria-pressed={on} aria-expanded={on} onClick={() => onSelect(on ? null : { kind: 'cluster', id: c.id })}>
                <span className="xg-cl__mark" aria-hidden="true">{clusterGroups(graph, c.id).slice(0, 3).map(g => <i key={g} className={`an-g--${g}`} />)}</span>
                <span className="xg-cl__name">{c.name}</span>
                <span className="xg-cl__n">활동 <b className="num">{c.recordIds.length}</b>개</span>
              </button>
              {insight && <Insight insight={insight} />}
            </li>
          );
        })}
      </ul>
      {!selected && <p className="xg-side__hint">선이 굵을수록 근거가 많아요. 묶음을 누르면 활동마다 펼쳐 보여요.</p>}
    </aside>
  );
}

function AxisNote({ axis, graph, onClear }: { axis: Axis; graph: KnowledgeGraph; onClear: () => void }) {
  const n = axisCount(graph, axis);
  const label = AXES.find(a => a.id === axis)?.label ?? '';
  return (
    <div className="xg-axisnote" role="status">
      <p><b>{label}</b> 근거 활동 <b className="num">{n.confirmed + n.estimated}</b>개 · 확인 <b className="num">{n.confirmed}</b>개</p>
      <Button size="sm" variant="ghost" onClick={onClear}>강조 끄기</Button>
    </div>
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
