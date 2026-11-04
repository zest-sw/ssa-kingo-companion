import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { parseRecommendSub } from '../../domain/recommend-flow/flow';
import { LaterDrawer } from './Dialogs';
import { DetailView } from './DetailView';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import { useTriage } from './useTriage';
import './recommend.css';

/** 하위 경로: (없음) = ① 고르기, <활동 id> = ② 자세히, prepare/<id> = ③ 신청 준비. 옛 list·compare 는 router 가 여기로 넘긴다. */
export default function RecommendScreen({ sub }: ScreenProps) {
  const { view, state, run } = useApp();
  const route = parseRecommendSub(sub);
  const [laterOpen, setLaterOpen] = useState(false);
  // 자세히에서 미루거나 빼면 그 후보는 목록에서 사라지니 고르기로 돌아간다.
  const { actions, dialogs } = useTriage(() => { if (route.view === 'detail') navigate('recommend', { replace: true }); });

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  return (
    <>
      {route.view === 'detail' ? <DetailView key={route.programId} programId={route.programId} actions={actions} /> : <Overview actions={actions} onOpenLater={() => setLaterOpen(true)} />}
      {dialogs}
      <LaterDrawer
        open={laterOpen}
        programs={view.later}
        laterUntil={state.laterUntil}
        onClose={() => setLaterOpen(false)}
        onBack={p => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천 목록으로 돌려놨어요.' }); }}
        onPrepare={p => { setLaterOpen(false); actions.onPrepare(p); }}
      />
    </>
  );
}
