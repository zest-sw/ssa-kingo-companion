import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  /** 하위 화면 이름(사이드바 항목과 같은 말) */
  title: string;
  /** 그 학생의 상태에서 계산한 핵심 문장 한 줄. 데이터가 없으면 다음에 할 일 한 줄 */
  sentence: ReactNode;
  /** 문장을 받치는 값 몇 개(예: '기록 6개 · 이번 학기 3개') */
  value?: ReactNode;
  /** 오른쪽 위 작은 표시(예: 확인할 발견 개수 배지) */
  badge?: ReactNode;
  /** 문장 옆 작은 보조 그림. 카드 전체가 링크라서 그림 안에는 누르는 요소를 두지 않는다 */
  aid?: ReactNode;
  /** 누르면 갈 하위 화면. 없으면 누르지 않는 카드(잠긴 영역 등) */
  href?: string;
};

/**
 * 요약 화면의 카드(docs/design/ia-navigation.md 2절 4, 3절). 이동이 아니라 내용이다: 핵심 문장과 값을 보여 주고, 누르면 그 하위 화면을 펼친다.
 * 같은 화면에 그 하위 화면으로 가는 다른 버튼을 두지 않는다.
 */
export function SummaryCard({ title, sentence, value, badge, aid, href }: Props) {
  const body = (
    <>
      <span className="ui-sum__head">
        <span className="ui-sum__title">{title}</span>
        {badge}
        {href && <span className="ui-sum__arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>}
      </span>
      <span className="ui-sum__body">
        <span className="ui-sum__text">
          <span className="ui-sum__sentence">{sentence}</span>
          {value && <span className="ui-sum__value">{value}</span>}
        </span>
        {aid && <span className="ui-sum__aid" aria-hidden="true">{aid}</span>}
      </span>
    </>
  );
  return href ? <a className="ui-sum ui-sum--link" href={href}>{body}</a> : <div className="ui-sum">{body}</div>;
}
