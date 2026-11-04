import { semesterKey, semesterOf } from '../analysis/semester';
import type { RecordItem } from '../types';

// 학기 돌아보기(Steam Replay 대신): 다른 학생이 아니라 지난 학기의 나와만 비교한다. 점수·등급은 만들지 않는다.

export type ReplayMetric = { id: 'records' | 'newFields' | 'roles'; label: string; before: number; now: number };
export type Replay = { now: string; before: string; metrics: ReplayMetric[] };

type Rec = Pick<RecordItem, 'semester' | 'field' | 'did' | 'source'>;

const REGULAR = /-(1|2)$/;

/** 바로 앞 정규 학기. '2026-2' → '2026-1', '2026-1' → '2025-2'. */
export function previousTerm(term: string): string {
  let k = semesterKey(term) - 1;
  while (!REGULAR.test(semesterOf(k))) k -= 1;
  return semesterOf(k);
}

/**
 * 이번 학기와 지난 학기의 기록 수, 처음 해 본 분야 수, 해 본 역할(한 일) 종류.
 * 예시 기록(seed)은 학생이 남긴 게 아니라 뺀다. 두 학기 모두 기록이 없으면 undefined(빈 상태).
 */
// ponytail: 방학(여름·겨울) 기록은 두 학기 어디에도 넣지 않는다. 방학을 따로 보여 달라는 요청이 생기면 칸을 늘린다.
export function semesterReplay(records: Rec[], now: string): Replay | undefined {
  const before = previousTerm(now);
  const mine = records.filter(r => r.source !== 'seed');
  const inTerm = (t: string) => mine.filter(r => r.semester === t);
  const a = inTerm(before);
  const b = inTerm(now);
  if (a.length === 0 && b.length === 0) return undefined;
  const firstSeen = (t: string) => {
    const k = semesterKey(t);
    const earlier = new Set(mine.filter(r => semesterKey(r.semester) < k).map(r => r.field));
    return new Set(inTerm(t).map(r => r.field).filter(f => !earlier.has(f))).size;
  };
  const roles = (list: Rec[]) => new Set(list.map(r => r.did)).size;
  return {
    now,
    before,
    metrics: [
      { id: 'records', label: '기록', before: a.length, now: b.length },
      { id: 'newFields', label: '처음 해 본 분야', before: firstSeen(before), now: firstSeen(now) },
      { id: 'roles', label: '해 본 역할', before: roles(a), now: roles(b) }
    ]
  };
}
