import { useMemo, useState } from 'react';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Drawer, EmptyState } from '../../components';
import { answerEdge, buildMap, clearRejected, edgesOf, edgeState, type EdgeAnswers, type MapEdge } from '../../domain/analysis/map';
import { semesterLabel } from '../../domain/analysis/semester';
import type { RecordItem } from '../../domain/types';
import { DID_LABEL, FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { DiscoveryCards } from './DiscoveryCards';
import { MapGraph, type MapPick } from './MapGraph';
import { RecordSummary } from './RecordSummary';

type Props = { records: RecordItem[]; answers: EdgeAnswers; setAnswers: (next: (prev: EdgeAnswers) => EdgeAnswers) => void };

export default function ExperienceMapTab({ records, answers, setAnswers }: Props) {
  const map = useMemo(() => buildMap(records), [records]);
  const [pick, setPick] = useState<MapPick | null>(null);
  const rejected = map.edges.filter(e => edgeState(e, answers) === 'rejected');
  const byId = useMemo(() => Object.fromEntries(records.map(r => [r.id, r])), [records]);
  const answer = (id: string, a: 'yes' | 'no') => setAnswers(prev => answerEdge(prev, id, a));

  return (
    <div className="an-stack an-stack--lg">
      <DiscoveryCards />
      <Card
        title="경험 지도"
        action={records.length === 0 ? undefined : (
          <ul className="an-legend an-legend--inline" aria-label="선 표시">
            <li><span className="an-key an-key--yes" aria-hidden="true" />확인한 연결</li>
            <li><span className="an-key an-key--est" aria-hidden="true" />AI 추정</li>
          </ul>
        )}
      >
        {records.length === 0 ? (
          <EmptyState icon="records" title="아직 기록이 없어요" message="회고를 쓰면 기록이 점으로 생기고, 같은 일을 한 기록끼리 이어져요." action={<Button variant="primary" onClick={() => navigate('records')}>회고 쓰러 가기</Button>} />
        ) : (
          <>
            <MapGraph map={map} answers={answers} picked={pick} onPick={setPick} />
            <p className="an-note">점이나 선을 누르면 이 연결이 맞는지 답할 수 있어요.</p>
            {map.edges.length === 0 && <p className="an-note">아직 이어질 기록이 없어요. 같은 일이나 같은 분야의 회고가 하나 더 생기면 선이 생겨요.</p>}
            {rejected.length > 0 && (
              <p className="an-note">
                아니라고 한 연결 <b className="num">{rejected.length}</b>개는 숨겼어요.{' '}
                <Button size="sm" variant="ghost" onClick={() => setAnswers(clearRejected)}>다시 보이기</Button>
              </p>
            )}
          </>
        )}
      </Card>
      <MapDrawer pick={pick} onClose={() => setPick(null)} map={map} byId={byId} answers={answers} answer={answer} />
    </div>
  );
}

type DrawerProps = { pick: MapPick | null; onClose: () => void; map: ReturnType<typeof buildMap>; byId: Record<string, RecordItem>; answers: EdgeAnswers; answer: (id: string, a: 'yes' | 'no') => void };

function MapDrawer({ pick, onClose, map, byId, answers, answer }: DrawerProps) {
  const edge = pick?.kind === 'edge' ? map.edges.find(e => e.id === pick.id) : undefined;
  const node = pick?.kind === 'node' ? byId[pick.id] : undefined;
  const title = edge ? `${byId[edge.a]?.title} ↔ ${byId[edge.b]?.title}` : node?.title ?? '';
  return (
    <Drawer open={!!(edge || node)} onClose={onClose} eyebrow={edge ? '이 연결' : '기록'} title={title}>
      {edge && <EdgeBody edge={edge} byId={byId} answers={answers} answer={answer} />}
      {node && (
        <>
          <RecordSummary record={node} />
          <h3 className="an-sub">이어진 기록</h3>
          {edgesOf(map, node.id, answers).length === 0 ? (
            <p className="an-muted">이어진 기록이 아직 없어요. 같은 일을 한 회고가 생기면 이어져요.</p>
          ) : (
            <ul className="an-stack">
              {edgesOf(map, node.id, answers).map(e => {
                const other = byId[e.a === node.id ? e.b : e.a];
                return (
                  <li key={e.id} className="an-edgerow">
                    <div>
                      <b>{other.title}</b>
                      <p className="an-rec__meta">{reasonText(e, byId[e.a], byId[e.b], edgeState(e, answers) === 'confirmed')}</p>
                    </div>
                    <AnswerButtons id={e.id} answers={answers} answer={answer} />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function EdgeBody({ edge, byId, answers, answer }: { edge: MapEdge; byId: Record<string, RecordItem>; answers: EdgeAnswers; answer: DrawerProps['answer'] }) {
  const a = byId[edge.a];
  const b = byId[edge.b];
  const st = edgeState(edge, answers);
  return (
    <>
      <p className="an-edgewhy">{reasonText(edge, a, b, st === 'confirmed')}</p>
      <p className="an-edgestate">
        {st === 'confirmed' ? <Badge tone="green" icon="check">확인했어요</Badge> : st === 'rejected' ? <Badge>아니라고 했어요</Badge> : <Badge tone="dashed">AI 추정 · 확인 전</Badge>}
      </p>
      <p className="an-edgeq">이 연결이 맞아요?</p>
      <AnswerButtons id={edge.id} answers={answers} answer={answer} large />
      <div className="an-stack an-stack--top">{[a, b].map(r => <RecordSummary key={r.id} record={r} />)}</div>
    </>
  );
}

function AnswerButtons({ id, answers, answer, large }: { id: string; answers: EdgeAnswers; answer: DrawerProps['answer']; large?: boolean }) {
  const size = large ? 'md' : 'sm';
  return (
    <span className="an-answer">
      <Button size={size} variant={answers[id] === 'yes' ? 'primary' : 'secondary'} aria-pressed={answers[id] === 'yes'} onClick={() => answer(id, 'yes')}>맞아요</Button>
      <Button size={size} variant={answers[id] === 'no' ? 'primary' : 'secondary'} aria-pressed={answers[id] === 'no'} onClick={() => answer(id, 'no')}>아니에요</Button>
    </span>
  );
}

/** 확인 전 연결은 추정으로, 학생이 맞다고 한 연결만 사실로 말한다. */
function reasonText(e: MapEdge, a: RecordItem, b: RecordItem, confirmed: boolean) {
  const did = DID_LABEL[a.did];
  const group = GROUP_LABEL[FIELD_GROUP[a.field]];
  const parts: string[] = [];
  if (e.reasons.includes('did')) parts.push(confirmed ? `같은 일(${did})을 했어요` : `같은 일(${did})로 보여요`);
  if (e.reasons.includes('field')) parts.push(confirmed ? `같은 분야(${group})예요` : `같은 분야(${group})로 보여요`);
  return `${parts.join(' · ')} · ${semesterLabel(a.semester)} → ${semesterLabel(b.semester)}`;
}
