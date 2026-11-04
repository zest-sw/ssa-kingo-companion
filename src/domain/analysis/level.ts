import type { Did, Program } from '../types';

// 활동의 심화 수준(난이도). 테크 트리의 가로 위치다. 숫자는 계산에만 쓰고 화면에는 단계 이름만 낸다.

export type Level = 1 | 2 | 3;
export const LEVEL_NAME: Record<Level, string> = { 1: '입문', 2: '중급', 3: '심화' };
/** 단계마다 보통 하는 활동. 건너뛴 단계 서랍에서 '이 단계에서 할 수 있는 활동'으로 보인다. */
export const LEVEL_EXAMPLES: Record<Level, string> = {
  1: '특강·입문 스터디·체험',
  2: '프로젝트·해커톤·대회 참가',
  3: '대회 수상·팀 리드·튜터·발표'
};

export type Levelled = { title: string; kind?: string; did?: Did; level?: Level; programId?: string };
export type LevelSource = 'set' | 'program' | 'rule';

// 규칙은 위에서부터 먼저 맞는 것을 쓴다.
// 1) 이름에 '입문·기초'나 '멘티'가 있으면 입문(캠프여도 입문 캠프는 입문이다).
// 2) 남을 가르치거나 이끌거나 결과를 내보인 활동은 심화: 수상·리드·튜터·멘토·발표·운영.
// 3) 끝까지 만들어 내는 참가형 활동은 중급: 프로젝트·해커톤·대회·공모전·캠프·동아리·학회·크루.
// 4) 듣고 배우는 활동은 입문: 특강·스터디·토크·워크숍·교류·체험.
// 5) 그래도 모르면 한 일로: 발표=심화, 만들기·정리·아이디어=중급, 듣기·묻기=입문.
const RULES: [RegExp, Level][] = [
  [/입문|기초|멘티/, 1],
  [/수상|리드|팀장|튜터|멘토(?!링)|발표|운영진|리더/, 3],
  [/프로젝트|해커톤|대회|공모전|캠프|동아리|학회|크루|챌린지|부트캠프|연수/, 2],
  [/특강|스터디|토크|워크숍|교류|체험|커피챗|설명회/, 1]
];
const DID_LEVEL: Record<Did, Level> = { listen: 1, ask: 1, organize: 2, idea: 2, make: 2, present: 3 };

/** 난이도와 그 근거. 직접 정한 값 → 연결된 기회의 난이도 → 이름 규칙 → 한 일 순서. */
export function levelWithSource(item: Levelled, programs: Record<string, Program> = {}): { level: Level; source: LevelSource } {
  if (item.level) return { level: item.level, source: 'set' };
  const p = item.programId ? programs[item.programId] : undefined;
  if (p) return { level: p.level, source: 'program' };
  const text = `${item.title} ${item.kind ?? ''}`;
  const hit = RULES.find(([re]) => re.test(text));
  return { level: hit ? hit[1] : item.did ? DID_LEVEL[item.did] : 1, source: 'rule' };
}

export const levelOf = (item: Levelled, programs?: Record<string, Program>): Level => levelWithSource(item, programs).level;

/** 서랍의 '이 자리에 놓인 이유' 한 줄 */
export function levelReason(item: Levelled, programs?: Record<string, Program>): string {
  const { level, source } = levelWithSource(item, programs);
  const name = LEVEL_NAME[level];
  if (source === 'program') return `연결된 기회가 ‘${name}’ 수준이라 이 자리에 놓았어요.`;
  if (source === 'set') return `‘${name}’ 수준 활동이라 이 자리에 놓았어요. 보통 ${LEVEL_EXAMPLES[level]} 같은 활동이 여기예요.`;
  return `이름${item.did ? '과 한 일' : ''}로 보면 ‘${name}’ 수준이라 이 자리에 놓았어요. 보통 ${LEVEL_EXAMPLES[level]} 같은 활동이 여기예요.`;
}
