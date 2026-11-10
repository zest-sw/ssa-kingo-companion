// 소프트웨어학과 공지 게시판: 주소, 서버 예의를 지키는 요청, 목록·본문 HTML 읽기, 원문 보관.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// ponytail: robots.txt는 2026-11-07에 확인했다(이 게시판을 막지 않음). 정기 실행을 붙이기 전에 다시 본다
export const SOURCE = 'https://cse.skku.edu/cse/notice.do';
export const listUrl = (offset: number) => `${SOURCE}?mode=list&articleLimit=100&article.offset=${offset}`;
export const viewUrl = (no: number) => `${SOURCE}?mode=view&articleNo=${no}`;
/** 저장소 주소만 담는다. 이메일 같은 개인정보는 넣지 않는다 */
export const USER_AGENT = 'ssa-kingo-companion-etl (+https://github.com/zest-sw/ssa-kingo-companion)';
/** 받은 원문 보관함(.gitignore). 실행 위치와 상관없이 etl/.cache/cse */
export const CACHE_DIR = fileURLToPath(new URL('../.cache/cse', import.meta.url));

export type NoticeRow = { no: number; title: string; board: string; postedAt: string; pinned: boolean };
export type Get = (url: string) => Promise<string>;

/** 실행을 멈춰야 하는 게시판 문제(목록 실패, 구조 변경). 메시지를 사용자에게 그대로 보인다 */
export class BoardError extends Error {}

/** makeGet이 던진 오류를 사람이 읽을 이유로. 시간 초과는 AbortSignal.timeout의 DOMException이다 */
function reasonOf(e: unknown): string {
  if (e instanceof Error && e.name === 'TimeoutError') return '15초 안에 응답이 없어요';
  const status = e instanceof Error ? /^HTTP (\d+)/.exec(e.message)?.[1] : undefined;
  return status ? `응답 코드 ${status}` : '서버에 연결하지 못했어요';
}

// ponytail: 호출하는 쪽이 하나씩 await 한다고 본다. 동시에 부를 일이 생기면 요청을 줄 세운다
/** 학교 서버에 앞 요청과 gapMs 이상 띄워 보내고, 15초 안에 2xx가 오지 않으면 실패한다 */
export function makeGet(gapMs = 1000): Get {
  let last = 0;
  return async url => {
    const wait = last + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
}

const clean = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** 목록 한 쪽. 고정글은 정보 첫 칸이 '공지'다.
 *  JSDOM.fragment는 문서 하나를 같이 써서 쪽마다 창(window)을 만들 때보다 메모리를 훨씬 덜 쓴다 */
export function parseList(html: string): NoticeRow[] {
  const rows: NoticeRow[] = [];
  for (const dl of JSDOM.fragment(html).querySelectorAll('dl.board-list-content-wrap')) {
    const link = dl.querySelector('a[href*="articleNo="]');
    const no = Number(link?.getAttribute('href')?.match(/articleNo=(\d+)/)?.[1]);
    const cells = [...dl.querySelectorAll('dd li')].map(li => clean(li.textContent));
    const postedAt = cells.find(c => /^\d{4}-\d{2}-\d{2}$/.test(c));
    if (!link || !no || !postedAt) continue;
    rows.push({
      no,
      title: clean(link.textContent),
      board: clean(dl.querySelector('.c-board-list-category')?.textContent ?? null).replace(/^\[|\]$/g, ''),
      postedAt,
      pinned: cells[0] === '공지'
    });
  }
  return rows;
}

const BLOCK = new Set(['P', 'DIV', 'BR', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'UL', 'OL', 'PRE']);

/** 본문 영역(.fr-view)만 줄로 읽는다. 영역이 없으면 null.
 *  페이지 아래 이전글·다음글 제목에는 다른 글의 마감이 있어서 영역 밖은 읽지 않는다. */
export function bodyLines(html: string): string[] | null {
  const root = JSDOM.fragment(html).querySelector('div.fr-view');
  if (!root) return null;
  let text = '';
  const walk = (node: Node, pre: boolean) => {
    for (const child of node.childNodes) {
      // 글자 속 소스 줄바꿈은 브라우저에서 빈칸이다. 줄은 블록 요소에서만 바꾼다. <pre> 안은 줄바꿈이 곧 줄이다(표본 2건)
      if (child.nodeType === 3) { text += pre ? child.textContent ?? '' : (child.textContent ?? '').replace(/[\r\n]/g, ' '); continue; }
      if (child.nodeType !== 1) continue;
      const tag = (child as Element).tagName;
      const block = BLOCK.has(tag);
      if (block) text += '\n';
      if (tag === 'TD' || tag === 'TH') text += ' ';
      walk(child, pre || tag === 'PRE');
      if (block) text += '\n';
    }
  };
  walk(root, false);
  return text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** 기준일(그날 포함) 이후 글. 최신순으로 읽다가 기준일보다 오래된 일반 글이 나오면 멈춘다.
 *  고정글은 쪽마다 맨 위에 다시 나오므로 멈춤 판단에 쓰지 않는다. 새 일반 글이 없는 쪽(마지막 쪽 너머)에서도 멈춘다.
 *  다음 쪽은 이번 쪽에서 읽은 일반 글 수만큼 넘겨서, 서버가 한 쪽에 100건보다 적게 줘도 빠뜨리지 않는다. */
export async function listSince(since: string, get: Get): Promise<NoticeRow[]> {
  const seen = new Map<number, NoticeRow>();
  for (let offset = 0; ; ) {
    let html: string;
    try {
      html = await get(listUrl(offset));
    } catch (e) {
      throw new BoardError(`목록을 받지 못했어요 (${offset}번째부터): ${reasonOf(e)}.`);
    }
    const page = parseList(html);
    // 글이 하나도 없는 쪽은 기간 탓이 아니라 HTML 모양이 바뀐 것이다(쪽마다 고정글이 있고, 기간 안 글이 없어도 옛 글이 보인다).
    // 둘째 쪽부터 점검 페이지가 와도 반쪽 목록으로 결과를 바꾸지 않는다
    // ponytail: 마지막 쪽 너머가 고정글도 없는 빈 쪽이면 여기서 멈춘다. 기준일이 게시판 첫 글보다 이를 때만 생긴다
    if (page.length === 0) throw new BoardError('게시판 구조가 바뀐 것 같아요: 목록에서 글을 하나도 못 읽었어요.');
    let fresh = 0;
    let older = false;
    for (const r of page) {
      if (r.postedAt < since) {
        if (!r.pinned) older = true;
        continue;
      }
      if (!r.pinned && !seen.has(r.no)) fresh++;
      seen.set(r.no, r);
    }
    if (older || fresh === 0) return [...seen.values()];
    offset += page.filter(r => !r.pinned).length;
  }
}

// ponytail: 보관한 본문은 다시 받지 않아 나중에 고쳐진 마감을 못 따라간다. 필요해지면 최근 2주 글만 다시 받는다
/** 보관함을 먼저 보고, 없으면 받는다. 본문 영역이 있는 페이지만 보관해서, 실패하거나 영역이 없으면 다음 실행에서 다시 받는다.
 *  fetched는 이번에 서버에서 페이지를 받았는지다. */
export async function bodyOf(no: number, get: Get, dir = CACHE_DIR): Promise<{ lines: string[] | null; fetched: boolean }> {
  const file = join(dir, `${no}.html`);
  const kept = existsSync(file) ? bodyLines(readFileSync(file, 'utf8')) : null;
  if (kept) return { lines: kept, fetched: false };
  let html: string;
  try {
    html = await get(viewUrl(no));
  } catch {
    return { lines: null, fetched: false };
  }
  const lines = bodyLines(html);
  if (lines) {
    // 쓰다 멈춘 반쪽 파일을 다음 실행이 본문으로 믿지 않게 .tmp에 다 쓴 뒤 이름을 바꾼다
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${file}.tmp`, html);
    renameSync(`${file}.tmp`, file);
  }
  return { lines, fetched: true };
}
