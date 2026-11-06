import { useRef, useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate, useQuery, withQuery, type ScreenProps } from '../../app/router';
import { parseRecommendSub } from '../../domain/recommend-flow/flow';
import { parseRecQuery, recQuery, type RecSel } from '../../domain/recommend-flow/url';
import type { Program } from '../../domain/types';
import { LaterDrawer } from './Dialogs';
import { OppModal } from './OppModal';
import { Overview } from './Overview';
import { PrepareView } from './PrepareView';
import { useTriage } from './useTriage';
import './OppEntity';
import './recommend.css';

const hrefOf = (sel: RecSel) => withQuery('recommend', recQuery(sel));
// 이 화면에서 모달을 열며 기록을 하나 쌓았는지. 그랬다면 닫기는 뒤로 가기와 같다(기록이 모달 수만큼 쌓이지 않게).
let pushedOpen = false;

/**
 * 하위 경로: (없음) = 목록(추천 활동·전체 기회 탭), prepare/<id> = 신청 준비 3단계.
 * 탭·종류 칩·정렬·연 모달은 주소 뒤 ?tab=all&cat=edu&sort=new&open=<기회 id> 에 남는다. 새로고침·공유·뒤로 가기가 같은 화면을 연다.
 * 모달 열기는 기록을 하나 쌓아 뒤로 가기로 닫히고, 탭·칩·정렬은 기록을 바꿔 쓴다. 옛 모달 주소 #/recommend/<id> 는 앱 틀이 ?open=<id> 로 옮긴다(router canonicalPath).
 */
export default function RecommendScreen({ sub }: ScreenProps) {
  const { view, state, run } = useApp();
  const route = parseRecommendSub(sub);
  const sel = parseRecQuery(useQuery());
  const [laterOpen, setLaterOpen] = useState(false);
  // 모달이 닫히는 움직임 동안에도 같은 기회를 그린다.
  const shown = useRef(sel.open);
  if (sel.open) shown.current = sel.open;
  if (!sel.open) pushedOpen = false;

  const setSel = (next: RecSel) => navigate(hrefOf(next), { replace: true });
  const openOne = (p: Program) => {
    pushedOpen = true;
    navigate(hrefOf({ ...sel, open: p.id }));
  };
  const close = () => {
    if (pushedOpen) history.back();
    else setSel({ ...sel, open: undefined });
  };
  // 모달에서 미루거나 빼면 바로 목록에서 빠지고 모달이 닫힌다. 토스트의 '되돌리기'로 같은 자리에 돌아온다.
  const { actions, dialogs, busy } = useTriage(() => { if (sel.open) close(); }, { quick: true });

  if (route.view === 'prepare') return <PrepareView key={route.programId} programId={route.programId} />;

  return (
    <>
      <Overview sel={sel} onSel={setSel} onOpen={openOne} onPrepare={actions.onPrepare} onOpenLater={() => setLaterOpen(true)} />
      {/* 미루기 대화 상자(마감이 가까울 때)가 떠 있는 동안은 자세히 모달을 내려 둔다(Esc·포커스 가둠이 하나만 돌게) */}
      {shown.current && <OppModal open={!!sel.open && !busy} programId={shown.current} actions={actions} onClose={close} />}
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
