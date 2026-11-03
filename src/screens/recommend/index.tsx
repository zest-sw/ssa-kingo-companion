import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { DISLIKES } from '../../data/options';
import { laterUntilDay, parseRecommendSub, prepareHref } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';
import { DismissModal, LaterDrawer, LaterModal } from './Dialogs';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import './recommend.css';

/** 하위 경로: (없음) = 추천 한 화면, <활동 id> = 그 후보를 고른 추천 화면, prepare/<id> = 신청 준비(흐름 화면). 옛 list·compare 는 router 가 여기로 넘긴다. */
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

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  return (
    <>
      <Overview selectId={route.view === 'top' ? route.programId : undefined} actions={{ onPrepare: prepare, onLater: setPostponing, onDismiss: setDismissing }} onOpenLater={() => setLaterOpen(true)} />
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
