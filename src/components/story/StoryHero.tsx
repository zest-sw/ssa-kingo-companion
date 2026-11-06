import { useEffect, useRef, useState } from 'react';
import type { Identity } from '../../domain/insight/story';
import { Button } from '../Button';
import { useChangeCount } from '../Flash';
import { AiMark } from '../AiMark';

type Props = {
  identity: Identity;
  /** 학생이 고른 문장(맞아요 = 지금 문장). null 이면 고른 것을 지운다 */
  onAnswer?: (text: string | null) => void;
  /** 머리 제목 수준. 홈·분석 요약 모두 카드 안이라 기본 h2 */
  as?: 'h1' | 'h2';
};

/**
 * 나는 어떤 사람인가 한 문장. 시스템이 기록을 읽고 세운 가설이라 확인 전에는 옅은 점선 밑줄, 학생이 고르면 실선.
 * 맞아요 / 다르게 볼래요(대안 2~3개 중 고르기). 대안이 없으면(새 학생의 시작점) 버튼을 두지 않는다.
 */
export function StoryHero({ identity, onAnswer, as: H = 'h2' }: Props) {
  const [choosing, setChoosing] = useState(false);
  const confirmed = identity.status === 'confirmed';
  const canAnswer = !!onAnswer && (identity.alternatives.length > 0 || confirmed);
  const box = useRef<HTMLDivElement>(null);
  const focusText = () => box.current?.querySelector<HTMLElement>('.ui-story-hero__text')?.focus({ preventScroll: true });
  // '맞아요'는 고르기를 열지 않고 바로 사라지므로 그린 뒤 문장 제목으로 초점을 직접 옮긴다.
  const pick = (text: string) => { onAnswer?.(text); setChoosing(false); requestAnimationFrame(focusText); };
  const moved = useRef(false);
  // 누른 버튼이 사라지는 자리라 초점을 옮긴다: 고르기를 열면 첫 문장으로, 닫으면 문장 제목으로. 첫 그림에서는 옮기지 않는다.
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    if (choosing) box.current?.querySelector<HTMLElement>('.ui-story-hero__alt')?.focus({ preventScroll: true });
    else focusText();
  }, [choosing]);
  // 확인한 순간에만 점선이 실선으로 바뀌는 전이(처음부터 확인이면 가만히)
  const flips = useChangeCount(`${confirmed}:${identity.text}`);

  return (
    <div ref={box} className="ui-story-hero">
      <p className="ui-story-hero__basis">
        <span>{identity.basis} {confirmed ? '내가 고른 문장이에요' : '세운 가설이에요'}</span>
        {!confirmed && <AiMark />}
      </p>
      <H tabIndex={-1} className={`ui-story-hero__text${confirmed ? ' is-confirmed' : ''}`}>
        {confirmed ? <span key={flips} className={flips > 0 ? 'ui-confirm-in' : undefined}>{identity.text}</span> : <AiMark variant="line">{identity.text}</AiMark>}
      </H>
      {canAnswer && !choosing && (
        <div className="ui-story-hero__act">
          {confirmed ? (
            <Button size="sm" variant="ghost" onClick={() => setChoosing(true)}>다시 고르기</Button>
          ) : (
            <>
              <Button size="sm" icon="check" onClick={() => pick(identity.text)}>맞아요</Button>
              <Button size="sm" variant="ghost" onClick={() => setChoosing(true)}>다르게 볼래요</Button>
            </>
          )}
        </div>
      )}
      {canAnswer && choosing && (
        <fieldset className="ui-story-hero__alts">
          <legend className="ui-story-hero__legend">어느 쪽이 더 나 같나요?</legend>
          {(confirmed ? [identity.text, ...identity.alternatives] : identity.alternatives).map(t => (
            <button key={t} type="button" className="ui-story-hero__alt" aria-pressed={confirmed && t === identity.text} onClick={() => pick(t)}>{t}</button>
          ))}
          <div className="ui-story-hero__act">
            {confirmed && <Button size="sm" variant="ghost" onClick={() => { onAnswer?.(null); setChoosing(false); }}>고른 것 지우기</Button>}
            <Button size="sm" variant="ghost" onClick={() => setChoosing(false)}>그대로 둘게요</Button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
