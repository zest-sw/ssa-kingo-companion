import { RARITY_LABEL, type Rarity } from '../../data/challenges';
import { RARITY_STEP } from '../../domain/challenges/wall';
import { TODAY_YEAR } from '../../domain/today';

/**
 * 희귀도 꼬리표(스팀 전체 달성률 대신): 단계 이름 + 작은 마름모 1~3개. 퍼센트는 없다.
 * 주황은 마감·오늘 같은 챙길 것에만 쓰는 색이라 희귀도는 네이비 한 색의 개수로만 나눈다.
 */
export function RarityTag({ rarity }: { rarity: Rarity }) {
  const on = RARITY_STEP[rarity] + 1;
  return (
    <span className={`pf-rarity pf-rarity--${rarity}`}>
      <span className="pf-rarity__pips" aria-hidden="true">
        {[0, 1, 2].map(i => <span key={i} className={`pf-rarity__pip${i < on ? ' is-on' : ''}`} />)}
      </span>
      {RARITY_LABEL[rarity]}
    </span>
  );
}

export const formatWhen = (d: Date) => `${formatDay(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
/** 올해가 아니면 연도를 붙인다. 연도 없이 '11월 27일'만 있으면 오늘(10월) 뒤의 날처럼 읽힌다. */
export const formatDay = (d: Date) => `${d.getFullYear() === TODAY_YEAR ? '' : `${d.getFullYear()}년 `}${d.getMonth() + 1}월 ${d.getDate()}일`;
