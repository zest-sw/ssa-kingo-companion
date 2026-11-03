import type { ChallengeView } from '../../app/challenges';
import { Badge, Drawer, ProgressBar, Switch } from '../../components';
import { RARITY_LABEL } from '../../data/challenges';
import { wallState } from '../../domain/challenges/wall';

const RARITY_TONE = { common: 'neutral', uncommon: 'navy', rare: 'solid-orange' } as const;
const formatWhen = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

type Props = { item: ChallengeView | undefined; showcased: boolean; onShowcase: () => void; onClose: () => void };

/** 과제 한 개의 서랍. 숨은 과제는 달성 전까지 조건 없이 희귀도(일부는 힌트)만 보인다. */
export function ChallengeDrawer({ item, showcased, onShowcase, onClose }: Props) {
  if (!item) return null;
  const { def, progress, achieved, achievedAt } = item;
  const state = wallState(item);
  const rarity = <Badge tone={RARITY_TONE[def.rarity]}>{RARITY_LABEL[def.rarity]}</Badge>;
  return (
    <Drawer open onClose={onClose} eyebrow={state === 'locked' ? '숨은 도전 과제' : achieved ? '달성한 도전 과제' : '도전 과제'} title={state === 'locked' ? '숨은 도전 과제' : def.name}>
      <div className="ch-drawer">
        <p className="ch-drawer__badges">{rarity}{state === 'doing' && <Badge tone="green">진행 중</Badge>}</p>
        {state === 'locked' ? (
          <p>{def.hint ? `힌트: ${def.hint}` : '조건은 달성하면 공개돼요.'}</p>
        ) : (
          <>
            <p>{achieved ? def.praise : def.condition}</p>
            {achieved && <p className="ch-drawer__meta">{def.condition}</p>}
            {achieved && <p className="ch-drawer__meta num">{achievedAt ? formatWhen(achievedAt) : '달성했어요'}</p>}
            {!achieved && (def.note ? <p className="ch-drawer__meta">{def.note}</p> : <ProgressBar value={progress.value} max={progress.max} label={`${def.name} 진행도`} showText />)}
          </>
        )}
        {achieved && <div className="ch-card__showcase"><Switch checked={showcased} onChange={onShowcase} label="프로필에 전시" /></div>}
      </div>
    </Drawer>
  );
}
