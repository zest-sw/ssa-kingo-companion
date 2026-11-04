// 학기가 많이 쌓인 학생의 지도·흐름 그림은 한 화면에 몇 학기만 그린다. 앞 학기는 접어 두고 '이전'으로 넘겨 본다.

/** 한 화면에 그리는 학기 수. 1280px 노트북에서도 학기 칸 안의 이름이 두 줄 안에 들어오는 폭이다 */
export const TERMS_PER_VIEW = 4;

export type TermWindow<T> = {
  shown: T[];
  /** 앞(오래된 쪽)에 접힌 개수 */
  before: number;
  /** 뒤(최근 쪽)에 접힌 개수 */
  after: number;
  /** 보여 주는 마지막 칸의 위치(넘길 때 쓴다) */
  end: number;
};

/**
 * 끝(end, 포함)에서 size 칸만큼. end 를 주지 않으면 가장 최근 칸에서 끝난다.
 * 칸 수가 size 이하면 모두 보여 준다. end 가 범위를 벗어나면 안으로 당긴다.
 */
export function termWindow<T>(items: T[], size = TERMS_PER_VIEW, end?: number): TermWindow<T> {
  const last = items.length - 1;
  if (items.length <= size) return { shown: items, before: 0, after: 0, end: last };
  const e = Math.min(last, Math.max(size - 1, end ?? last));
  const start = e - size + 1;
  return { shown: items.slice(start, e + 1), before: start, after: last - e, end: e };
}

/** 앞(-1) 또는 뒤(+1)로 한 화면만큼 넘긴 끝 위치. 마지막 칸 하나는 겹쳐 두어 이어 보기 쉽게 한다 */
export function stepWindow(w: TermWindow<unknown>, dir: -1 | 1, size = TERMS_PER_VIEW): number {
  return w.end + dir * Math.max(1, size - 1);
}
