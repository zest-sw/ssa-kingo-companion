import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * 고르는 칩. selected 를 주면 토글 버튼(aria-pressed)이 된다.
 * 켜짐은 진한 테두리 + 굵은 글자 + 앞 체크, 꺼짐은 옅은 테두리. 색 면은 채우지 않는다(25장이 늘어서도 켜진 것이 보이게).
 * 누를 수 없는 표시용 꼬리표는 Badge 를 쓴다.
 */
export function Chip({ selected, icon, className, type = 'button', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: IconName; children: ReactNode }) {
  // 켜지면 제 아이콘 자리에 체크가 온다(아이콘 있는 칩은 폭이 그대로)
  const mark = selected ? 'check' : icon;
  return (
    <button type={type} className={['ui-chip', className].filter(Boolean).join(' ')} aria-pressed={selected} {...rest}>
      {mark && <Icon name={mark} size={16} />}
      {children}
    </button>
  );
}
