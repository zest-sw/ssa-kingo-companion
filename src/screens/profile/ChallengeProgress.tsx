import { useChallenges } from '../../app/challenges';
import { Icon, ProgressBar } from '../../components';
import { hiddenLeft } from '../../domain/challenges/showcase';
import { nextChallenges, progressKeyword } from '../../domain/challenges/summary';
import { RarityTag } from './RarityTag';

/**
 * 프로필의 도전 과제 진행: 키워드 한 줄 + 다음 과제 3개(아이콘·이름·진행 막대·희귀도) + 숨은 과제 'N개 남음'과 힌트 한 줄.
 * 퍼센트·총 완료율은 없다. 비공개여도 보인다.
 */
export function ChallengeProgress() {
  const items = useChallenges();
  const hidden = hiddenLeft(items);
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
              <RarityTag rarity={c.def.rarity} />
            </li>
          ))}
        </ul>
      )}
      {hidden.left > 0 && (
        <div className="pf-hidden">
          <span className="pf-hidden__marks" aria-hidden="true">{Array.from({ length: hidden.left }, (_, i) => <span key={i} className="pf-hidden__q">?</span>)}</span>
          <span className="pf-hidden__text">
            <b>숨은 과제 {hidden.left}개 남음</b>
            <span>{hidden.hint ? `힌트: ${hidden.hint}` : '조건은 달성하면 공개돼요'}</span>
          </span>
        </div>
      )}
    </>
  );
}
