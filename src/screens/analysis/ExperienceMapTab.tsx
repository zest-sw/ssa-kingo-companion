import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { AiMark, Badge, Button, Card, Drawer, EmptyState, GhostPic, Modal } from '../../components';
import { buildGraph, withClusterNames, type ClusterNameAnswers, type GraphEdge, type GraphFocus, type KnowledgeGraph } from '../../domain/analysis/graph';
import { answerEdge, clearRejected, type EdgeAnswers } from '../../domain/analysis/map';
import { semesterLabel } from '../../domain/analysis/semester';
import { josaRo } from '../../domain/text';
import { buildStrengths, withAnswers } from '../../domain/analysis/strengths';
import { edgeCounts } from '../../domain/kg/build';
import { nextStep } from '../../domain/nextStep';
import type { Axis, RecordItem } from '../../domain/types';
import { ClusterPanel, type NameAnswer } from './ClusterPanel';
import { MapGraph, type GraphCamera, type GraphOpen } from './MapGraph';
import { RecordSummary } from './RecordSummary';
import { StrengthDrawer } from './StrengthDrawer';
import { KeyLegend } from './KeyLegend';
import './map.css';

type Props = { records: RecordItem[]; answers: EdgeAnswers; setAnswers: (next: (prev: EdgeAnswers) => EdgeAnswers) => void };

/**
 * 경험 지도: 활동을 모두 한 공간에 넣고 규칙·AI·내 확인으로 이은 지식 그래프. 가까운 활동끼리 모이고, 묶음은 사전 키워드로 이름 붙인다.
 * 노드를 한 번 누르면 선택(이웃 강조 + 옆 칸에 그 노드 분석), 두 번 누르거나 Enter 면 서랍(활동은 기록, 역량은 근거).
 * 묶음을 고르면 그 묶음으로 확대해 맞추고 옆 칸에 묶음 분석을 편다.
 */
export default function ExperienceMapTab({ records, answers, setAnswers }: Props) {
  const { state, view } = useApp();
  // 근거 답(맞아요/아니에요)은 다시 분석하지 않고 지금 답을 덧입힌다(나의 강점과 같은 기준).
  const live = useMemo(() => withAnswers(records, state.records), [records, state.records]);
  const programs = useMemo(() => view.scored.map(s => s.p), [view.scored]);
  // ponytail: AI 제안 이름에 한 답은 이 화면 안에만 둔다(새로고침하면 사라짐), 공용 상태(AppState)에 자리가 생기면 옮긴다.
  const [names, setNames] = useState<ClusterNameAnswers>({});
  const built = useMemo(() => buildGraph(live, answers, programs), [live, answers, programs]);
  const graph = useMemo(() => withClusterNames(built, names), [built, names]);
  const strengths = useMemo(() => buildStrengths(live), [live]);
  const [selected, setSelected] = useState<GraphFocus | null>(null);
  const [camera, setCamera] = useState<GraphCamera | null>(null);
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [strengthAxis, setStrengthAxis] = useState<Axis | null>(null);
  const [how, setHow] = useState(false);
  const step = nextStep(state.activities);
  const rejected = Object.values(answers).filter(v => v === 'no').length;
  const byId = useMemo(() => Object.fromEntries(live.map(r => [r.id, r])), [live]);
  // 묶음이나 노드가 바뀌어 사라진 선택은 해제한다
  const exists = (f: GraphFocus) => (f.kind === 'cluster' ? graph.clusters.some(c => c.id === f.id) : graph.nodes.some(n => n.id === (f.kind === 'axis' ? `ax:${f.id}` : f.id)));
  const shown = selected && exists(selected) ? selected : null;

  /** move: 그 묶음·노드로 화면을 옮긴다(옆 칸에서 고를 때) */
  const select = (f: GraphFocus | null, move = false) => {
    setSelected(f);
    if (f && move) setCamera(c => ({ kind: f.kind === 'cluster' ? 'cluster' : 'node', id: f.kind === 'axis' ? `ax:${f.id}` : f.id, n: (c?.n ?? 0) + 1 }));
  };
  const open = (o: GraphOpen) => {
    if (o.kind === 'record') openEntity({ kind: 'record', id: o.id });
    else if (o.kind === 'axis') setStrengthAxis(o.id as Axis);
    else setEdgeId(o.id);
  };
  const onName = (id: string, a: NameAnswer) => setNames(prev => ({ ...prev, [id]: { ...prev[id], ...a } }));

  if (records.length === 0) {
    return (
      <Card className="os-card" aria-label="경험 지도">
        <EmptyState pic={<GhostPic kind="network" />} message={`${step.lead} 활동이 점으로 생기고, 가까운 활동끼리 묶여요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} />
      </Card>
    );
  }

  return (
    <>
      {/* 결론 한 줄은 페이지 머리가 말한다. 카드는 그림만 */}
      <Card className="os-card xg-card" aria-label="경험 지도">
        <div className="xg-body">
          <div className="xg-main">
            <MapGraph graph={graph} selected={shown} camera={camera} onSelect={select} onOpen={open} />
            <GraphLegend />
            {rejected > 0 && (
              <p className="xg-note">
                아니라고 한 이어짐 <b className="num">{rejected}</b>개는 숨겼어요.{' '}
                <Button size="sm" variant="ghost" onClick={() => setAnswers(clearRejected)}>다시 보이기</Button>
              </p>
            )}
          </div>
          <ClusterPanel graph={graph} selected={shown} onSelect={select} onOpen={open} onName={onName} onHow={() => setHow(true)} />
        </div>
      </Card>
      <StrengthDrawer strength={strengths.find(s => s.axis === strengthAxis)} records={live} programs={programs} onClose={() => setStrengthAxis(null)} />
      <EdgeDrawer edge={edgeId ? graph.edges.find(e => e.id === edgeId && e.kind === 'follow') : undefined} byId={byId} answers={answers} onClose={() => setEdgeId(null)} answer={(id, a) => setAnswers(prev => answerEdge(prev, id, a))} />
      <HowModal open={how} graph={graph} onClose={() => setHow(false)} />
    </>
  );
}

/** 그림 아래 읽는 법 한 줄: 점 종류 둘, 선 종류 셋. 확인 전 AI 는 점선 */
function GraphLegend() {
  return (
    <KeyLegend label="그림 읽는 법" items={[
      { label: '역량', key: 'xg-key xg-key--axis' },
      { label: '활동', key: 'xg-key xg-key--rec' },
      { label: '공통점으로 이음', key: 'an-key xg-key--line' },
      { label: 'AI 추정', key: 'an-key an-key--est' },
      { label: '내가 확인', key: 'an-key xg-key--mine' }
    ]} />
  );
}

const ORIGIN_LABEL = { rule: '공통점', student: '내 확인' } as const;

type DrawerProps = { edge?: GraphEdge; byId: Record<string, RecordItem>; answers: EdgeAnswers; onClose: () => void; answer: (id: string, a: 'yes' | 'no') => void };

/** 이어짐 선 하나: 왜 이어졌다고 보는지(출처별 이유), 맞는지 답하기, 두 기록 요약 */
function EdgeDrawer({ edge, byId, answers, onClose, answer }: DrawerProps) {
  const a = edge && byId[edge.from];
  const b = edge && byId[edge.to];
  return (
    <Drawer open={!!(edge && a && b)} onClose={onClose} eyebrow="이어짐" title={a && b ? `${a.title} — ${b.title}` : ''}>
      {edge && a && b && (
        <>
          <p className="an-edgewhy">{a.semester === b.semester ? `둘 다 ${semesterLabel(a.semester)}` : `${semesterLabel(a.semester)}에서 ${semesterLabel(b.semester)}${josaRo(semesterLabel(b.semester))}`}</p>
          <ul className="an-edgewhy-list" aria-label="이어진 이유">
            {(edge.reasons ?? []).map((r, i) => (
              <li key={i}>{r.origin === 'llm' ? <AiMark /> : <span className="xg-src">{ORIGIN_LABEL[r.origin]}</span>}<span>{r.text}</span></li>
            ))}
          </ul>
          <p className="an-edgestate">
            {edge.confirmed ? <Badge tone="green" icon="check">확인했어요</Badge> : edge.origin === 'llm' ? <span className="xg-state">확인 전<AiMark /></span> : <Badge>공통점으로 이음</Badge>}
          </p>
          <p className="an-edgeq">두 활동이 이어진 게 맞아요?</p>
          <span className="an-answer">
            {(['yes', 'no'] as const).map(v => (
              <Button key={v} variant={answers[edge.id] === v ? 'primary' : 'secondary'} aria-pressed={answers[edge.id] === v} onClick={() => answer(edge.id, v)}>{v === 'yes' ? '맞아요' : '아니에요'}</Button>
            ))}
          </span>
          <div className="an-stack an-stack--top">{[a, b].map(r => <RecordSummary key={r.id} record={r} />)}</div>
        </>
      )}
    </Drawer>
  );
}

/** '어떻게 만들었나': 생성(엣지 출처별 수)과 분석(묶음 방법·이름 정한 방법). 조사 문서 요지 세 줄 */
function HowModal({ open, graph, onClose }: { open: boolean; graph: KnowledgeGraph; onClose: () => void }) {
  const n = edgeCounts(graph.kg);
  const dict = graph.clusters.filter(c => c.source === 'taxonomy').length;
  return (
    <Modal open={open} title="경험 지도를 만든 방법" onClose={onClose} actions={<Button variant="primary" onClick={onClose}>닫기</Button>}>
      <div className="xg-howto">
        <section>
          <h3>1. 활동 잇기</h3>
          <p className="xg-howto__n"><span>공통점으로 <b className="num">{n.rule}</b>개</span><span>AI가 <b className="num">{n.llm}</b>개</span><span>내가 확인한 것 <b className="num">{n.student}</b>개</span></p>
          <ul><li>같은 분야·확인한 역량·다음 학기 줄기·같은 시리즈·함께 나온 말이 있으면 공통점으로 이어요.</li><li>회고 문장끼리 뜻이 닿으면 AI가 잇고, 확인 전엔 점선이에요.</li></ul>
        </section>
        <section>
          <h3>2. 묶음 찾기</h3>
          <ul>
            <li>많이 이어진 활동끼리 묶어요. 한 묶음 안의 활동은 모두 이어져 있어요.</li>
            <li>{dict === graph.clusters.length ? `묶음 ${dict}개 모두 사전 키워드로 이름을 붙였어요. 맞는 게 없으면 AI가 제안해요.` : `묶음 ${graph.clusters.length}개 중 ${dict}개는 사전 키워드로, 나머지는 AI 가 이름을 제안해요.`}</li>
            <li>가장 많이 이어진 활동, 묶음 사이를 잇는 활동, 이어질 법한 기회를 찾아요.</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
