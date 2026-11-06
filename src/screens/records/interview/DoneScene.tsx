import { useId, useRef } from 'react';
import { AiMark, Button, ConfirmDot, useFocusOnChange } from '../../../components';
import type { ChangeLine } from '../../../domain/interview/outcome';
import type { RecordCard } from '../../../domain/types';
import { CardSheet } from './CardSheet';

type Props = {
  title: string;
  meta: string;
  verification: 'school' | 'self';
  card: RecordCard;
  changes: ChangeLine[];
  onAnalysis: () => void;
  /** 다른 회고가 기다리면 그 활동 이름과 남은 수 */
  next?: { title: string; left: number; go: () => void };
};

/**
 * 저장 뒤 끝 장면(피크엔드). 방금 만든 카드가 주인공이고, 이번 회고로 바뀐 것 두 줄과 다음 걸음 하나를 준다.
 * 카드는 빠르게 시작해 부드럽게 멈추며 올라온다. 내용은 처음부터 보인다(움직임 줄이기면 바로 놓인다).
 */
export function DoneScene({ title, meta, verification, card, changes, onAnalysis, next }: Props) {
  const head = useRef<HTMLHeadingElement>(null);
  const cardTitle = useId();
  useFocusOnChange(head, null, { onMount: true });
  return (
    <section className="iv-done" aria-labelledby="iv-done-title">
      <h2 ref={head} id="iv-done-title" tabIndex={-1} className="iv-q__ask">경험 카드 1장이 생겼어요</h2>
      <div className="iv-done__card"><CardSheet title={title} meta={meta} verification={verification} card={card} titleId={cardTitle} /></div>
      <ul className="iv-done__changes" aria-label="이번 회고로 바뀐 것">
        {changes.map(c => (
          <li key={c.text} data-estimate={c.estimate || undefined}>
            {c.estimate ? <ConfirmDot state="estimated" label="확인 전" /> : <span className="iv-done__bullet" aria-hidden="true" />}
            <span>{c.text}</span>
            {c.estimate && <AiMark />}
          </li>
        ))}
      </ul>
      <div className="iv-done__actions">
        <Button variant="primary" onClick={onAnalysis}>분석에서 보기</Button>
        {next && <Button onClick={next.go} aria-label={`다음 회고 쓰기: ${next.title}`}>다음 회고 쓰기</Button>}
      </div>
      {next && <p className="iv-done__more">{next.left > 1 ? `회고를 기다리는 활동이 ${next.left}개 더 있어요.` : `‘${next.title}’도 회고를 기다려요.`}</p>}
    </section>
  );
}
