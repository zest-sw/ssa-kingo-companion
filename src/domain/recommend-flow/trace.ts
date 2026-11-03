import { fieldName, REASON_LABEL } from '../vocab';
import type { Program, Reason, RecordItem } from '../types';
import { sortedReasons } from '../recommend';

// 추천 이유를 '근거 → 이 활동' 도식의 점으로. 문장 대신 짧은 키워드만 뽑는다.

export type TraceNode = {
  kind: Reason['kind'];
  /** 이유의 종류(내 기록, 관심, 탐색…) */
  label: string;
  /** 근거 키워드. 기록이면 기록 이름, 아니면 문장 속 ‘…’ 낱말 */
  detail: string;
  /** 학생 기록에 이어진 근거. 없으면 관심·탐색처럼 기록 밖의 이유 */
  recordId?: string;
  date?: string;
};

/** 문장 속 첫 ‘…’ 낱말. 없으면 빈 문자열 */
const quoted = (text: string) => /‘([^’]+)’/.exec(text)?.[1] ?? '';

/** 이유 최대 4개를 도식의 점으로. 기록에 이어진 이유는 그 기록의 이름과 날짜를 쓴다. */
export function traceNodes(reasons: Reason[], records: RecordItem[], p: Program): TraceNode[] {
  return sortedReasons(reasons).map(r => {
    const rec = r.recordId ? records.find(x => x.id === r.recordId) : undefined;
    const detail = rec?.title ?? (quoted(r.text) || fieldName(p.field));
    return { kind: r.kind, label: REASON_LABEL[r.kind], detail, recordId: rec?.id, date: rec?.date };
  });
}

/** 마감 막대가 가득 차는 남은 날. 이보다 멀면 가득 찬 막대다. */
export const BAR_DAYS = 14;

/** 마감까지 남은 날 → 막대 길이 0~1(너무 짧으면 보이도록 최소 0.04) */
export const deadlineRatio = (dday: number): number => Math.min(1, Math.max(0.04, Math.max(0, dday) / BAR_DAYS));
