import { Badge, Icon, ProgressBar } from '../../components';
import { RARITY_LABEL } from '../../data/challenges';
import { Switch } from './Switch';
import { formatWhen, type ChallengeView } from './useChallenges';

type Props = { item: ChallengeView; showcased: boolean; onShowcase: (next: boolean) => void };

const RARITY_TONE = { common: 'neutral', uncommon: 'navy', rare: 'solid-orange' } as const;

/** 숨은 과제는 달성 전까지 조건 없이 희귀도만(일부는 힌트) 보인다. */
export function ChallengeCard({ item, showcased, onShowcase }: Props) {
  const { def, progress, achieved, achievedAt } = item;
  const locked = def.hidden && !achieved;
  const rarity = <Badge tone={RARITY_TONE[def.rarity]}>{RARITY_LABEL[def.rarity]}</Badge>;

  if (locked) {
    return (
      <li className="ch-card ch-card--locked">
        <span className="ch-card__icon" aria-hidden="true">?</span>
        <h3 className="ch-card__name">숨은 도전 과제</h3>
        <p className="ch-card__desc">{def.hint ? `힌트: ${def.hint}` : '조건은 달성하면 공개돼요'}</p>
        <div className="ch-card__foot">
          <span>{def.hint ? '힌트 1개' : '희귀도만 보여요'}</span>
          {rarity}
        </div>
      </li>
    );
  }

  return (
    <li className={`ch-card${achieved ? ' ch-card--done' : ''}`}>
      <span className="ch-card__icon" aria-hidden="true"><Icon name={def.icon} size={22} /></span>
      <h3 className="ch-card__name">{def.name}</h3>
      <p className="ch-card__desc">{achieved ? def.praise : def.condition}</p>
      {achieved ? (
        <>
          <p className="ch-card__meta">{def.condition}</p>
          <div className="ch-card__foot">
            <span className="num">{achievedAt ? formatWhen(achievedAt) : '달성했어요'}</span>
            {rarity}
          </div>
          <div className="ch-card__showcase"><Switch checked={showcased} onChange={onShowcase} label="프로필에 전시" /></div>
        </>
      ) : (
        <>
          {def.note ? <p className="ch-card__meta">{def.note}</p> : <ProgressBar value={progress.value} max={progress.max} label={`${def.name} 진행도`} showText />}
          <div className="ch-card__foot">
            <span>{def.hidden ? '숨은 도전 과제' : progress.value > 0 ? '진행 중' : '시작 전'}</span>
            {rarity}
          </div>
        </>
      )}
    </li>
  );
}
