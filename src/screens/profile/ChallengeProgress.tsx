import { useChallenges } from '../../app/challenges';
import { Icon, ProgressBar } from '../../components';
import { nextChallenges, progressKeyword } from '../../domain/challenges/summary';

/** 프로필의 도전 과제 진행: 키워드 한 줄 + 다음 과제 3개(아이콘·이름·진행 막대). 퍼센트·총 완료율은 없다. 비공개여도 보인다. */
export function ChallengeProgress() {
  const items = useChallenges();
  const next = nextChallenges(items, 3);
  return (
    <>
      <p className="pf-sentence">{progressKeyword(items)}</p>
      {next.length > 0 && (
        <ul className="pf-next">
          {next.map(c => (
            <li key={c.def.id} className="pf-next__item">
              <span className="pf-next__name"><Icon name={c.def.icon} size={18} />{c.def.name}</span>
              {c.def.note
                ? <span className="pf-next__note">{c.def.note}</span>
                : <ProgressBar value={c.progress.value} max={c.progress.max} label={`${c.def.name} 진행`} showText />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
