import type { ChallengeView } from '../../app/challenges';
import { Icon } from '../../components';
import { RARITY_LABEL } from '../../data/challenges';
import { fillRatio, RARITY_STEP, wallState, type WallState } from '../../domain/challenges/wall';

// 희귀도는 모서리를 깎는 정도(0 둥근 사각 → 2 많이 깎음)로 보여 준다. 색이나 숫자로 순위를 만들지 않는다.
const SHAPE = [
  <rect key="s0" x="4" y="4" width="92" height="92" rx="16" />,
  <polygon key="s1" points="26,4 74,4 96,26 96,74 74,96 26,96 4,74 4,26" />,
  <polygon key="s2" points="38,4 62,4 96,38 96,62 62,96 38,96 4,62 4,38" />
] as const;

const STATE_LABEL: Record<WallState, string> = { done: '달성', doing: '진행 중', locked: '숨은 도전 과제', idle: '시작 전' };

type Props = { item: ChallengeView; showcased: boolean; recent: boolean; onOpen: () => void };

/** 배지 벽의 한 칸. 달성은 채움, 진행은 아래 얇은 막대, 숨김은 '?'. 누르면 과제 서랍이 열린다. */
export function BadgeTile({ item, showcased, recent, onOpen }: Props) {
  const state = wallState(item);
  const step = RARITY_STEP[item.def.rarity];
  const name = state === 'locked' ? '숨은 과제' : item.def.name;
  const label = [name, STATE_LABEL[state], state === 'doing' ? `${item.progress.value}/${item.progress.max}` : '', `희귀도 ${RARITY_LABEL[item.def.rarity]}`, showcased ? '전시 중' : ''].filter(Boolean).join(', ');
  return (
    <li>
      <button type="button" className={`ch-badge ch-badge--${state}${recent ? ' is-recent' : ''}`} aria-label={`${label}. 자세히 보기`} onClick={onOpen}>
        <span className="ch-badge__shape" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="ch-badge__svg">{SHAPE[step]}</svg>
          <span className="ch-badge__icon">{state === 'locked' ? '?' : <Icon name={item.def.icon} size={28} />}</span>
          {showcased && <span className="ch-badge__pin" />}
        </span>
        {state === 'doing' && (
          <span className="ch-badge__bar" aria-hidden="true"><span style={{ width: `${Math.round(fillRatio(item) * 100)}%` }} /></span>
        )}
        <span className="ch-badge__name" aria-hidden="true">{name}</span>
      </button>
    </li>
  );
}
