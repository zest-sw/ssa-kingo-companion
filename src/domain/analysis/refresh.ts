import type { RecordItem } from '../types';

/** 기록이 추가·수정·삭제되면 달라지는 값. 분석을 다시 돌릴지 정하는 기준이다. */
export const recordsSig = (records: RecordItem[]) => records.map(r => `${r.id}@${r.v}`).sort().join(',');
