import type { Activity, RecordItem } from '../types';

type Patch = Partial<Omit<Activity, 'id'>>;

/** 기록을 저장하면 활동은 '기록됨'이 된다. 일정 문구는 그대로 둔다(기록을 지울 때 되돌릴 수 있게). */
export const recordedPatch = (recordId: string): Patch => ({ status: 'recorded', recordId, due: undefined, prep: undefined });

/** 기록을 지우면 활동은 다시 회고 대기로 돌아가고 기록 연결이 끊긴다. */
export const unrecordedPatch = (): Patch => ({ status: 'ended', recordId: undefined });

/** 이 기록을 만든 활동. recordId 로 이어져 있거나, 같은 기회(programId)로 기록된 활동 */
export function activityOfRecord(activities: Activity[], r: RecordItem): Activity | undefined {
  return activities.find(a => a.recordId === r.id) ?? (r.programId ? activities.find(a => a.programId === r.programId && a.status === 'recorded') : undefined);
}
