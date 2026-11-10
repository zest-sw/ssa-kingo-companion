import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardError, bodyLines, bodyOf, listSince, listUrl, makeGet, parseList, USER_AGENT, viewUrl, type Get } from './cse.ts';

// 게시판 HTML을 흉내 낸 짧은 조각. 실제 본문은 쓰지 않는다
const row = (first: string, no: number, board: string, title: string, date: string) => `
  <li><dl class="board-list-content-wrap"><dt class="board-list-content-title">
    <span class="c-board-list-category">[${board}]</span>
    <a href="?mode=view&amp;articleNo=${no}&amp;article.offset=0&amp;articleLimit=100" title="자세히 보기"> ${title} </a>
    <span class="c-board-list-new">NEW</span>
  </dt><dd class="board-list-content-info"><ul>
    <li> ${first} </li><li>소프트웨어학과</li><li>${date}</li><li>조회수<span>12</span></li>
  </ul></dd></dl></li>`;
const page = (...rows: string[]) => `<html><body><ul>${rows.join('')}</ul></body></html>`;
const view = (inner: string) => `<html><body>
  <div class="board-view-content-wrap board-view-txt"><div class="fr-view">${inner}</div></div>
  <ul class="board-view-prev-next"><li>이전글 <a>[다른 회사] 인턴 모집 (~5.17.(일)까지 신청)</a></li></ul>
</body></html>`;

describe('parseList', () => {
  it('고정글과 일반 글을 읽고 분류의 대괄호와 제목 공백을 정리한다', () => {
    const rows = parseList(page(
      row('공지', 9, '학사', '[졸업평가]   제출   안내 ', '2026-01-05'),
      row('No.1370', 228201, '채용/모집', '[동진쎄미켐] 2026년 11월 신입/경력 정기채용 (~11/15(일))', '2026-11-06')
    ));
    expect(rows).toEqual([
      { no: 9, title: '[졸업평가] 제출 안내', board: '학사', postedAt: '2026-01-05', pinned: true },
      { no: 228201, title: '[동진쎄미켐] 2026년 11월 신입/경력 정기채용 (~11/15(일))', board: '채용/모집', postedAt: '2026-11-06', pinned: false }
    ]);
  });
});

describe('bodyLines', () => {
  it('본문 영역만 줄로 읽고 이전글·다음글은 읽지 않는다', () => {
    const lines = bodyLines(view(
      '<p>□ 신청 기간</p><p>12/01(화) ~ 12/09(수)<br>18:00</p><div><div>안쪽&nbsp;&nbsp;글</div></div>' +
      '<table><tr><td>접수</td><td>11.3 ~ 11.14</td></tr></table>'
    ));
    expect(lines).toEqual(['□ 신청 기간', '12/01(화) ~ 12/09(수)', '18:00', '안쪽 글', '접수 11.3 ~ 11.14']);
    expect(lines?.join('\n')).not.toContain('5.17');
  });

  it('글자 사이 소스 줄바꿈은 브라우저처럼 빈칸으로 읽고, 블록 요소에서만 줄을 바꾼다', () => {
    expect(bodyLines(view('<ul><li><strong>일시</strong>\n<strong>9/15(화) 13:00</strong></li><li>장소\r\n본관</li></ul>'))).toEqual(['일시 9/15(화) 13:00', '장소 본관']);
  });

  it('<pre> 안에서는 줄바꿈이 곧 줄이다', () => {
    expect(bodyLines(view('<pre>□ 접수 기간\n3/2 ~ 3/13\n문의: 학과 사무실</pre>'))).toEqual(['□ 접수 기간', '3/2 ~ 3/13', '문의: 학과 사무실']);
  });

  it('본문 영역이 없으면 null이다', () => {
    expect(bodyLines('<html><body><p>잘못된 접근이에요</p></body></html>')).toBeNull();
  });
});

describe('listSince', () => {
  /** 가짜 게시판: 쪽마다 고정글을 맨 위에 다시 싣고, article.offset부터 size건의 일반 글을 싣는다 */
  const board = (pinned: string[], regular: string[], size = 100): Get => async url => {
    const offset = Number(url.match(/article\.offset=(\d+)/)?.[1]);
    return page(...pinned, ...regular.slice(offset, offset + size));
  };
  const PINNED = [row('공지', 9, '학사', '오래된 고정글', '2025-01-02'), row('공지', 31, '일반', '기간 안 고정글', '2026-10-15')];
  const REGULAR = [
    row('No.4', 30, '채용/모집', '가', '2026-11-01'),
    row('No.3', 29, '채용/모집', '나', '2026-10-01'),
    row('No.2', 28, '행사/세미나', '다', '2026-09-20'),
    row('No.1', 27, '행사/세미나', '라', '2026-08-01')
  ];

  it('오래된 고정글에서 멈추지 않고, 기준일보다 오래된 첫 일반 글에서 멈춘다', async () => {
    const get = vi.fn<Get>(board(PINNED, REGULAR, 2));
    const rows = await listSince('2026-09-20', get);
    expect(rows.map(r => r.no).sort((a, b) => b - a)).toEqual([31, 30, 29, 28]);
    expect(get.mock.calls.map(c => c[0])).toEqual([listUrl(0), listUrl(2)]);
  });

  it('새 일반 글이 없는 쪽에서 멈춘다(마지막 쪽 너머)', async () => {
    const get = vi.fn<Get>(board(PINNED, REGULAR, 2));
    const rows = await listSince('2000-01-01', get);
    expect(rows.map(r => r.no).sort((a, b) => b - a)).toEqual([31, 30, 29, 28, 27, 9]);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('서버가 한 쪽에 몇 건을 주든 읽은 일반 글 수만큼 넘겨서 빠짐없이 읽는다', async () => {
    const many = Array.from({ length: 25 }, (_, i) => row(`No.${25 - i}`, 125 - i, '채용/모집', `글 ${i}`, '2026-11-01'));
    const rows = await listSince('2026-10-01', board(PINNED, many, 10));
    expect(rows.filter(r => !r.pinned).map(r => r.no)).toEqual(Array.from({ length: 25 }, (_, i) => 125 - i));
  });

  const caught = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e);

  it.each([
    ['시간 초과', new DOMException('The operation was aborted due to timeout', 'TimeoutError'), '15초 안에 응답이 없어요'],
    ['2xx 아님', new Error('HTTP 503'), '응답 코드 503'],
    ['연결 실패', new TypeError('fetch failed'), '서버에 연결하지 못했어요']
  ])('목록을 못 받으면(%s) 몇 번째부터인지와 이유를 담아 멈춘다', async (_, e, reason) => {
    const err = await caught(listSince('2026-09-20', async () => { throw e; }));
    expect(err).toBeInstanceOf(BoardError);
    expect((err as Error).message).toBe(`목록을 받지 못했어요 (0번째부터): ${reason}.`);
    const first = board(PINNED, REGULAR, 2);
    const later = await caught(listSince('2026-09-20', async url => {
      if (url === listUrl(0)) return first(url);
      throw e;
    }));
    expect((later as Error).message).toBe(`목록을 받지 못했어요 (2번째부터): ${reason}.`);
  });

  it('글을 하나도 못 읽은 쪽이 오면 첫 쪽이 아니어도 구조가 바뀐 것으로 보고 멈춘다. 기간 안 글이 없는 것은 오류가 아니다', async () => {
    const structure = '게시판 구조가 바뀐 것 같아요: 목록에서 글을 하나도 못 읽었어요.';
    const empty = await caught(listSince('2026-09-20', async () => page()));
    expect(empty).toBeInstanceOf(BoardError);
    expect((empty as Error).message).toBe(structure);
    const first = board(PINNED, REGULAR, 2);
    const maintenance = await caught(listSince('2026-09-20', async url => (url === listUrl(0) ? first(url) : page())));
    expect(maintenance).toBeInstanceOf(BoardError);
    expect((maintenance as Error).message).toBe(structure);
    expect(await listSince('2027-01-01', board(PINNED, REGULAR))).toEqual([]);
  });
});

describe('bodyOf', () => {
  const dir = () => mkdtempSync(join(tmpdir(), 'cse-cache-'));

  it('본문 영역이 있는 페이지만 보관하고, 다음에는 보관한 것을 쓴다', async () => {
    const d = dir();
    const get = vi.fn<Get>(async () => view('<p>■ 접수기간: 11/3 ~ 11/14</p>'));
    expect(await bodyOf(228201, get, d)).toEqual({ lines: ['■ 접수기간: 11/3 ~ 11/14'], fetched: true });
    expect(existsSync(join(d, '228201.html'))).toBe(true);
    expect(await bodyOf(228201, get, d)).toEqual({ lines: ['■ 접수기간: 11/3 ~ 11/14'], fetched: false });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(viewUrl(228201));
  });

  it('본문 영역이 없거나 받지 못하면 보관하지 않는다', async () => {
    const d = dir();
    expect(await bodyOf(1, async () => '<html><body>오류</body></html>', d)).toEqual({ lines: null, fetched: true });
    expect(await bodyOf(2, async () => { throw new Error('timeout'); }, d)).toEqual({ lines: null, fetched: false });
    expect(existsSync(join(d, '1.html')) || existsSync(join(d, '2.html'))).toBe(false);
  });

  it('.tmp에 다 쓴 뒤 이름을 바꿔서, 쓰다 실패하면 반쪽 보관 파일이 남지 않는다', async () => {
    const d = dir();
    mkdirSync(join(d, '3.html.tmp')); // .tmp 자리에 폴더가 있으면 쓰기가 실패한다
    await expect(bodyOf(3, async () => view('<p>본문</p>'), d)).rejects.toThrow();
    expect(existsSync(join(d, '3.html'))).toBe(false);
    expect(await bodyOf(4, async () => view('<p>본문</p>'), d)).toEqual({ lines: ['본문'], fetched: true });
    expect(existsSync(join(d, '4.html.tmp'))).toBe(false);
  });
});

describe('makeGet', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('요청 사이를 띄우고, 저장소 주소만 담은 이름을 보내고, 2xx가 아니면 실패한다', async () => {
    const seen: (string | null)[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      seen.push(new Headers(init.headers).get('User-Agent'));
      return new Response(url.endsWith('bad') ? 'no' : 'ok', { status: url.endsWith('bad') ? 500 : 200 });
    }));
    const get = makeGet(60);
    const start = Date.now();
    expect(await get('https://example.test/a')).toBe('ok');
    expect(await get('https://example.test/b')).toBe('ok');
    expect(Date.now() - start).toBeGreaterThanOrEqual(55);
    await expect(get('https://example.test/bad')).rejects.toThrow('500');
    expect(seen.every(ua => ua === USER_AGENT)).toBe(true);
    expect(USER_AGENT).toContain('https://github.com/zest-sw/ssa-kingo-companion');
    expect(USER_AGENT).not.toContain('@');
  });
});
