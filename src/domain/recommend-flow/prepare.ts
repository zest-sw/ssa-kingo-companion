import type { Activity, Program } from '../types';
import { agentChecks } from './checks';
import { REVISE_OPTIONS, runLog, type LogEntry, type Revision } from './draft';
import type { PrepItem } from './flow';

// 신청 준비 화면의 흐름: 지금 어느 단계인지, 주 버튼이 무엇인지, 에이전트가 한 일을 한 줄로, 고친 초안에서 바뀐 문장.

export type PrepStep = 'todo' | 'draft' | 'apply';
export const PREP_STEPS: { id: PrepStep; label: string }[] = [
  { id: 'todo', label: '준비할 것' }, { id: 'draft', label: '초안' }, { id: 'apply', label: '신청' }
];

/** 중간에 나갔다 와도 이어지게 남기는 것. sent = 학교 사이트 신청 화면을 열었다 */
export type PrepMemory = { step: PrepStep; revisions: Revision[]; sent: boolean };

const STEP_IDS: readonly string[] = PREP_STEPS.map(s => s.id);
const KINDS: readonly string[] = REVISE_OPTIONS.map(o => o.id);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/** 저장해 둔 값을 믿지 않고 모양을 확인한다. 틀리면 undefined(처음부터) */
export function parsePrepMemory(raw: unknown): PrepMemory | undefined {
  if (!isObj(raw) || typeof raw.step !== 'string' || !STEP_IDS.includes(raw.step)) return undefined;
  const revisions = Array.isArray(raw.revisions)
    ? raw.revisions.filter((r): r is Revision => isObj(r) && typeof r.kind === 'string' && KINDS.includes(r.kind) && (r.note === undefined || typeof r.note === 'string'))
    : [];
  return { step: raw.step as PrepStep, revisions, sent: raw.sent === true };
}

/**
 * 다시 들어왔을 때 열 단계. 활동이 아니면(아직 시작 전) 늘 준비할 것.
 * 남겨 둔 단계가 있으면 그 단계, 없으면 초안을 이미 확인한 활동은 신청 단계부터.
 */
export function resumeStep(memory: PrepMemory | undefined, items: PrepItem[], started: boolean): PrepStep {
  if (!started) return 'todo';
  if (memory) return memory.step;
  return items.some(i => i.id === 'draft' && i.done) ? 'apply' : 'todo';
}

/** 오른쪽 아래 주 버튼. 자리는 늘 같고 이름만 바뀐다 */
export type PrimaryAction = 'start' | 'toDraft' | 'toApply' | 'openSite' | 'confirmSent';
export function primaryAction(step: PrepStep, started: boolean, sent: boolean): PrimaryAction {
  if (!started) return 'start';
  if (step === 'todo') return 'toDraft';
  if (step === 'draft') return 'toApply';
  return sent ? 'confirmSent' : 'openSite';
}
export const PRIMARY_LABEL: Record<PrimaryAction, string> = {
  start: '신청 준비 시작', toDraft: '초안 보기', toApply: '신청하러 가기', openSite: '학교 사이트에서 신청하기', confirmSent: '신청했어요'
};

/**
 * 에이전트가 한 일을 한 줄로: '신청 대상, 일정 겹침, 준비할 것 2개를 확인했어요'.
 * 학생이 봐야 할 결과(대상 아님, 일정 겹침)가 있으면 warn 으로 따로 준다. 요약에 묻히지 않게.
 */
export function agentSummary(p: Program, activities: Activity[], week: number, items: PrepItem[]): { text: string; warn?: string } {
  const checks = agentChecks(p, activities, week);
  const mine = items.filter(i => i.by === 'me').length;
  const names = checks.map(c => (c.id === 'target' ? '신청 대상' : c.id === 'schedule' ? '일정 겹침' : '팀 구성'));
  const text = `${[...names, `준비할 것 ${mine}개`].join(', ')}를 확인했어요`;
  const warn = checks.filter(c => c.state === 'warn').map(c => c.label).join(', ');
  return warn ? { text, warn } : { text };
}

/** 펼치면 보이는 기록: 확인한 결과를 먼저, 그 뒤에 한 일·못 한 일을 시각 순서로 */
export function agentLog(p: Program, activities: Activity[], week: number, items: PrepItem[], draftAt?: string, revisedAt: string[] = []): LogEntry[] {
  const started = items.find(i => i.by === 'agent')?.at ?? '';
  const checks: LogEntry[] = agentChecks(p, activities, week).map(c => ({ time: started, text: c.label, ok: c.state !== 'warn' }));
  // 실행 기록의 '신청 대상을 확인했어요'는 위 확인 결과와 같은 말이라 뺀다.
  return [...checks, ...runLog(items, draftAt, revisedAt).filter(l => l.text !== '신청 대상을 확인했어요')];
}

/** 문장 단위로 자른다. 마침표·물음표·느낌표 뒤 공백에서 끊는다 */
export const sentences = (text: string): string[] => text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

/** 고친 초안을 문장으로 나누고, 고치기 전에 없던 문장에 changed 를 붙인다. 고치기 전이 없으면 바뀐 것 없음 */
export function markChanged(prev: string | undefined, next: string): { text: string; changed: boolean }[] {
  const before = new Set(prev === undefined ? [] : sentences(prev));
  return sentences(next).map(text => ({ text, changed: prev !== undefined && !before.has(text) }));
}
