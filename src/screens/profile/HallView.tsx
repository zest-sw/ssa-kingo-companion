import { useMemo, useState } from 'react';
import { useApp } from '../../app/AppState';
import { Button, Drawer, Modal } from '../../components';
import { HALL, type HallEntry } from '../../data/friends';
import { HALL_JOINED } from '../../data/hall';
import { byJoined, joinedLabel } from '../../domain/hallStage';
import { HallStage } from './HallStage';
import { PathTree } from './PathTree';
import './hall.css';

// View Transitions 가 넘어오는 움직임을 맡으면 장면 쪽 들어서기 움직임은 끈다(두 번 겹치지 않게).
const cssEnter = typeof document !== 'undefined' && !('startViewTransition' in document);

/**
 * 명예의 전당 = 표 대신 장면. 옅은 기둥·아치 아래 무대로 오른 사람이 오른 날짜순으로 지나간다.
 * 누르면 그 사람이 걸어온 길(PathTree) 서랍. 올라가기·내리기는 위 한 줄에서.
 */
export function HallView() {
  const { state, run } = useApp();
  const consent = state.visibility.hallOfFameConsent;
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState<HallEntry | null>(null);
  const people = useMemo(() => byJoined(HALL, HALL_JOINED), []);

  const join = () => {
    run({ type: 'visibility/set', patch: { hallOfFameConsent: true } }, { toast: '명예의 전당에 올라갔어요. 언제든 내릴 수 있어요' });
    setAsking(false);
  };
  const leave = () => run({ type: 'visibility/set', patch: { hallOfFameConsent: false } }, { toast: '명예의 전당에서 내렸어요' });

  return (
    <div className="hall-scene" data-enter={cssEnter || undefined}>
      <div className="hall-scene__top">
        <p className="hall-scene__note">공개하고 전당에 오르기로 동의한 학생만 있어요. 순위 없이 오른 날짜순이에요.</p>
        {consent ? <Button size="sm" onClick={leave}>내 자리 내리기</Button> : <Button size="sm" variant="primary" onClick={() => setAsking(true)}>나도 올라가기</Button>}
      </div>
      <HallStage people={people} joined={HALL_JOINED} onOpen={setOpen} />

      <Drawer open={open !== null} title={open ? `${open.name}님이 걸어온 길` : ''} eyebrow={open && `${open.dept} ${open.year}학년`} onClose={() => setOpen(null)}>
        {open && (
          <div className="fr-stack">
            <p className="hall-drawer__why">{open.reason}</p>
            <p className="fr-empty">{[open.start, joinedLabel(HALL_JOINED[open.id])].filter(Boolean).join(' · ')}</p>
            <PathTree path={open.path} label={`${open.name}님이 거쳐 온 활동`} />
            {open.retro && <blockquote className="fr-quote"><span className="fr-quote__label">공개한 회고</span>{open.retro}</blockquote>}
            <p className="fr-empty">같은 길을 따라가야 하는 건 아니에요. 마음이 가는 활동 하나만 골라 봐도 돼요.</p>
          </div>
        )}
      </Drawer>

      <Modal
        open={asking}
        title="명예의 전당에 올라가요"
        onClose={() => setAsking(false)}
        actions={<><Button onClick={() => setAsking(false)}>취소</Button><Button variant="primary" onClick={join}>올라가기</Button></>}
      >
        <p>프로필 공개와 따로 받는 동의예요. 공개한 활동 경로와 고른 회고가 다른 학생에게 보여요. 순위와 점수는 없고, 언제든 내릴 수 있어요.</p>
      </Modal>
    </div>
  );
}
