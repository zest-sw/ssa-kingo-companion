// ponytail: 전역 상태에 '다시 볼 날'이 없어 화면 메모리에만 둔다(새로고침하면 사라짐). 공용 상태에 필드가 생기면 옮긴다.
const until = new Map<string, number>();

export const setLaterDays = (programId: string, days: number) => { until.set(programId, days); };
export const getLaterDays = (programId: string) => until.get(programId);
export const clearLater = (programId: string) => { until.delete(programId); };
