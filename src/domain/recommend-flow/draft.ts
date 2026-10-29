import { josa } from '../text';
import type { Program, RecordItem } from '../types';
import { FIELD_LABEL } from '../vocab';

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

/** 에이전트 실행 기록: 한 일과 못 한 일 */
export function runLog(needsLogin: boolean, team: boolean, draftReady = true): LogEntry[] {
  const log: LogEntry[] = [
    { time: '21:38', text: '신청 대상을 확인했어요', ok: true },
    { time: '21:39', text: '일정을 캘린더에 등록했어요', ok: true }
  ];
  if (draftReady) log.push({ time: '21:40', text: '신청서 초안을 썼어요', ok: true });
  if (needsLogin) log.push({ time: '21:40', text: '사전 설문을 채우지 못했어요. 로그인이 필요해요', ok: false });
  if (team) log.push({ time: '21:41', text: '팀원을 찾지 못했어요. 모집 글은 내가 올려요', ok: false });
  return log;
}
