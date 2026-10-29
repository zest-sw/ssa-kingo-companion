import type { PrepItem } from '../../domain/recommend-flow/flow';

// ponytail: 체크리스트 항목별 완료는 전역 상태에 없어 화면 메모리에만 둔다(새로고침하면 처음부터). 공용 상태에 필드가 생기면 옮긴다.
const items = new Map<string, PrepItem[]>();

export const getPrep = (programId: string) => items.get(programId);
export const setPrep = (programId: string, next: PrepItem[]) => { items.set(programId, next); };
