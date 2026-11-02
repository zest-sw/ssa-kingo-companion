import type { BoardColumn } from '../../domain/types';

// L1 요약 막대에서 칸을 누르고 보드(L2)로 넘어갈 때, 어느 칸을 보여 줄지 한 번만 넘겨 주는 쪽지.
let pending: BoardColumn | undefined;

export const setBoardFocus = (col: BoardColumn) => { pending = col; };

/** 읽으면 비운다. 보드가 열릴 때 한 번 읽는다. */
export function takeBoardFocus(): BoardColumn | undefined {
  const col = pending;
  pending = undefined;
  return col;
}
