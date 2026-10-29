/**
 * 근거 점. 학생이 확인한 것은 채운 점, AI 추정은 옅은 점선 원.
 * 불확실함을 색이 아니라 선 모양으로 전한다.
 */
export function ConfirmDot({ state, label }: { state: 'confirmed' | 'estimated'; label?: string }) {
  const text = label ?? (state === 'confirmed' ? '확인' : 'AI 추정');
  return <span className={`ui-dot ui-dot--${state}`} role="img" aria-label={text} title={text} />;
}

/** 카드 머리에 두는 범례: 채운 점 = 확인, 점선 원 = AI 추정 */
export function ConfirmLegend() {
  return (
    <span className="ui-legend">
      <span><span className="ui-dot ui-dot--confirmed" aria-hidden="true" />확인</span>
      <span><span className="ui-dot ui-dot--estimated" aria-hidden="true" />AI 추정</span>
    </span>
  );
}
