import { josa } from '../text';
import type { Program, RecordItem } from '../types';
import { FIELD_LABEL } from '../vocab';
import type { PrepItem } from './flow';

// 신청서 초안. 실제 AI 대신 기록 카드에 있는 말만 이어 붙인다(수치·경험을 지어내지 않는다).

export type Draft = { motivation: string; related: RecordItem[] };

/** 같은 분야나 같은 활동 유형의 기록 최대 2개 */
export function relatedRecords(p: Program, records: RecordItem[]): RecordItem[] {
  const score = (r: RecordItem) => (r.field === p.field ? 2 : 0) + (p.did.includes(r.did) ? 1 : 0) + (r.energy === 'up' ? 0.5 : 0);
  return records.filter(r => score(r) >= 1).sort((a, b) => score(b) - score(a)).slice(0, 2);
}

/** revision 이 1 이상이면 '고쳐 줘' 뒤의 짧은 문장 */
export function writeDraft(p: Program, records: RecordItem[], goal: string, revision = 0): Draft {
  const related = relatedRecords(p, records);
  const first = related[0];
  const field = FIELD_LABEL[p.field];
  const lead = first ? `${first.title}에서 ‘${first.quote}’라는 것을 느꼈습니다.` : `${field} 분야를 직접 경험해 보고 싶습니다.`;
  const aim = goal ? ` ${goal}${josa(goal, '을', '를')} 목표로 하고 있어` : '';
  const close = revision > 0
    ? `‘${p.title}’에서 한 가지를 끝까지 해 보고 싶어 지원합니다.`
    : `‘${p.title}’${josa(p.title, '을', '를')} 통해 ${field} 경험을 이어 가고 싶어 지원합니다.`;
  return { motivation: `${lead}${aim ? `${aim},` : ''} ${close}`, related };
}

export type LogEntry = { time: string; text: string; ok: boolean };

const AGENT_DONE: Record<string, string> = { target: '신청 대상을 확인했어요', calendar: '일정을 캘린더에 등록했어요' };
const AGENT_FAIL: Record<string, string> = { survey: '사전 설문을 채우지 못했어요. 로그인이 필요해요', team: '팀원을 찾지 못했어요. 모집 글은 내가 올려요' };

/**
 * 실행 기록: 단계가 실행된(체크한) 시각 순서로 한 일과 못 한 일을 낸다.
 * 에이전트 항목의 시각은 준비를 시작한 시각이고, 초안은 다 쓴 시각(draftAt)이다. 못 한 일은 시작한 시각에 남는다.
 */
export function runLog(items: PrepItem[], draftAt?: string): LogEntry[] {
  const started = items.find(i => i.by === 'agent')?.at ?? '';
  const log: LogEntry[] = [];
  for (const i of items) {
    if (i.done && i.at) log.push({ time: i.at, text: i.by === 'agent' ? (AGENT_DONE[i.id] ?? `${i.label}을 마쳤어요`) : `${i.label}을 내가 끝냈어요`, ok: true });
    else if (!i.done && AGENT_FAIL[i.id]) log.push({ time: started, text: AGENT_FAIL[i.id], ok: false });
  }
  if (draftAt) log.push({ time: draftAt, text: '신청서 초안을 썼어요', ok: true });
  return log.sort((a, b) => a.time.localeCompare(b.time));
}
