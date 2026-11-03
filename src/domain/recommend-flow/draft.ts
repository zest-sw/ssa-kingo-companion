import { confirmedAxesFor, textOf } from '../analysis/strengths';
import { josa } from '../text';
import type { Program, RecordItem } from '../types';
import { fieldName } from '../vocab';
import type { PrepItem } from './flow';

// 신청서 초안. 실제 AI 대신 기록 카드에 있는 말만 이어 붙인다(수치·경험을 지어내지 않는다).

export type Draft = { motivation: string; related: RecordItem[] };

/** 같은 분야·같은 활동 유형이거나, 이 기회가 쓰는 역량을 학생이 확인한 기록 최대 2개 */
export function relatedRecords(p: Program, records: RecordItem[], limit = 2): RecordItem[] {
  const score = (r: RecordItem) => (r.field === p.field ? 2 : 0) + (p.did.includes(r.did) ? 1 : 0) + (confirmedAxesFor(r, p).length ? 1.5 : 0) + (r.energy === 'up' ? 0.5 : 0);
  return records.filter(r => score(r) >= 1).sort((a, b) => score(b) - score(a)).slice(0, limit);
}

/** '고쳐 줘'에서 고르는 방향 */
export type ReviseKind = 'shorter' | 'specific' | 'other';
export const REVISE_OPTIONS: { id: ReviseKind; label: string }[] = [
  { id: 'shorter', label: '더 짧게' }, { id: 'specific', label: '더 구체적으로' }, { id: 'other', label: '다른 경험 쓰기' }
];
/** 고친 횟수만큼 쌓인다. note 는 학생이 한 줄로 적은 요청이고, 초안 끝에 그대로 넣는다 */
export type Revision = { kind: ReviseKind; note?: string };

/**
 * 초안을 쓴다. 고친 요청(revisions)을 차례로 반영한다(예시 규칙):
 * 더 짧게 = 한 문장만, 더 구체적으로 = 확인한 근거 문장을 덧붙임, 다른 경험 쓰기 = 다음 관련 기록으로 바꿈.
 * 기록에 없는 말은 지어내지 않는다. 근거 문장은 학생이 '맞아요'로 확인한 역량 근거에서만 고른다(확인 전 AI 추정은 안 쓴다).
 */
export function writeDraft(p: Program, records: RecordItem[], goal: string, revisions: Revision[] = []): Draft {
  const pool = relatedRecords(p, records, 3);
  const shift = revisions.filter(r => r.kind === 'other').length;
  const first = pool.length ? pool[shift % pool.length] : undefined;
  const related = first ? [first, ...pool.filter(r => r !== first)].slice(0, 2) : [];
  const last = revisions.filter(r => r.kind !== 'other').at(-1)?.kind;
  const field = fieldName(p.field);
  const lead = first ? `${first.title}에서 ‘${first.quote.replace(/[.。]s*$/, '')}’라는 것을 느꼈습니다.` : `${field} 분야를 직접 경험해 보고 싶습니다.`;
  const ev = [...(first ? [first] : []), ...pool, ...records].find(r => confirmedAxesFor(r, p).length > 0);
  const evText = ev ? textOf(ev).replace(/다.?$/, '습니다.') : '';
  const detail = !ev ? '' : ev === first ? ` 그때 ${evText}` : ` ${ev.title}에서는 ${evText}`;
  const aim = goal ? ` ${goal}${josa(goal, '을', '를')} 목표로 하고 있어` : '';
  // 기록이 없는 학생(새 학생)에게 '경험을 이어 간다'고 쓰지 않는다. 기록에 없는 말은 지어내지 않는다.
  const close = `‘${p.title}’${josa(p.title, '을', '를')} 통해 ${field} ${first ? '경험을 이어 가고' : '첫 경험을 쌓고'} 싶어 지원합니다.`;
  const notes = revisions.map(r => r.note?.trim()).filter((n): n is string => !!n).map(n => (/[.!?]$/.test(n) ? n : `${n}.`));
  const tail = notes.length ? ` ${notes.join(' ')}` : '';
  const body = last === 'shorter'
    ? (first ? `${first.title} 경험을 살려 ${close}` : close)
    : `${lead}${last === 'specific' ? detail : ''}${aim ? `${aim},` : ''} ${close}`;
  return { motivation: `${body}${tail}`, related };
}

export type LogEntry = { time: string; text: string; ok: boolean };

const AGENT_DONE: Record<string, string> = { target: '신청 대상을 확인했어요', calendar: '일정을 캘린더에 등록했어요' };
const AGENT_FAIL: Record<string, string> = { survey: '사전 설문을 채우지 못했어요. 로그인이 필요해요', team: '팀원을 찾지 못했어요. 모집 글은 내가 올려요' };

/**
 * 실행 기록: 단계가 실행된(체크한) 시각 순서로 한 일과 못 한 일을 낸다.
 * 에이전트 항목의 시각은 준비를 시작한 시각이고, 초안은 다 쓴 시각(draftAt)이다. 못 한 일은 시작한 시각에 남는다.
 */
export function runLog(items: PrepItem[], draftAt?: string, revisedAt: string[] = []): LogEntry[] {
  const started = items.find(i => i.by === 'agent')?.at ?? '';
  const log: LogEntry[] = [];
  for (const i of items) {
    if (i.done && i.at) log.push({ time: i.at, text: i.by === 'agent' ? (AGENT_DONE[i.id] ?? `‘${i.label}’${josa(i.label, '을', '를')} 마쳤어요`) : `‘${i.label}’${josa(i.label, '을', '를')} 끝냈어요`, ok: true });
    else if (!i.done && AGENT_FAIL[i.id]) log.push({ time: started, text: AGENT_FAIL[i.id], ok: false });
  }
  if (draftAt) log.push({ time: draftAt, text: '신청서 초안을 썼어요', ok: true });
  for (const t of revisedAt) log.push({ time: t, text: '초안을 고쳤어요', ok: true });
  return log.sort((a, b) => a.time.localeCompare(b.time));
}
