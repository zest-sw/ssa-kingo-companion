// 회고를 저장하고 '기록 지도에서 보기'로 돌아갈 때, 새 기록의 점을 표시해 두는 쪽지. 지도(L1)가 열릴 때 한 번 읽는다.
let pending: string | undefined;

export const setMapFocus = (recordId: string) => { pending = recordId; };

export function takeMapFocus(): string | undefined {
  const id = pending;
  pending = undefined;
  return id;
}
