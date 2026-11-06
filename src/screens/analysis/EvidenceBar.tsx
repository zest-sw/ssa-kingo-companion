import type { CSSProperties } from 'react';

type Props = {
  confirmed: number;
  total: number;
  /** 여러 줄을 나란히 둘 때 가장 긴 줄의 전체 수. 막대 길이가 이 값에 맞춰 줄어든다 */
  max?: number;
  /** 막대 옆 '확인 10 / 전체 14' 글자. 옆에 같은 숫자가 이미 있으면 끈다 */
  text?: boolean;
};

/**
 * 근거 수를 얇은 두 겹 막대로: 확인한 근거는 진한 막대, AI 추정은 점선 칸.
 * 점을 늘어놓으면 별점처럼 읽혀서, 개수 그대로 '확인 10 / 전체 14' 로 읽히게 그린다.
 */
export function EvidenceBar({ confirmed, total, max = total, text = true }: Props) {
  const est = Math.max(0, total - confirmed);
  const width = `${max > 0 ? Math.max(8, (total / max) * 100) : 0}%`;
  return (
    <span className="an-ebar" role="img" aria-label={`확인 근거 ${confirmed}개, AI 추정 ${est}개`}>
      <span className="an-ebar__track" style={{ '--w': width } as CSSProperties} aria-hidden="true">
        {confirmed > 0 && <span className="an-ebar__yes" style={{ flexGrow: confirmed }} />}
        {est > 0 && <span className="an-ebar__est" style={{ flexGrow: est }} />}
      </span>
      {text && <span className="an-ebar__n num" aria-hidden="true">확인 <b>{confirmed}</b> / 전체 {total}</span>}
    </span>
  );
}
