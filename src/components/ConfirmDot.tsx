import { LegendList } from './diagram/Legend';

/**
 * 근거 점. 학생이 확인한 것은 채운 점, AI 추정은 옅은 점선 원.
 * 불확실함을 색이 아니라 선 모양으로 전한다.
 */
export function ConfirmDot({ state, label }: { state: 'confirmed' | 'estimated'; label?: string }) {
  const text = label ?? (state === 'confirmed' ? '확인' : 'AI 추정');
  return <span className={`ui-dot ui-dot--${state}`} role="img" aria-label={text} title={text} />;
}

/** 카드 머리에 두는 범례: 채운 점 = 확인, 점선 원 = AI 추정. 다른 범례와 같은 16px 기호 칸 */
export function ConfirmLegend() {
  return (
    <LegendList place="head" className="ui-confirm-legend">
      <li><span className="ui-dg-legend__mark" aria-hidden="true"><span className="ui-dot ui-dot--confirmed" /></span>확인</li>
      <li><span className="ui-dg-legend__mark" aria-hidden="true"><span className="ui-dot ui-dot--estimated" /></span>AI 추정</li>
    </LegendList>
  );
}
