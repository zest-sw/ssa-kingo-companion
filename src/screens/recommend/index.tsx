import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, type ScreenProps } from '../../app/router';
import { parseRecommendSub } from '../../domain/recommend-flow/flow';
import { LaterDrawer } from './Dialogs';
import { OppModal } from './OppModal';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import { useTriage } from './useTriage';
import './OppEntity';
import './recommend.css';

/**
 * 하위 경로: (없음) = 목록(추천 활동·전체 기회 탭), <기회 id> = 같은 목록 위 가운데 모달, prepare/<id> = 신청 준비 3단계.
 * 모달 주소(#/recommend/<id>)는 그대로 공유할 수 있다. 옛 list·compare 는 router 가 여기로 넘긴다.
 */
export default function RecommendScreen({ sub }: ScreenProps) {
  const { view, state, run } = useApp();
  const route = parseRecommendSub(sub);
  const [laterOpen, setLaterOpen] = useState(false);
  const toList = () => navigate('recommend', { replace: true });
  // 모달에서 미루거나 빼면 모달을 닫고 목록으로 돌아간다.
  const { actions, dialogs, busy } = useTriage(() => { if (route.view === 'detail') toList(); });

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  return (
    <>
      <Overview onOpenLater={() => setLaterOpen(true)} />
      {/* 미루기·빼기 대화 상자가 떠 있는 동안은 자세히 모달을 내려 둔다(Esc·포커스 가둠이 하나만 돌게). 취소하면 다시 뜬다 */}
      {route.view === 'detail' && !busy && <OppModal key={route.programId} programId={route.programId} actions={actions} onClose={toList} />}
      {dialogs}
      <LaterDrawer
        open={laterOpen}
        programs={view.later}
        laterUntil={state.laterUntil}
        onClose={() => setLaterOpen(false)}
        onBack={p => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천에 다시 넣었어요.' }); }}
        onPrepare={p => { setLaterOpen(false); actions.onPrepare(p); }}
      />
    </>
  );
}
