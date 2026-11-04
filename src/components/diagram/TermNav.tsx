import { IconButton } from '../Button';

/**
 * 학기가 많은 그림의 앞뒤 넘기기. 보이는 학기 범위를 가운데 두고, 앞에 접힌 학기 수를 함께 말한다.
 * 접힌 학기가 없으면 아무것도 그리지 않는다.
 */
export function TermNav({ range, before, after, onPrev, onNext }: { range: string; before: number; after: number; onPrev: () => void; onNext: () => void }) {
  if (before === 0 && after === 0) return null;
  return (
    <div className="ui-termnav" role="group" aria-label="학기 넘기기">
      <IconButton icon="back" label={`이전 학기 보기, ${before}학기 더 있어요`} onClick={onPrev} disabled={before === 0} />
      <span className="ui-termnav__text">
        <span className="num">{range}</span>
        {before > 0 && <span className="ui-termnav__more">이전 <b className="num">{before}</b>학기</span>}
      </span>
      <IconButton icon="chevron" label="다음 학기 보기" onClick={onNext} disabled={after === 0} />
    </div>
  );
}
