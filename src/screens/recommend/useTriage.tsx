import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { DISLIKES } from '../../data/options';
import { laterUntilDay, prepareHref } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';
import type { CardActions } from './actions';
import { DismissModal, LaterModal } from './Dialogs';

/**
 * 후보 분류(Linear 분류함): 신청 준비 / 나중에 보기(다시 볼 날 고르기) / 관심 없음(이유 고르기).
 * 홈의 가장 추천과 추천 화면이 같은 규칙과 같은 대화 상자를 쓴다. afterChoose 는 미루거나 뺀 뒤에 할 일(자세히 화면이면 목록으로).
 */
export function useTriage(afterChoose?: () => void): { actions: CardActions; dialogs: React.ReactNode; busy: boolean } {
  const { state, run } = useApp();
  const [dismissing, setDismissing] = useState<Program>();
  const [postponing, setPostponing] = useState<Program>();

  const onPrepare = (p: Program) => {
    run({ type: 'candidate/choose', programId: p.id, choice: 'preparing' });
    navigate(prepareHref(p.id));
  };
  const dismiss = (p: Program, kind: DislikeKind) => {
    setDismissing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'dismissed', reason: kind }, { toast: DISLIKES.find(d => d.id === kind)?.toast, undoable: true });
    afterChoose?.();
  };
  const postpone = (p: Program, days: number) => {
    setPostponing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'later', until: laterUntilDay(state.week, days) }, { toast: '나중에 보기에 넣었어요. 고른 날 다시 보여요.', undoable: true });
    afterChoose?.();
  };

  return {
    actions: { onPrepare, onLater: setPostponing, onDismiss: setDismissing },
    busy: !!dismissing || !!postponing,
    dialogs: (
      <>
        <DismissModal program={dismissing} onPick={dismiss} onClose={() => setDismissing(undefined)} />
        <LaterModal week={state.week} program={postponing} onPick={postpone} onClose={() => setPostponing(undefined)} />
      </>
    )
  };
}
