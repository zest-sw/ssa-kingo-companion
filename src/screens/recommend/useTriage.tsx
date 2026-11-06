import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { DISLIKES } from '../../data/options';
import { ddayOf } from '../../domain/recommend';
import { defaultLater, laterUntilDay, prepareHref } from '../../domain/recommend-flow/flow';
import type { DislikeKind, Program } from '../../domain/types';
import type { CardActions } from './actions';
import { DismissModal, LaterModal } from './Dialogs';

/**
 * 후보 분류(Linear 분류함): 신청 준비 / 나중에 보기 / 관심 없음. afterChoose 는 미루거나 뺀 뒤에 할 일(모달이면 닫기).
 * quick: 묻지 않고 바로 목록에서 빼고 '되돌리기' 토스트를 띄운다(추천 화면). 다시 볼 날은 다음 주(마감이 가까우면 그 전)로 잡는다.
 * quick 이 아니면 다시 볼 날·관심 없는 이유를 대화 상자로 묻는다(분석 요약의 다음 걸음).
 */
export function useTriage(afterChoose?: () => void, opts: { quick?: boolean } = {}): { actions: CardActions; dialogs: React.ReactNode; busy: boolean } {
  const { state, run } = useApp();
  const [dismissing, setDismissing] = useState<Program>();
  const [postponing, setPostponing] = useState<Program>();

  const onPrepare = (p: Program) => {
    run({ type: 'candidate/choose', programId: p.id, choice: 'preparing' });
    navigate(prepareHref(p.id));
  };
  const dismiss = (p: Program, kind?: DislikeKind) => {
    setDismissing(undefined);
    const toast = kind ? DISLIKES.find(d => d.id === kind)?.toast : '관심 없음으로 옮겼어요';
    run({ type: 'candidate/choose', programId: p.id, choice: 'dismissed', reason: kind }, { toast, undoable: true });
    afterChoose?.();
  };
  const postpone = (p: Program, days: number) => {
    setPostponing(undefined);
    run({ type: 'candidate/choose', programId: p.id, choice: 'later', until: laterUntilDay(state.week, days) }, { toast: '나중에 보기로 옮겼어요', undoable: true });
    afterChoose?.();
  };
  const onLater = (p: Program) => {
    const day = opts.quick ? defaultLater(ddayOf(p, state.week)) : undefined;
    // 마감이 가까워 미룰 수 없으면 대화 상자가 그 까닭을 알린다.
    if (day) postpone(p, day.days);
    else setPostponing(p);
  };

  return {
    actions: { onPrepare, onLater, onDismiss: opts.quick ? p => dismiss(p) : setDismissing },
    busy: !!dismissing || !!postponing,
    dialogs: (
      <>
        <DismissModal program={dismissing} onPick={dismiss} onClose={() => setDismissing(undefined)} />
        <LaterModal week={state.week} program={postponing} onPick={postpone} onClose={() => setPostponing(undefined)} />
      </>
    )
  };
}
