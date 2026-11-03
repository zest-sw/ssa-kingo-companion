import { useChallenges } from '../../app/challenges';
import { ProgressBar } from '../../components';
import { nextChallenges, progressLine } from '../../domain/challenges/summary';

/** 프로필의 도전 과제 진행: 한 줄 문장 + 다음 과제 2~3개의 진행 막대 + 숨은 과제 '?'. 비공개여도 보인다. */
export function ChallengeProgress() {
  const items = useChallenges();
  const { sentence, hiddenLeft } = progressLine(items);
  const next = nextChallenges(items, 3);
  return (
    <>
      <p className="pf-sentence">{sentence}</p>
      {next.length > 0 && (
        <ul className="pf-next">
          {next.map(c => (
            <li key={c.def.id} className="pf-next__item">
              <span className="pf-next__name">{c.def.name}</span>
              <ProgressBar value={c.progress.value} max={c.progress.max} label={`${c.def.name} 진행`} showText />
            </li>
          ))}
        </ul>
      )}
      {hiddenLeft > 0 && (
        <p className="pf-hidden">
          <span className="pf-hidden__marks" aria-hidden="true">{Array.from({ length: hiddenLeft }, (_, i) => <span key={i} className="pf-hidden__q">?</span>)}</span>
          숨은 과제 {hiddenLeft}개가 남았어요
        </p>
      )}
    </>
  );
}
