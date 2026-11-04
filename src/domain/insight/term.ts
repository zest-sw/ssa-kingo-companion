import type { Activity, RecordItem } from '../types';

/** 이번 학기 쌓인 것: 쓴 기록, 하는 중인 활동, 신청 준비·결과 대기. 개수만 센다(점수 아님) */
export type TermTally = { records: number; ongoing: number; preparing: number };

export function termTally(records: RecordItem[], activities: Activity[], semester: string): TermTally {
  return {
    records: records.filter(r => r.semester === semester).length,
    ongoing: activities.filter(a => a.status === 'ongoing').length,
    preparing: activities.filter(a => a.status === 'preparing' || a.status === 'applied').length
  };
}

/** 한 줄로: '기록 3개 · 하는 중 2개 · 신청 준비 1개'. 0인 것은 뺀다. 다 0이면 빈 문자열 */
export const tallyLine = (t: TermTally) =>
  [t.records && `기록 ${t.records}개`, t.ongoing && `하는 중 ${t.ongoing}개`, t.preparing && `신청 준비 ${t.preparing}개`].filter(Boolean).join(' · ');
