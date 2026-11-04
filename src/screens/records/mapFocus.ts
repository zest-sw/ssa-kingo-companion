// 회고를 저장하고 '기록 지도에서 보기'로 돌아갈 때, 새 기록의 점을 표시해 두는 쪽지. 지도(L1)가 열릴 때 한 번 읽는다.
let pending: string | undefined;

export const setMapFocus = (recordId: string) => { pending = recordId; };

export function takeMapFocus(): string | undefined {
  const id = pending;
  pending = undefined;
  return id;
}

// 경험 카드 묶음의 빈 상태에서 '보관함에서 고르기'로 갈 때, 기록 화면이 지도 대신 보관함으로 열리게 하는 쪽지. 한 번 읽는다.
let toArchive = false;

export const setArchiveFocus = () => { toArchive = true; };

export function takeArchiveFocus(): boolean {
  const on = toArchive;
  toArchive = false;
  return on;
}
