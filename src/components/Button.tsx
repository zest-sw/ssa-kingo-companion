import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  icon?: IconName;
  /** 가로를 채운다 */
  block?: boolean;
  children: ReactNode;
};

/** 신청처럼 되돌릴 수 없는 행동은 학생이 직접 누르는 primary 버튼으로만 둔다. */
export function Button({ variant = 'secondary', size = 'md', icon, block, className, type = 'button', children, ...rest }: Props) {
  const cls = ['ui-btn', `ui-btn--${variant}`, size === 'sm' && 'ui-btn--sm', block && 'ui-btn--block', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/** 아이콘만 있는 버튼. label 은 스크린 리더용으로 꼭 단다. */
export function IconButton({ icon, label, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button type={type} className={['ui-icon-btn', className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  );
}
