/**
 * 같은 입력이면 다시 계산하지 않는다. 최근 입력 몇 개(size)의 결과를 기억하고, 입력은 같은 값·같은 참조(Object.is)로 비교한다.
 * 화면을 떠났다 돌아와도(useMemo 는 화면과 함께 사라진다) 지식 그래프 분석·그래프 배치를 다시 하지 않으려고 쓴다.
 * 순수 함수에만 쓴다. 돌려준 값을 고치면 다음 호출도 고친 값을 받는다.
 */
export function memoRecent<A extends unknown[], R>(fn: (...args: A) => R, size = 4): (...args: A) => R {
  const slots: { args: A; out: R }[] = [];
  return (...args: A): R => {
    const i = slots.findIndex(s => s.args.length === args.length && s.args.every((a, k) => Object.is(a, args[k])));
    if (i >= 0) {
      const [hit] = slots.splice(i, 1);
      slots.unshift(hit);
      return hit.out;
    }
    const out = fn(...args);
    slots.unshift({ args, out });
    if (slots.length > size) slots.pop();
    return out;
  };
}
