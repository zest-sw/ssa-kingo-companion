import { useRef } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, useQuery, withQuery, type ScreenProps } from '../../app/router';
import { parseRecommendSub } from '../../domain/recommend-flow/flow';
import { parseRecQuery, recQuery, type RecPanel, type RecSel } from '../../domain/recommend-flow/url';
import type { Program } from '../../domain/types';
import { LaterDrawer } from './Dialogs';
import { OppModal } from './OppModal';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import { useTriage } from './useTriage';
import './OppEntity';
import './recommend.css';
import '../sizes.css';

const hrefOf = (sel: RecSel) => withQuery('recommend', recQuery(sel));
// 이 화면에서 모달·서랍을 열며 기록을 하나 쌓았는지. 그랬다면 닫기는 뒤로 가기와 같다(기록이 연 수만큼 쌓이지 않게).
let pushed = false;

/**
 * 하위 경로: (없음) = 목록(추천 활동·전체 기회 탭), prepare/<id> = 신청 준비 3단계.
 * 탭·종류 칩·정렬·연 모달은 주소 뒤 ?tab=all&cat=edu&sort=new&open=<기회 id> 에, 어떻게 골랐나·나중에 보기는 ?panel=how|later 에 남는다. 새로고침·공유·뒤로 가기가 같은 화면을 연다.
 * 모달·서랍 열기는 기록을 하나 쌓아 뒤로 가기로 닫히고, 탭·칩·정렬은 기록을 바꿔 쓴다. 옛 모달 주소 #/recommend/<id> 는 앱 틀이 ?open=<id> 로 옮긴다(router canonicalPath).
 */
export default function RecommendScreen({ sub }: ScreenProps) {
  const { view, state, run } = useApp();
  const route = parseRecommendSub(sub);
  const sel = parseRecQuery(useQuery());
  // 모달이 닫히는 움직임 동안에도 같은 기회를 그린다.
  const shown = useRef(sel.open);
  if (sel.open) shown.current = sel.open;
  if (!sel.open && !sel.panel) pushed = false;

  const setSel = (next: RecSel) => navigate(hrefOf(next), { replace: true });
  // 어떻게 골랐나에서 기회를 고르면 그 기록을 모달로 바꿔 쓴다(닫으면 목록으로). history.back 은 늦게 돌아서 닫고 여는 두 걸음으로 나누지 않는다.
  const openOne = (p: Program) => {
    const replace = !!sel.panel && pushed;
    pushed = true;
    navigate(hrefOf({ ...sel, panel: undefined, open: p.id }), { replace });
  };
  const close = () => {
    if (pushed) history.back();
    else setSel({ ...sel, open: undefined });
  };
  const openPanel = (panel: RecPanel) => {
    pushed = true;
    navigate(hrefOf({ ...sel, panel }));
  };
  const closePanel = () => {
    if (pushed) history.back();
    else setSel({ ...sel, panel: undefined });
  };
  // 모달에서 미루거나 빼면 바로 목록에서 빠지고 모달이 닫힌다. 토스트의 '되돌리기'로 같은 자리에 돌아온다.
  const { actions, dialogs, busy } = useTriage(() => { if (sel.open) close(); }, { quick: true });

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  return (
    <>
      <Overview sel={sel} onSel={setSel} onOpen={openOne} onPrepare={actions.onPrepare} onPanel={openPanel} onClosePanel={closePanel} />
      {/* 미루기 대화 상자(마감이 가까울 때)가 떠 있는 동안은 자세히 모달을 내려 둔다(Esc·포커스 가둠이 하나만 돌게) */}
      {shown.current && <OppModal open={!!sel.open && !busy} programId={shown.current} actions={actions} onClose={close} />}
      {dialogs}
      <LaterDrawer
        open={sel.panel === 'later'}
        programs={view.later}
        laterUntil={state.laterUntil}
        onClose={closePanel}
        onBack={p => { run({ type: 'candidate/clear', programId: p.id }, { toast: '추천에 다시 넣었어요.' }); }}
        // 신청 준비로 옮기면 서랍은 화면과 함께 닫힌다. 뒤로 가기로 돌아오면 서랍이 다시 열린 목록이다.
        onPrepare={actions.onPrepare}
      />
    </>
  );
}
