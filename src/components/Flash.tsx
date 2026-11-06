import { useState, type ReactNode } from 'react';

/** 값이 바뀐 횟수. 처음 그릴 때는 0 이라 움직이지 않는다 */
export function useChangeCount<T>(value: T): number {
  const [seen, setSeen] = useState({ value, n: 0 });
  if (!Object.is(seen.value, value)) {
    const next = { value, n: seen.n + 1 };
    setSeen(next);
    return next.n;
  }
  return seen.n;
}

type Props = {
  /** 이 값이 바뀌면 한 번 짧게 강조한다 */
  value: string | number;
  as?: 'span' | 'b';
  className?: string;
  /** 없으면 value 를 그대로 쓴다 */
  children?: ReactNode;
};

/**
 * 바뀐 숫자 한 번 강조(가진 것, 확인 근거). 학생이 한 일로 숫자가 바뀌었음을 알려 주는 피드백이라 처음 그릴 때는 가만히 있다.
 * 다시 그릴 때마다 key 가 바뀌어 CSS 움직임이 처음부터 다시 돈다.
 */
export function Flash({ value, as: Tag = 'span', className, children }: Props) {
  const n = useChangeCount(value);
  return (
    <Tag key={n} className={['ui-flash', className].filter(Boolean).join(' ')} data-changed={n > 0 ? '' : undefined}>
      {children ?? value}
    </Tag>
  );
}
