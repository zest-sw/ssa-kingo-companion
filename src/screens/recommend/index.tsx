import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { l1Of, navigate, type ScreenProps } from '../../app/router';
import { Button, Card, EmptyState, PageHeader } from '../../components';
import { DISLIKES } from '../../data/options';
import { laterUntilDay, parseRecommendSub, prepareHref } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';
import { CandidateDetail } from './CandidateDetail';
import { DismissModal, LaterDrawer, LaterModal } from './Dialogs';
import { ListView } from './ListView';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import './recommend.css';

export default function RecommendScreen({ sub }: ScreenProps) {
  const { state, view, run } = useApp();
  const route = parseRecommendSub(sub);
  const [dismissing, setDismissing] = useState<Program>();
  const [postponing, setPostponing] = useState<Program>();
  const [laterOpen, setLaterOpen] = useState(false);

  const prepare = (p: Program) => {
    run({ type: 'candidate/choose', programId: p.id, choice: 'preparing' });
    navigate(prepareHref(p.id));
  };
  const dismiss = (p: Program, kind: DislikeKind) => {
    setDismissing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'dismissed', reason: kind }, { toast: DISLIKES.find(d => d.id === kind)?.toast, undoable: true });
  };
  const postpone = (p: Program, days: number) => {
    setPostponing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'later', until: laterUntilDay(state.week, days) }, { toast: '나중에 다시 보여 드릴게요.', undoable: true });
  };
  const actions = { onPrepare: prepare, onLater: setPostponing, onDismiss: setDismissing };

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  // #/recommend/<활동 id>: 그 후보의 상세(L2). 후보가 아니면(이미 골랐거나 없는 id) 안내하고 목록으로 보낸다.
  const detail = route.view === 'top' && route.programId ? view.scored.find(s => s.p.id === route.programId) : undefined;

  let body;
  if (route.view === 'list' || route.view === 'compare') {
    body = <ListView key={route.view} startTable={route.view === 'compare'} actions={actions} onOpenLater={() => setLaterOpen(true)} />;
  } else if (route.view === 'top' && route.programId) {
    body = detail ? (
      <>
        <PageHeader parent={l1Of('recommend')} crumb="추천 상세" title={detail.p.title} />
        <CandidateDetail primary={detail} isPrimary={detail.p.id === view.primary?.p.id} week={state.week} records={state.records} activities={state.activities} actions={actions} />
      </>
    ) : (
      <>
        <PageHeader parent={l1Of('recommend')} crumb="추천 상세" title="후보를 찾지 못했어요" />
        <Card><EmptyState icon="compass" message="이미 골랐거나 이번 주 후보가 아니에요. 후보 목록에서 다시 골라 주세요." action={<Button variant="primary" onClick={() => navigate('recommend/list')}>후보 목록 보기</Button>} /></Card>
      </>
    );
  } else {
    body = <Overview onPrepare={prepare} onOpenLater={() => setLaterOpen(true)} />;
  }

  return (
    <>
      {body}
      <DismissModal program={dismissing} onPick={dismiss} onClose={() => setDismissing(undefined)} />
      <LaterModal week={state.week} program={postponing} onPick={postpone} onClose={() => setPostponing(undefined)} />
      <LaterDrawer
        open={laterOpen}
        programs={view.later}
        laterUntil={state.laterUntil}
        onClose={() => setLaterOpen(false)}
        onBack={p => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천 목록으로 돌려놨어요.' }); }}
        onPrepare={p => { setLaterOpen(false); prepare(p); }}
      />
    </>
  );
}
