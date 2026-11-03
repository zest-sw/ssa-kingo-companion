import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  /** 하위 화면 이름(사이드바 항목과 같은 말) */
  title: string;
  /** 키워드 한 줄(15자 안팎). 문장이 아니라 그림이 말하는 핵심을 짧게. 데이터가 없으면 다음에 할 일 한 줄 */
  headline: ReactNode;
  /** 키워드를 받치는 값 한 줄(예: '기록 6개') */
  value?: ReactNode;
  /** 오른쪽 위 작은 표시(예: 확인할 발견 개수 배지) */
  badge?: ReactNode;
  /** 주인공: 그 학생의 데이터를 그린 그림(직접 라벨 포함). 카드 전체가 링크라서 그림 안에는 누르는 요소를 두지 않는다 */
  visual?: ReactNode;
  /** 누르면 갈 하위 화면. 없으면 누르지 않는 카드(잠긴 영역 등) */
  href?: string;
};

/**
 * 요약 화면의 카드(docs/design/ia-navigation.md 2절 4, 6절). 위쪽 대부분이 그림 칸이고, 아래에 키워드 한 줄과 값 한 줄이다.
 * 누르면 그 하위 화면을 펼친다. 같은 화면에 그 하위 화면으로 가는 다른 버튼은 두지 않는다.
 */
export function SummaryCard({ title, headline, value, badge, visual, href }: Props) {
  const body = (
    <>
      <span className="ui-sum__head">
        <span className="ui-sum__title">{title}</span>
        {badge}
        {href && <span className="ui-sum__arrow" aria-hidden="true"><Icon name="chevron" size={16} /></span>}
      </span>
      {visual && <span className="ui-sum__visual">{visual}</span>}
      <span className="ui-sum__text">
        <span className="ui-sum__headline">{headline}</span>
        {value && <span className="ui-sum__value">{value}</span>}
      </span>
    </>
  );
  return href ? <a className="ui-sum ui-sum--link" href={href}>{body}</a> : <div className="ui-sum">{body}</div>;
}
