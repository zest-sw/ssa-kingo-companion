import type { RecordCard, RecordItem } from '../types';
import { semesterLabel } from './archive';
import { cardOf } from './record';

// 기록 카드 → 면접 답변(STAR). 학생이 쓴 글만 잇는다. 없는 말을 지어 넣지 않으려고 이음말은 '그 결과' 하나만 쓴다.

/** STAR(상황·과제·행동·결과) 다음에 Gibbs 의 결론(배운 점)·실행 계획(다음에 해 볼 것) 순서 */
const ORDER: (keyof RecordCard)[] = ['situation', 'role', 'action', 'result', 'learned', 'next'];

const sentence = (t: string) => (/[.!?。]$/.test(t) ? t : `${t}.`);

/** 칸마다 한 문장. 빈 칸은 건너뛴다. 결과 칸만 '그 결과'로 앞 문장과 잇는다(이미 '결과'로 시작하면 그대로). */
export function starAnswer(card: RecordCard): string {
  return ORDER.flatMap(k => {
    const t = card[k]?.trim();
    if (!t) return [];
    return [sentence(k === 'result' && !t.startsWith('결과') && !t.startsWith('그 결과') ? `그 결과 ${t}` : t)];
  }).join(' ');
}

/** 면접 답변을 만들 만큼 채워졌는지: STAR 네 칸 중 둘 이상 */
export const answerReady = (card: RecordCard): boolean => (['situation', 'role', 'action', 'result'] as const).filter(k => card[k]?.trim()).length >= 2;

/** 경험 카드 묶음에 고를 수 있는 기록 수 */
export const BUNDLE_MIN = 2;
export const BUNDLE_MAX = 5;

/** 고르기·풀기. 이미 다섯 개면 더 담지 않는다. */
export function togglePick(ids: string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter(x => x !== id);
  return ids.length >= BUNDLE_MAX ? ids : [...ids, id];
}

/** 묶음 복사용 글. 기록마다 제목 줄(학기 · 확인 방식)과 답변 문단, 사이에 빈 줄 */
export function bundleText(records: RecordItem[]): string {
  return records.map(r => {
    const how = r.verification === 'school' ? '학교 확인' : '직접 입력';
    return `${r.title} (${semesterLabel(r.semester)} · ${how})\n${starAnswer(cardOf(r))}`;
  }).join('\n\n');
}
