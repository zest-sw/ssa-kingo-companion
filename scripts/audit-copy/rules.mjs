/**
 * 화면 문구 검사 규칙(kingo-ux-writing, docs/research/toss-level-ux-2026-11-06.md).
 * 보이는 글자 덩어리 하나(텍스트 요소 하나의 innerText)를 받아 걸린 것을 돌려준다. 브라우저 없이 테스트한다.
 */

/** 반짝이·별 기호와 글자 화살표. 뜻이 정해지지 않은 장식이다 */
export const SYMBOLS = ['✧', '✦', '✨', '★', '→'];

/** 금지어: 내부 용어, AI 티 나는 말, 과한 높임 */
export const BANNED = ['노드', '엣지', '클러스터', '인사이트', '솔루션', '최적화', '다양한', '혹시', '정말', '하시겠어요', '볼 수 있어요', '스코어'];

/** 한 요소 안에서 이만큼 넘게 ' · '(앞뒤 공백 가운뎃점)로 이으면 사슬로 본다. 이름 속 가운뎃점('창업·기획')은 공백이 없어 세지 않는다 */
export const DOT_CHAIN_MAX = 1;
const DOT = / · /g;

/**
 * @param {string} text 요소 하나의 보이는 글자
 * @returns {{ kind: 'symbol' | 'banned' | 'dots', hit: string }[]}
 */
export function findCopyIssues(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const out = [];
  for (const s of SYMBOLS) if (t.includes(s)) out.push({ kind: 'symbol', hit: s });
  for (const w of BANNED) if (t.includes(w)) out.push({ kind: 'banned', hit: w });
  const dots = (t.match(DOT) ?? []).length;
  if (dots > DOT_CHAIN_MAX) out.push({ kind: 'dots', hit: `가운뎃점 ${dots}개` });
  return out;
}

export const KIND_LABEL = { symbol: '기호', banned: '금지어', dots: '가운뎃점 사슬' };
