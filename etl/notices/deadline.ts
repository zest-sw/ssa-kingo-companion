// 날짜 읽기와 마감 고르기. 마감을 확신할 수 없으면 빈칸(null)이다. 짐작한 날짜는 넣지 않는다(spec FR-012~FR-016).
import type { Kind } from './classify.ts';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// ponytail: 표본에서 본 꼴만 읽는다(research R6). 정답셋에서 놓친 꼴이 나오면 여기에 더한다
/** 앞에서부터 가장 구체적인 꼴. '-'는 YYYY-MM-DD에서만 날짜 구분자로 본다('2026-1학기', '1-2학년'을 피하려고).
 *  'M월 D'는 바로 뒤에 (요일)이 올 때만 일 없이 읽는다('9월 29(화)').
 *  'M.D'는 목록 번호가 뒤 날짜에 붙은 것('1. 11월 15일')과 소수('3.5 이상', '3.5점')를 날짜로 보지 않는다. */
const DATE = new RegExp([
  '(?<y1>20\\d\\d)\\s*년\\s*(?<m1>\\d{1,2})\\s*월\\s*(?<d1>\\d{1,2})\\s*일',
  '(?<y2>20\\d\\d)\\s*[./-]\\s*(?<m2>\\d{1,2})\\s*[./-]\\s*(?<d2>\\d{1,2})(?!\\d)',
  "['’‘](?<y3>\\d\\d)\\s*[./]\\s*(?<m3>\\d{1,2})\\s*[./]\\s*(?<d3>\\d{1,2})(?!\\d)",
  '(?<mon>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+(?<d4>\\d{1,2})(?:st|nd|rd|th)?,?\\s+(?<y4>20\\d\\d)',
  '(?<!\\d)(?<m5>\\d{1,2})\\s*월\\s*(?<d5>\\d{1,2})(?:\\s*일|(?=\\s*\\([월화수목금토일]))',
  '(?<![\\d.])(?<m6>\\d{1,2})\\s*[./]\\s*(?<d6>\\d{1,2})(?!\\d)(?!\\s*월\\s*\\d{1,2}\\s*일)(?!\\s*(?:이상|이하|%|점(?![가-힣])|학년|학기))'
].join('|'), 'g');

/** 기간 끝에 일만 적은 꼴: '4/20(월)~24(금)'의 '~24', '11월 1일 ~ 30일'의 '~ 30일'.
 *  뒤에 숫자가 오는 '월'은 요일이 아니라 달이다('~ 7월 31일') */
const BARE_END = /^\s*(?:\([^)]*\)|[월화수목금토일])?\s*[~～∼–-]\s*(\d{1,2})(?:\s*일|(?=\s*(?:\(|\)|$|[월화수목금토일](?!\s*\d))))/;

const DAY = 86_400_000;

/** 달력에 있는 날만 받는다. 연도가 없으면 게시일 연도이고, 그 해에 없는 날(2/29)이거나 게시일보다 60일 넘게 앞서면 다음 해 */
function toIso(year: number | null, month: number, day: number, postedAt: string): string | null {
  const make = (y: number) => {
    const t = new Date(Date.UTC(y, month - 1, day));
    return t.getUTCMonth() === month - 1 && t.getUTCDate() === day ? t : null;
  };
  const posted = Date.parse(`${postedAt}T00:00:00Z`);
  const y0 = year ?? new Date(posted).getUTCFullYear();
  let t = make(y0);
  if (year === null && (!t || posted - t.getTime() > 60 * DAY)) t = make(y0 + 1) ?? t;
  // 1월 글의 '12/28'은 열한 달 뒤가 아니라 지난 12월이다
  if (year === null && t && t.getTime() - posted > 330 * DAY) t = make(y0 - 1) ?? t;
  return t ? t.toISOString().slice(0, 10) : null;
}

type Token = { date: string; at: number; end: number };

function scan(text: string, postedAt: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(DATE)) {
    const g = m.groups ?? {};
    const at = m.index ?? 0;
    // 'Llama 3.1', 'GPT-4.1'처럼 영어 낱말 바로 뒤의 점 숫자는 판 번호다. 'Colloquium 11/20' 같은 빗금 날짜는 읽는다
    if (g.m6 && m[0].includes('.') && /[A-Za-z][\s-]?$/.test(text.slice(0, at))) continue;
    const [y, mo, d]: [number | null, number, number] =
      g.y1 ? [+g.y1, +g.m1, +g.d1]
      : g.y2 ? [+g.y2, +g.m2, +g.d2]
      : g.y3 ? [2000 + +g.y3, +g.m3, +g.d3]
      : g.mon ? [+g.y4, MONTHS.indexOf(g.mon.toLowerCase()) + 1, +g.d4]
      : g.m5 ? [null, +g.m5, +g.d5]
      : [null, +g.m6, +g.d6];
    const date = toIso(y, mo, d, postedAt);
    if (!date) continue;
    const tail = at + m[0].length;
    out.push({ date, at, end: tail });
    const bare = text.slice(tail).match(BARE_END);
    if (bare) {
      // 끝 날이 시작 날보다 작으면 다음 달이다('4/28(화)~2(토)' → 5월 2일)
      const [sy, sm, sd] = date.split('-').map(Number);
      const [ey, em] = +bare[1] >= sd ? [sy, sm] : sm === 12 ? [sy + 1, 1] : [sy, sm + 1];
      const end = toIso(ey, em, +bare[1], postedAt);
      if (end) out.push({ date: end, at: tail + bare[0].lastIndexOf(bare[1]), end: tail + bare[0].length });
    }
  }
  return out;
}

/** 글 속 날짜를 나온 순서대로 YYYY-MM-DD로 */
export const readDates = (text: string, postedAt: string) => scan(text, postedAt).map(t => t.date);

/** 날짜·시각·요일·물결표와 비게 된 괄호를 지운다. 중복 공지를 묶는 열쇠에 쓴다 */
export const stripDates = (title: string) =>
  title
    .replace(DATE, ' ')
    .replace(/\d{1,2}:\d{2}|\d{1,2}\s*시/g, ' ')
    .replace(/\(\s*[월화수목금토일]\s*\)|[~～∼]/g, ' ')
    .replace(/(?<=[\s(])[월화수목금토일](?=[\s)])/g, ' ')
    .replace(/\(\s*[,/·]?\s*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const APPLY_LABEL = /(?:신청|접수|모집|지원|제출|이벤트)\s*(?:기간|기한|마감|일정|일시)|(?:신청|접수)\s*[:：]|사전\s*등록|서류\s*마감|마감|기한/;
/** '~까지'와 함께 있어야 신청 줄이다. '지원됩니다', '지원금'의 지원은 신청이 아니다 */
const UNTIL_VERB = /신청|접수|제출|지원(?![되됩금])/;
/** 마감 후보가 아닌 줄: 자격·대상(출생일 같은 날짜가 있음)과 행사 줄. 라벨 쪽(첫 날짜 앞)만 본다. '신청 일시'의 일시는 신청 줄이다 */
const SKIP = /자격|대상|출생|(?<!(?:신청|접수|제출|모집)\s*)일시|교육\s*기간|활동\s*기간|행사\s*기간|운영\s*기간|실습\s*기간|면접|발표/;
/** 제목의 마감 표시: 물결표, 접수·신청·마감 */
const TITLE_MARK = /[~～∼]|접수|신청|마감/g;
/** 기간을 잇는 말만 남았는가: 물결표·줄표와 '…부터 …까지'의 부터 */
const RANGE = /^(?:[~～∼–-]|부터)$/;
const TIME = /^\s*\d{1,2}\s*(?::\d{2}|시)/;
const dropTimes = (s: string) => s.replace(/\d{1,2}\s*(?::\d{2}|시)/g, '');
const letters = (s: string) => s.replace(/[^가-힣A-Za-z]/g, '').length;
/** 첫 날짜 앞 라벨 쪽에서, 한 줄에 여러 항목을 / | ; 로 이었으면 마지막 항목만 본다('신청 대상: 재학생 / 신청기간: …') */
const skipped = (line: string, tokens: Token[]) => SKIP.test((tokens.length ? line.slice(0, tokens[0].at) : line).split(/[/|;]/).pop() ?? '');

type Deadline = { date: string; rule: string };

/** tokens[j]가 기간의 끝인가: 앞 날짜와의 사이에 (요일)·시각·오전/오후와 물결표·줄표·'부터'만 있다('세미나 - 설명회'처럼 다른 말이 끼면 아니다).
 *  맨 앞 날짜는 바로 앞이 물결표일 때다('~11/15') */
function isEnd(text: string, tokens: Token[], j: number): boolean {
  const gap = dropTimes(text.slice(j ? tokens[j - 1].end : 0, tokens[j].at));
  return j ? RANGE.test(gap.replace(/\([^)]*\)|오전|오후|[\s,.]|[월화수목금토일](?![가-힣])/g, '')) : /[~～∼]\s*$/.test(gap);
}

/** 줄 하나의 후보: 기간 끝(서로 다르면 그 끝 날짜들), 기간이 없으면 첫 날짜. 마지막 날짜 뒤에 끝을 못 읽은 물결표·부터가 있으면 'open' */
function pick(line: string, tokens: Token[]): string | string[] | null {
  if (!tokens.length) return null;
  // 마지막 날짜 바로 뒤((요일)·시각만 사이에 둠)의 물결표·부터만 본다. 뒤 문장의 '신청한 날부터'는 기간이 아니다
  const after = line.slice(tokens[tokens.length - 1].end).match(/^\s*(?:\([^)]*\))?\s*(?:(?:오전|오후)\s*)?(?:\d{1,2}\s*(?::\d{2}|시)\s*)?(?:[~～∼]|부터)\s*(.*)$/);
  if (after && !TIME.test(after[1])) return 'open';
  const ends = [...new Set(tokens.filter((_, j) => isEnd(line, tokens, j)).map(t => t.date))];
  return ends.length > 1 ? ends : ends[0] ?? tokens[0].date;
}

/** 본문 신청 줄들의 마감. 후보 날짜가 서로 다르면 지난 날짜를 빼고(이미 끝난 1차 등) 하나가 남으면 그것, 아니면 { conflict: 후보들 } */
function fromBody(lines: string[], postedAt: string): Deadline | { conflict: string[] } | null {
  const found: Deadline[] = [];
  lines.forEach((line, i) => {
    const tokens = scan(line, postedAt);
    if (skipped(line, tokens)) return;
    const hit = line.match(APPLY_LABEL) ?? (line.includes('까지') ? line.match(UNTIL_VERB) : null);
    if (!hit) return;
    // 라벨 뒤 날짜를 먼저 본다('교육 일정: 11/3 ~ 11/28 (신청 마감 10/31)'). '…까지 제출'처럼 날짜가 앞이면 줄 전체
    const own = tokens.filter(t => t.at >= (hit.index ?? 0));
    let date = pick(line, own.length ? own : tokens);
    const next = lines[i + 1];
    // 날짜 없이 끝나는 제목줄('■ 접수기간')이나 끝을 다음 줄에 적은 기간이면 다음 줄의 날짜
    if (next && (date === 'open' || (!tokens.length && letters(line) <= letters(hit[0]) + 4))) {
      const nextTokens = scan(next, postedAt);
      date = skipped(next, nextTokens) ? null : pick(next, nextTokens);
    }
    const rule = `본문: ${hit[0].replace(/[\s:：]+/g, '')}`;
    for (const d of Array.isArray(date) ? date : date && date !== 'open' ? [date] : []) found.push({ date: d, rule });
  });
  const dates = [...new Set(found.map(f => f.date))];
  if (dates.length < 2) return found[0] ?? null;
  const open = dates.filter(d => d >= postedAt);
  return open.length === 1 ? found.find(f => f.date === open[0]) ?? null : { conflict: dates };
}

/** 제목: 뒤에서부터 마감 표시를 보고, 처음으로 뒤에 날짜가 있는 표시의 그 날짜(기간이면 끝). 없으면 마지막 '까지' 앞의 날짜 */
function fromTitle(title: string, postedAt: string): string | null {
  const tokens = scan(title, postedAt);
  for (const m of [...title.matchAll(TITLE_MARK)].reverse()) {
    const i = tokens.findIndex(t => t.at >= (m.index ?? 0) + m[0].length);
    if (i >= 0) return i + 1 < tokens.length && isEnd(title, tokens, i + 1) ? tokens[i + 1].date : tokens[i].date;
  }
  const until = title.lastIndexOf('까지');
  const before = tokens.filter(t => t.at < until);
  return until >= 0 && before.length ? before[before.length - 1].date : null;
}

const WEEK = '일월화수목금토';
/** 날짜 바로 뒤에 적은 요일('11/29(수)', '11/29, 수')이 달력과 다르다 */
const wrongDay = (text: string, t: Token) => {
  const w = text.slice(t.end).match(/^\s*[(,]?\s*([월화수목금토일])(?![가-힣])/)?.[1];
  return !!w && WEEK[new Date(`${t.date}T00:00:00Z`).getUTCDay()] !== w;
};

/** 신청 없이 가는 특강의 행사 날: 제목 날짜가 하나면 그것, 아니면 본문 '일시' 줄의 마지막 날짜(여러 날이면 끝나는 날).
 *  제목 날짜의 요일이 달력과 다르면 오타라서 제목을 믿지 않고 본문을 본다 */
function eventDay(lines: string[], title: string, postedAt: string): Deadline | null {
  const tokens = scan(title, postedAt);
  const inTitle = [...new Set(tokens.map(t => t.date))];
  if (inTitle.length === 1 && !tokens.some(t => wrongDay(title, t))) return { date: inTitle[0], rule: '행사 날: 제목' };
  for (const line of lines) {
    const dates = /일시/.test(line) ? readDates(line, postedAt) : [];
    if (dates.length) return { date: dates[dates.length - 1], rule: '행사 날: 본문' };
  }
  return null;
}

/** 본문 신청 줄 → 제목의 마감 표시 날짜 → (특강만) 행사 날. 엇갈리거나 게시일보다 앞서면 null.
 *  신청 줄 날짜가 엇갈려도 제목의 마감 표시와 같은 후보가 있으면 그 날짜다(CJ제일제당 '~9/30') */
export function deadlineOf(lines: string[], title: string, postedAt: string, kind: Kind): Deadline | null {
  const body = fromBody(lines, postedAt);
  const titleDate = fromTitle(title, postedAt);
  const picked = body && 'conflict' in body
    ? titleDate && body.conflict.includes(titleDate) ? { date: titleDate, rule: '본문·제목' } : null
    : body ?? (titleDate ? { date: titleDate, rule: '제목' } : kind === 'lecture' ? eventDay(lines, title, postedAt) : null);
  return picked && picked.date >= postedAt ? picked : null;
}
