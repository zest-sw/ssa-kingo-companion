import { laterUntilDay } from '../../domain/recommend-flow/flow';

// ponytail: 전역 상태에 '다시 볼 날'이 없어 화면 메모리에만 둔다(새로고침하면 사라짐). 지휘자가 통합 작업에서 전역 상태로 옮긴다.
// 값은 1주차 첫날부터 센 날 번호다. 판정은 domain 의 effectiveChoices 가 한다.
const until = new Map<string, number>();

export const laterUntil: ReadonlyMap<string, number> = until;
export const setLater = (programId: string, week: number, days: number) => { until.set(programId, laterUntilDay(week, days)); };
export const getLater = (programId: string) => until.get(programId);
export const clearLater = (programId: string) => { until.delete(programId); };
