import { useChallenges } from '../../app/challenges';
import { Icon, ProgressBar } from '../../components';
import { nextChallenges, progressKeyword, progressLine } from '../../domain/challenges/summary';

/** 프로필의 도전 과제 진행: 키워드 한 줄 + 다음 과제 2~3개의 진행 막대(아이콘·이름·n/m) + 숨은 과제 '?'. 비공개여도 보인다. */
export function ChallengeProgress() {
  const items = useChallenges();
  const { hiddenLeft } = progressLine(items);
  const next = nextChallenges(items, 3);
  return (
    <>
      <p className="pf-sentence">{progressKeyword(items)}</p>
      {next.length > 0 && (
        <ul className="pf-next">
          {next.map(c => (
            <li key={c.def.id} className="pf-next__item">
              <span className="pf-next__name"><Icon name={c.def.icon} size={18} />{c.def.name}</span>
              <ProgressBar value={c.progress.value} max={c.progress.max} label={`${c.def.name} 진행`} showText />
            </li>
          ))}
        </ul>
      )}
      {hiddenLeft > 0 && (
        <p className="pf-hidden">
          <span className="pf-hidden__marks" aria-hidden="true">{Array.from({ length: hiddenLeft }, (_, i) => <span key={i} className="pf-hidden__q">?</span>)}</span>
          숨은 과제 {hiddenLeft}
        </p>
      )}
    </>
  );
}
