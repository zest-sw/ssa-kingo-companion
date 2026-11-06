import { useChallenges } from '../../app/challenges';
import { challengeTrack, nextChallenges } from '../../domain/challenges/summary';

/**
 * 프로필의 도전 과제 진행 그림: 달성한 칸(옅은 초록 칸) + 다음 칸 하나(옅은 실선 틀), 아래에 다음 과제 이름과 열리는 때.
 * 높은 화면에서는 그다음 과제 둘을 옅게 더 보인다(남는 높이를 빈 카드 대신 다음 걸음으로). 점수·레벨·희귀도는 없다. 비공개여도 보인다.
 */
export function ChallengeProgress() {
  const all = useChallenges();
  const { done, next } = challengeTrack(all);
  // 한 과제씩 같은 규칙으로 '언제 열리는지'를 만든다(맨 앞은 위에서 이미 보였다)
  const later = nextChallenges(all, 3).slice(1).flatMap(r => challengeTrack([r]).next ?? []);
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
      {later.length > 0 && (
        <ul className="pf-track__later only-tall" aria-label="그다음 과제">
          {later.map(l => <li key={l.name} className="pf-track__next"><b>{l.name}</b><span>{l.when}</span></li>)}
        </ul>
      )}
    </div>
  );
}
