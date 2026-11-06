import { useChallenges } from '../../app/challenges';
import { challengeTrack } from '../../domain/challenges/summary';

/**
 * 프로필의 도전 과제 진행 그림: 달성한 칸(채움) + 다음 칸 하나(회색 점선), 아래에 다음 과제 이름과 열리는 때.
 * 점수·레벨·희귀도는 없다. 비공개여도 보인다.
 */
export function ChallengeProgress() {
  const { done, next } = challengeTrack(useChallenges());
  const label = `달성 ${done}개${next ? `, 다음은 ${next.name}` : ''}`;
  return (
    <div className="pf-track">
      <div className="pf-track__row">
        <ol className="pf-track__cells" role="img" aria-label={label}>
          {Array.from({ length: done }, (_, i) => <li key={i} className="pf-track__cell pf-track__cell--done" />)}
          {next && <li className="pf-track__cell pf-track__cell--next" />}
        </ol>
        <span className="pf-track__count num">달성 {done}</span>
      </div>
      {next
        ? <p className="pf-track__next"><b>{next.name}</b><span>{next.when}</span></p>
        : <p className="pf-track__next"><span>드러난 과제를 모두 이뤘어요</span></p>}
    </div>
  );
}
