import { FIELD_GROUP, fieldName, GROUP_LABEL, REASON_LABEL } from '../vocab';
import type { FieldGroup, Interest, Program, Reason, RecordItem } from '../types';
import { sortedReasons } from '../recommend';
import { josa } from '../text';
import { confirmedStrengthsFor } from '../analysis/strengths';

// 추천 이유를 '근거 → 이 활동' 도식의 점으로. 문장 대신 짧은 키워드만 뽑는다.

export type TraceNode = {
  kind: Reason['kind'] | 'strength' | 'goal' | 'interest-miss';
  /** 이유의 종류(내 기록, 관심, 탐색…) */
  label: string;
  /** 근거 키워드. 기록이면 기록 이름, 아니면 문장 속 ‘…’ 낱말 */
  detail: string;
  /** 학생 기록에 이어진 근거. 없으면 관심·탐색처럼 기록 밖의 이유 */
  recordId?: string;
  date?: string;
  /** 근거 서랍에 쓰는 한 문장. 이유(Reason)에서 오지 않은 새 학생 점(목표·관심 없음)에만 있다 */
  text?: string;
};

/** 기록이 없는 학생의 근거에 쓰는 가입 정보. interestOpen = 이번 주 후보 중 고른 관심 분야가 하나라도 있는지 */
export type Newcomer = { goal: string; interests: Interest[]; interestOpen: boolean };

// ponytail: 목표 글의 낱말로 분야 묶음을 어림한다. 목표를 직무 체계로 받게 되면 그 값으로 바꾼다.
const GOAL_WORDS: [FieldGroup, RegExp][] = [
  ['plan', /기획|서비스|UX|PM|창업|마케팅/i],
  ['ai', /데이터|AI|인공지능|분석|머신/i],
  ['dev', /개발|엔지니어|프론트|백엔드|소프트웨어/i],
  ['global', /글로벌|해외|유학|교환/],
  ['mentor', /멘토|튜터|교육/]
];
/** 이번 주 후보와 프로필에서 Newcomer 를 만든다 */
export const newcomerOf = (profile: { goal: string; interests: Interest[] }, programs: Program[]): Newcomer => ({
  goal: profile.goal, interests: profile.interests, interestOpen: programs.some(p => profile.interests.includes(FIELD_GROUP[p.field]))
});

/** 목표 글이 가리키는 분야 묶음. 못 읽으면 빈 목록 */
export const goalGroups = (goal: string): FieldGroup[] => GOAL_WORDS.filter(([, re]) => re.test(goal)).map(([g]) => g);

/** 문장 속 첫 ‘…’ 낱말. 없으면 빈 문자열 */
const quoted = (text: string) => /‘([^’]+)’/.exec(text)?.[1] ?? '';

const MAX_NODES = 4;

/**
 * 이유 최대 4개를 도식의 점으로. 기록에 이어진 이유는 그 기록의 이름과 날짜를 쓴다.
 * 이 기회가 쓰는 역량이 학생이 '맞아요'로 확인한 강점이면 '강점' 점을 첫 이유 바로 뒤에 넣는다(확인 전 AI 추정은 안 쓴다).
 */
export function traceNodes(reasons: Reason[], records: RecordItem[], p: Program, newcomer?: Newcomer): TraceNode[] {
  if (newcomer && records.length === 0) return newcomerNodes(reasons, p, newcomer);
  const nodes: TraceNode[] = sortedReasons(reasons).map(r => {
    const rec = r.recordId ? records.find(x => x.id === r.recordId) : undefined;
    const detail = rec?.title ?? (quoted(r.text) || fieldName(p.field));
    return { kind: r.kind, label: REASON_LABEL[r.kind], detail, recordId: rec?.id, date: rec?.date };
  });
  const strengths = confirmedStrengthsFor(p, records.filter(r => r.useForRecommend));
  if (strengths.length === 0) return nodes;
  const node: TraceNode = { kind: 'strength', label: '강점', detail: strengths.slice(0, 2).map(s => s.label).join(' · ') };
  return [...nodes.slice(0, 1), node, ...nodes.slice(1)].slice(0, MAX_NODES);
}

const NEWCOMER_ORDER: TraceNode['kind'][] = ['goal', 'interest', 'novelty', 'interest-miss'];

/**
 * 기록이 없는 학생: 가입 때 받은 목표·관심으로 설명한다. 목표 분야와 같으면 '목표', 고른 관심이 맞으면 '관심',
 * 고른 관심 분야 모집이 이번 주 없어 넓혔으면 그 사실을 한 점으로. 모든 분야가 처음이니 탐색은 '처음 해 보는 …'.
 */
function newcomerNodes(reasons: Reason[], p: Program, who: Newcomer): TraceNode[] {
  const nodes: TraceNode[] = [];
  const goal = who.goal.trim();
  if (goal && goalGroups(goal).includes(FIELD_GROUP[p.field])) nodes.push({ kind: 'goal', label: '목표', detail: goal, text: `가입할 때 적은 목표 ‘${goal}’${josa(goal, '과', '와')} 같은 ${fieldName(p.field)} 분야예요.` });
  for (const r of sortedReasons(reasons)) {
    const detail = r.kind === 'novelty' ? `처음 해 보는 ${fieldName(p.field)}` : quoted(r.text) || fieldName(p.field);
    nodes.push({ kind: r.kind, label: REASON_LABEL[r.kind], detail });
  }
  const picked = who.interests.filter((i): i is FieldGroup => i !== 'unknown');
  const names = picked.map(g => GROUP_LABEL[g]).join('·');
  if (!who.interestOpen && picked.length) nodes.push({ kind: 'interest-miss', label: '관심', detail: `${names} 모집은 이번 주 없어요`, text: `처음에 고른 관심 ‘${names}’ 모집이 이번 주엔 없어서 다른 분야를 넓혀 봤어요.` });
  const at = (k: TraceNode['kind']) => { const i = NEWCOMER_ORDER.indexOf(k); return i < 0 ? NEWCOMER_ORDER.length : i; };
  return nodes.sort((a, b) => at(a.kind) - at(b.kind)).slice(0, MAX_NODES);
}

/** 마감 막대가 가득 차는 남은 날. 이보다 멀면 가득 찬 막대다. */
export const BAR_DAYS = 14;

/** 마감까지 남은 날 → 막대 길이 0~1(너무 짧으면 보이도록 최소 0.04) */
export const deadlineRatio = (dday: number): number => Math.min(1, Math.max(0.04, Math.max(0, dday) / BAR_DAYS));
