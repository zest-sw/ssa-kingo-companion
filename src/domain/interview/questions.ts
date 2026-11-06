import type { FieldGroup, RecordCard } from '../types';

// 회고 인터뷰의 질문 넷. 한 화면에 하나씩 묻는다(토스 원칙 06: 어려운 질문 하나보다 쉬운 질문 셋).
// STAR 이름 대신 학생 말로 묻고, 답은 경험 카드의 같은 칸에 그대로 들어간다.

export type QuestionKey = 'situation' | 'role' | 'action' | 'learned';

export type Question = {
  key: QuestionKey;
  /** 화면에 크게 보이는 질문 */
  ask: string;
  /** 질문 아래 한 줄: 얼마나 쓰면 되는지, 왜 묻는지 */
  hint: string;
};

export const QUESTIONS: readonly Question[] = [
  { key: 'situation', ask: '어떤 상황이었나요?', hint: '언제, 누구와 했는지 한 줄이면 돼요.' },
  { key: 'role', ask: '내가 맡은 일은 무엇이었나요?', hint: '직함이 없어도 돼요. 내가 챙긴 일을 적어요.' },
  { key: 'action', ask: '어떻게 했나요?', hint: '한 일 하나만 골라 적어요. 이 문장이 역량 근거가 돼요.' },
  { key: 'learned', ask: '무엇이 남았나요?', hint: '결과든 배운 점이든 하나면 돼요.' }
];

export const QUESTION_COUNT = QUESTIONS.length;

/** 질문 i(0부터) 또는 미리보기 */
export type FlowStep = number | 'preview';

export const nextStep = (step: FlowStep): FlowStep => (step === 'preview' || step >= QUESTION_COUNT - 1 ? 'preview' : step + 1);
export const prevStep = (step: FlowStep): FlowStep => (step === 'preview' ? QUESTION_COUNT - 1 : Math.max(0, step - 1));

/** 칸 하나를 학생 글로 바꾼다. 비우면 칸을 지운다(건너뛴 칸은 경험 카드에서 빈칸). */
export function setAnswer(card: RecordCard, key: QuestionKey, text: string): RecordCard {
  const next = { ...card };
  if (text.trim()) next[key] = text; else delete next[key];
  return next;
}

export const answered = (card: RecordCard): QuestionKey[] => QUESTIONS.filter(q => !!card[q.key]?.trim()).map(q => q.key);

/** 한 칸이라도 답해야 경험 카드가 된다. 다 건너뛰면 '기록만 남기기'와 같아서 저장하지 않는다. */
export const canSave = (card: RecordCard): boolean => answered(card).length > 0;

/** 저장할 때 앞뒤 공백을 다듬은 카드. 학생 글은 그대로 둔다. */
export function trimmedCard(card: RecordCard): RecordCard {
  const out: RecordCard = {};
  for (const k of Object.keys(card) as (keyof RecordCard)[]) {
    const v = card[k]?.trim();
    if (v) out[k] = v;
  }
  return out;
}

export type ChipContext = {
  /** 기관 활동 유형. 예: '교내 해커톤' */
  kind: string;
  group: FieldGroup;
  /** 활동 정보로 만든 상황 문장(있으면 첫 칩) */
  situation?: string;
};

const ROLE: Record<FieldGroup, string[]> = {
  dev: ['기능 개발을 맡았어요', '화면 구현을 맡았어요'],
  ai: ['데이터 전처리를 맡았어요', '분석과 시각화를 맡았어요'],
  plan: ['기획안 정리를 맡았어요', '사용자 조사를 맡았어요'],
  mentor: ['진행과 안내를 맡았어요', '참여자 질문에 답했어요'],
  global: ['통역과 안내를 맡았어요', '자료 번역을 맡았어요'],
  other: ['자료 조사를 맡았어요', '질문을 준비해 갔어요']
};

const ACTION: Record<FieldGroup, string[]> = {
  dev: ['직접 만들어서 시연했어요', '막힌 오류를 찾아 고쳤어요'],
  ai: ['데이터를 정리하는 코드를 만들어 팀과 같이 썼어요', '결과를 그래프로 정리해 발표했어요'],
  plan: ['인터뷰한 내용을 묶어 문제를 정리했어요', '아이디어를 한 장으로 정리해 제안했어요'],
  mentor: ['처음 온 사람에게 순서를 설명했어요', '질문을 모아 답을 정리해 공유했어요'],
  global: ['낯선 표현을 쉬운 말로 바꿔 전했어요', '자료를 정리해 공유했어요'],
  other: ['들은 내용을 정리해 공유했어요', '궁금한 점을 직접 물어봤어요']
};

/** 활동 정보가 없을 때 붙는 유형 이름(data/activities factsOf) */
const GENERIC_KIND = ['비교과 활동', '비교과 프로그램'];

const LEARNED = ['준비가 중요하다는 걸 알았어요', '혼자보다 같이 할 때 빨랐어요', '설명하다 보니 정리가 됐어요'];

/**
 * 질문 아래 답 조각. 에이전트가 활동 정보(유형·분야·상황)로 미리 만든 말이라 AI 추정이다.
 * 누르면 입력 칸에 들어가고, 학생이 고친 글만 카드에 남는다. 수치는 넣지 않는다.
 */
export function answerChips(key: QuestionKey, c: ChipContext): string[] {
  switch (key) {
    case 'situation': {
      // '비교과 활동'처럼 뭉뚱그린 유형은 문장에 넣으면 어색해서 뺀다.
      const where = GENERIC_KIND.includes(c.kind) ? '' : `${c.kind}에 `;
      const team = [`${where}팀으로 참여했어요`, `${where}혼자 참여했어요`];
      return c.situation?.trim() ? [c.situation.trim(), ...team] : team;
    }
    case 'role': return ROLE[c.group];
    case 'action': return ACTION[c.group];
    case 'learned': return LEARNED;
  }
}

/** 칩을 칸에 넣는다. 비어 있으면 그 말로, 이미 쓴 글이 있으면 뒤에 잇는다(같은 말은 두 번 넣지 않는다). */
export function insertChip(current: string, chip: string): string {
  const t = current.trim();
  if (!t) return chip;
  if (t.includes(chip)) return current;
  return `${t} ${chip}`;
}
