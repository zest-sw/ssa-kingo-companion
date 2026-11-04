import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Drawer, EmptyState, GhostPic } from '../../components';
import { buildGraph, type GraphFocus } from '../../domain/analysis/graph';
import { answerEdge, buildMap, clearRejected, edgeState, type EdgeAnswers, type MapEdge } from '../../domain/analysis/map';
import { semesterLabel } from '../../domain/analysis/semester';
import { buildStrengths, withAnswers } from '../../domain/analysis/strengths';
import { nextStep } from '../../domain/nextStep';
import type { Axis, RecordItem } from '../../domain/types';
import { DID_LABEL, FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { ClusterPanel } from './ClusterPanel';
import { MapGraph, type GraphCamera, type GraphOpen } from './MapGraph';
import { RecordSummary } from './RecordSummary';
import { StrengthDrawer } from './StrengthDrawer';
import './map.css';

type Props = { records: RecordItem[]; answers: EdgeAnswers; setAnswers: (next: (prev: EdgeAnswers) => EdgeAnswers) => void };

/**
 * 경험 지도: '이 활동이 어떤 역량의 근거가 되나'. 활동과 역량을 잇는 지식 그래프와, 관련 활동 묶음 목록.
 * 노드를 한 번 누르면 선택(이웃 강조 + 옆 칸에 그 노드 분석), 두 번 누르거나 Enter 면 서랍(활동은 기록, 역량은 근거).
 * 묶음을 고르면 그 묶음으로 확대해 맞추고 옆 칸에 묶음 분석을 편다.
 */
export default function ExperienceMapTab({ records, answers, setAnswers }: Props) {
  const { state, view } = useApp();
  // 근거 답(맞아요/아니에요)은 다시 분석하지 않고 지금 답을 덧입힌다(나의 강점과 같은 기준).
  const live = useMemo(() => withAnswers(records, state.records), [records, state.records]);
  const graph = useMemo(() => buildGraph(live, answers), [live, answers]);
  const strengths = useMemo(() => buildStrengths(live), [live]);
  const [selected, setSelected] = useState<GraphFocus | null>(null);
  const [camera, setCamera] = useState<GraphCamera | null>(null);
  const [edgeId, setEdgeId] = useState<string | null>(null);
  const [strengthAxis, setStrengthAxis] = useState<Axis | null>(null);
  const step = nextStep(state.activities);
  const map = useMemo(() => buildMap(live), [live]);
  const rejected = map.edges.filter(e => edgeState(e, answers) === 'rejected').length;
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

  if (records.length === 0) {
    return (
      <Card className="os-card" title="경험 지도">
        <EmptyState pic={<GhostPic kind="network" />} message={`${step.lead} 활동이 점으로 생기고, 어떤 역량의 근거가 됐는지 선으로 이어져요.`} action={<Button size="sm" variant="primary" onClick={() => navigate(step.to)}>{step.label}</Button>} />
      </Card>
    );
  }

  return (
    <>
      <Card className="os-card xg-card" title="경험 지도" action={<GraphLegend />}>
        <div className="xg-body">
          <div className="xg-main">
            <MapGraph graph={graph} selected={shown} camera={camera} onSelect={select} onOpen={open} />
            {rejected > 0 && (
              <p className="xg-note">
                아니라고 한 이어짐 <b className="num">{rejected}</b>개는 숨겼어요.{' '}
                <Button size="sm" variant="ghost" onClick={() => setAnswers(clearRejected)}>다시 보이기</Button>
              </p>
            )}
          </div>
          <ClusterPanel graph={graph} selected={shown} onSelect={select} onOpen={open} />
        </div>
      </Card>
      <StrengthDrawer strength={strengths.find(s => s.axis === strengthAxis)} records={live} programs={view.scored.map(s => s.p)} onClose={() => setStrengthAxis(null)} />
      <EdgeDrawer edge={edgeId ? map.edges.find(e => e.id === edgeId) : undefined} byId={byId} answers={answers} onClose={() => setEdgeId(null)} answer={(id, a) => setAnswers(prev => answerEdge(prev, id, a))} />
    </>
  );
}

/** 노드 종류 둘, 선 종류 둘. 관계 이름은 강조했을 때 선 위에 나온다. */
function GraphLegend() {
  return (
    <ul className="an-legend an-legend--inline xg-legend" aria-label="그림 읽는 법">
      <li><span className="xg-key xg-key--axis" aria-hidden="true" />역량</li>
      <li><span className="xg-key xg-key--rec" aria-hidden="true" />활동</li>
      <li><span className="an-key an-key--yes" aria-hidden="true" />확인한 근거</li>
      <li><span className="an-key an-key--est" aria-hidden="true" />AI 추정</li>
    </ul>
  );
}

type DrawerProps = { edge?: MapEdge; byId: Record<string, RecordItem>; answers: EdgeAnswers; onClose: () => void; answer: (id: string, a: 'yes' | 'no') => void };

/** 이어짐 선 하나: 왜 이어졌다고 보는지, 맞는지 답하기, 두 기록 요약 */
function EdgeDrawer({ edge, byId, answers, onClose, answer }: DrawerProps) {
  const a = edge && byId[edge.a];
  const b = edge && byId[edge.b];
  const st = edge ? edgeState(edge, answers) : 'estimated';
  return (
    <Drawer open={!!(edge && a && b)} onClose={onClose} eyebrow="이어짐" title={a && b ? `${a.title} → ${b.title}` : ''}>
      {edge && a && b && (
        <>
          <p className="an-edgewhy">{reasonText(edge, a, b, st === 'confirmed')}</p>
          <p className="an-edgestate">
            {st === 'confirmed' ? <Badge tone="green" icon="check">확인했어요</Badge> : st === 'rejected' ? <Badge>아니라고 했어요</Badge> : <Badge tone="dashed">AI 추정 · 확인 전</Badge>}
          </p>
          <p className="an-edgeq">앞 활동이 뒤 활동으로 이어진 게 맞아요?</p>
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

/** 확인 전 연결은 추정으로, 학생이 맞다고 한 연결만 사실로 말한다. */
function reasonText(e: MapEdge, a: RecordItem, b: RecordItem, confirmed: boolean) {
  const did = DID_LABEL[a.did];
  const group = GROUP_LABEL[FIELD_GROUP[a.field]];
  const parts: string[] = [];
  if (e.reasons.includes('did')) parts.push(confirmed ? `같은 일(${did})을 이어서 했어요` : `같은 일(${did})을 이어서 한 것으로 보여요`);
  if (e.reasons.includes('field')) parts.push(confirmed ? `같은 분야(${group})예요` : `같은 분야(${group})로 보여요`);
  return `${parts.join(' · ')} · ${semesterLabel(a.semester)} → ${semesterLabel(b.semester)}`;
}
