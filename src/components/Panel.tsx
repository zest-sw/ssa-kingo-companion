import { useId, type HTMLAttributes, type ReactNode } from 'react';

type Props = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  as?: 'section' | 'article' | 'div';
  /** 머리 제목. 주면 aria-labelledby 로 연결한다 */
  title?: ReactNode;
  /** 제목 위 작은 회색 줄 */
  eyebrow?: ReactNode;
  /** 머리 오른쪽(링크 하나, 닫기 등) */
  action?: ReactNode;
  /** 아래 고정 행동 막대. 주 행동 1개 + 보조 2개까지 */
  footer?: ReactNode;
  /** 행동 막대 오른쪽 작은 안내(예: 신청은 내가 누를 때만 나가요) */
  note?: ReactNode;
  /** 내용 칸에 붙일 클래스(화면 쪽 배치용) */
  bodyClassName?: string;
  children: ReactNode;
};

/**
 * 머리 / 내용(칸 안 스크롤) / 행동 막대 세 칸 패널. 행동 막대가 내용을 덮지 않는다.
 * 부모가 높이를 정해 줘야(그리드 칸, .os__body--fill, flex: 1) 내용 칸이 스크롤한다.
 *
 *   <Panel title="자세히" footer={<><Button variant="primary">신청 준비</Button><Button>나중에</Button></>}>…</Panel>
 */
export function Panel({ as: Tag = 'section', title, eyebrow, action, footer, note, bodyClassName, className, children, ...rest }: Props) {
  const id = useId();
  const head = title || eyebrow || action;
  return (
    <Tag className={['ui-panel', className].filter(Boolean).join(' ')} aria-labelledby={title && !rest['aria-label'] ? id : undefined} {...rest}>
      {head && (
        <div className="ui-panel__head">
          <div>
            {eyebrow && <p className="ui-panel__eyebrow">{eyebrow}</p>}
            {title && <h2 id={id} className="ui-panel__title">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      <div className={['ui-panel__body', 'os-scroll', bodyClassName].filter(Boolean).join(' ')}>{children}</div>
      {(footer || note) && (
        <div className="ui-panel__foot" data-action-bar>
          {footer}
          {note && <span className="ui-panel__note">{note}</span>}
        </div>
      )}
    </Tag>
  );
}
