import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { useOverviewState } from '../../app/useOverviewState';
import { showcaseable } from '../../domain/challenges';
import { toggled } from '../../domain/social';
import { BadgeTile } from './BadgeTile';
import { ChallengeDrawer } from './ChallengeDrawer';

type Sel = { last: string | null };
const isSel = (v: unknown): v is Sel => typeof v === 'object' && v !== null && 'last' in v;

/** 프로필 안 도전 과제 배지 벽. 칸을 누르면 과제 서랍. 전체 목록은 프로필의 펼치기로 본다. */
export function ChallengeWall() {
  const { state, run } = useApp();
  const items = useChallenges();
  const [sel, setSel] = useOverviewState<Sel>('profile', { last: null }, isSel);
  const [open, setOpen] = useState<string | null>(null);
  const ids = state.visibility.showcaseChallengeIds;
  const shown = showcaseable(items, ids).length;
  const openItem = items.find(c => c.def.id === open);

  const pick = (id: string) => { setOpen(id); setSel({ last: id }); };
  const showcase = (id: string) => run({ type: 'visibility/set', patch: { showcaseChallengeIds: toggled(ids, id) } });

  return (
    <>
      <div className="ch-wallhead">
        <p>전시 중 <b className="num">{shown}</b>개</p>
        <ul className="ch-legend" aria-label="칸 표시">
          <li><span className="ch-key ch-key--done" aria-hidden="true" />달성</li>
          <li><span className="ch-key ch-key--doing" aria-hidden="true" />진행</li>
          <li><span className="ch-key ch-key--locked" aria-hidden="true" />숨김</li>
          <li><span className="ch-key ch-key--cut" aria-hidden="true" />모서리가 깎일수록 희귀</li>
        </ul>
      </div>
      <ul className="ch-wall">
        {items.map(item => (
          <BadgeTile key={item.def.id} item={item} showcased={ids.includes(item.def.id)} recent={sel.last === item.def.id} onOpen={() => pick(item.def.id)} />
        ))}
      </ul>
      <ChallengeDrawer item={openItem} showcased={!!open && ids.includes(open)} onShowcase={() => open && showcase(open)} onClose={() => setOpen(null)} />
    </>
  );
}
