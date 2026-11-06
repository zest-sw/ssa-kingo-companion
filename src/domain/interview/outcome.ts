import { liveAxes } from '../analysis/strengths';
import type { RecordItem } from '../types';
import { AXES } from '../vocab';
import { buildRecord, savedSummary, type NewRecordInput } from './record';

/**
 * 인터뷰 답 → 기록. 맡은 일·한 일을 둘 다 건너뛰면 무엇을 했는지 어림할 글이 없으니 역량 근거를 만들지 않는다
 * (빈 카드에 '만들기' 근거를 지어 붙이지 않으려고).
 */
export function interviewRecord(i: NewRecordInput): RecordItem {
  const r = buildRecord(i);
  return i.card.role?.trim() || i.card.action?.trim() ? r : { ...r, axes: [] };
}

/** 결과 장면의 한 줄. estimate 면 확인 전 AI 추정이라 점선으로 그린다. */
export type ChangeLine = { text: string; estimate: boolean };

const label = (axis: string) => AXES.find(a => a.id === axis)?.label ?? axis;

/**
 * 이번 회고로 바뀐 것 두 줄: 역량 근거 한 줄 + 발견·추천 한 줄.
 * 근거 수는 점수가 아니라 기록 수다('+1'). 처음 생긴 근거는 '처음 생겼어요'로 말한다.
 */
export function savedChanges(before: RecordItem[], record: RecordItem): ChangeLine[] {
  const rest = before.filter(r => r.id !== record.id);
  const axes = liveAxes(record);
  const names = axes.map(label).join('·');
  const first = axes.length > 0 && axes.every(a => !rest.some(r => liveAxes(r).includes(a)));
  const evidence: ChangeLine = axes.length === 0
    ? { text: '한 일을 채우면 역량 근거가 생겨요.', estimate: false }
    : { text: first ? `${names} 근거가 처음 생겼어요.` : `${names} 근거 +1`, estimate: true };

  const { newDiscoveries, usedForRecommend } = savedSummary(rest, record);
  const second: ChangeLine = !usedForRecommend
    ? { text: '추천과 발견에는 쓰지 않는 기록이에요.', estimate: false }
    : newDiscoveries.length > 0
      ? { text: `새 발견 후보가 ${newDiscoveries.length}개 생겼어요.`, estimate: true }
      : { text: '다음 추천에 이 기록을 반영해요.', estimate: false };
  return [evidence, second];
}

/** '분석에서 보기'가 갈 곳: 확인할 새 발견이 있으면 분석 요약(발견 카드), 아니면 근거가 늘어난 나의 강점 */
export function analysisTarget(before: RecordItem[], record: RecordItem): 'analysis' | 'analysis/strengths' {
  const rest = before.filter(r => r.id !== record.id);
  return savedSummary(rest, record).newDiscoveries.length > 0 ? 'analysis' : 'analysis/strengths';
}
