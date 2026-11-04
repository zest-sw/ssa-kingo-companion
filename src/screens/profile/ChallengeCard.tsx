import type { ChallengeView } from '../../app/challenges';
import { Icon, ProgressBar } from '../../components';
import { TODAY_YEAR } from '../../domain/today';

type Props = { item: ChallengeView };

/** 올해가 아니면 연도를 붙인다. 연도 없이 '11월 27일'만 있으면 오늘 뒤의 날처럼 읽힌다. */
const formatDay = (d: Date) => `${d.getFullYear() === TODAY_YEAR ? '' : `${d.getFullYear()}년 `}${d.getMonth() + 1}월 ${d.getDate()}일`;
const formatWhen = (d: Date) => `${formatDay(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** 도전 과제 한 장. 숨은 과제는 달성한 뒤에만 목록에 나온다. */
export function ChallengeCard({ item }: Props) {
  const { def, progress, achieved, achievedAt } = item;
  return (
    <li className={`ch-card${achieved ? ' ch-card--done' : ''}`}>
      <div className="ch-card__head">
        <span className="ch-card__icon" aria-hidden="true"><Icon name={def.icon} /></span>
        <h3 className="ch-card__name">{def.name}</h3>
      </div>
      <p className="ch-card__desc">{achieved ? def.praise : def.condition}</p>
      {achieved ? (
        <div className="ch-card__foot">
          <span className="num">{achievedAt ? `${formatWhen(achievedAt)} 달성` : '달성했어요'}</span>
        </div>
      ) : (
        <>
          {def.note ? <p className="ch-card__meta">{def.note}</p> : <ProgressBar value={progress.value} max={progress.max} label={`${def.name} 진행도`} showText />}
          <div className="ch-card__foot"><span>{progress.value > 0 ? '진행 중' : '시작 전'}</span></div>
        </>
      )}
    </li>
  );
}
