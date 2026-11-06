import { useId, type HTMLAttributes, type ReactNode } from 'react';

type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  as?: 'section' | 'article' | 'div';
  /** 카드 머리 제목. 주면 aria-labelledby 로 연결한다 */
  title?: ReactNode;
  /** 결론형 제목: 카드가 말하는 한 문장(18/700). 기본은 이름형 제목(16/600) */
  lead?: boolean;
  /** 제목 오른쪽 (범례, '더 보기' 링크 등) */
  action?: ReactNode;
  tone?: 'surface' | 'alt';
  padding?: 'md' | 'lg';
  children: ReactNode;
};

/** 흰 바탕, 1px 선, 반지름 6, 그림자 없음. */
export function Card({ as: Tag = 'section', title, lead, action, tone = 'surface', padding = 'lg', className, children, ...rest }: Props) {
  const id = useId();
  const cls = ['ui-card', tone === 'alt' && 'ui-card--alt', padding === 'md' && 'ui-card--md', className].filter(Boolean).join(' ');
  return (
    <Tag className={cls} aria-labelledby={title && !rest['aria-label'] ? id : undefined} {...rest}>
      {(title || action) && (
        <div className="ui-card__head">
          {title && <h2 id={id} className={lead ? 'ui-card__title ui-card__title--lead' : 'ui-card__title'}>{title}</h2>}
          {action && <div className="ui-card__action">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
