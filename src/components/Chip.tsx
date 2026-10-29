import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * 고르는 칩. selected 를 주면 토글 버튼(aria-pressed)이 된다.
 * 누를 수 없는 표시용 꼬리표는 Badge 를 쓴다.
 */
export function Chip({ selected, icon, className, type = 'button', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: IconName; children: ReactNode }) {
  return (
    <button type={type} className={['ui-chip', className].filter(Boolean).join(' ')} aria-pressed={selected} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
