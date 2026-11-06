import type { ReactNode } from 'react';

type Props =
  /** tag: 글자 옆 작은 '추정' 표지 */
  | { variant?: 'tag'; children?: never }
  /** line: 감싼 글자에 옅은 점선 밑줄(확인 전 AI 문장) */
  | { variant: 'line'; children: ReactNode };

/**
 * AI 추정 표시는 이 부품 하나로 한다(점선 = AI 추정, 결정 2026-11-04). 반짝이·별 기호는 쓰지 않는다.
 * 학생이 확인하면 표시를 떼고 그냥 글자로 둔다. 스크린 리더에는 'AI 추정'이라고 읽힌다.
 *
 *   <p>{line}<AiMark /></p>
 *   <AiMark variant="line">{identity.text}</AiMark>
 */
export function AiMark(props: Props) {
  if (props.variant === 'line') {
    return (
      <span className="ui-ai-line">
        {props.children}
        <span className="sr-only"> (AI 추정, 확인 전)</span>
      </span>
    );
  }
  return (
    <span className="ui-ai-tag" title="기록을 읽고 에이전트가 추정했어요">
      <span aria-hidden="true">추정</span>
      <span className="sr-only">AI 추정</span>
    </span>
  );
}
