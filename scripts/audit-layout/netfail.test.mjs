import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { classifyConsole, classifyRequest, isForeign, watchPage } from './netfail.mjs';

const BASE = 'http://localhost:6111';
const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.12.woff2';
const CHUNK = `${BASE}/assets/analysis-abc.js`;

/** Playwright page 처럼 이벤트만 내는 가짜 */
function fakePage() {
  const page = new EventEmitter();
  return {
    page,
    console: (text, url = '') => page.emit('console', { type: () => 'error', text: () => text, location: () => ({ url }) }),
    failed: (url, errorText) => page.emit('requestfailed', { url: () => url, failure: () => ({ errorText }) }),
    pageerror: msg => page.emit('pageerror', new Error(msg))
  };
}

describe('audit 요청 실패 나누기', () => {
  it('출처가 다른지 본다', () => {
    expect(isForeign(FONT, BASE)).toBe(true);
    expect(isForeign(CHUNK, BASE)).toBe(false);
    expect(isForeign('/assets/x.js', BASE)).toBe(false);
    expect(isForeign('이상한 주소', 'http://[')).toBe(false);
  });

  it('글꼴 CDN 시간 초과는 경고, 우리 파일은 실패', () => {
    expect(classifyConsole('Failed to load resource: net::ERR_TIMED_OUT', FONT, BASE)).toBe('warn');
    expect(classifyConsole('Failed to load resource: net::ERR_TIMED_OUT', CHUNK, BASE)).toBe('fail');
    expect(classifyConsole('Failed to load resource: net::ERR_TIMED_OUT', '', BASE)).toBe('fail');
    expect(classifyConsole('TypeError: x is undefined', FONT, BASE)).toBe('fail');
    expect(classifyRequest(FONT, BASE)).toBe('warn');
    expect(classifyRequest(CHUNK, BASE)).toBe('fail');
  });

  it('같은 주소의 요청 실패와 콘솔 줄은 한 건으로 센다', () => {
    const f = fakePage();
    const w = watchPage(f.page, BASE);
    f.failed(FONT, 'net::ERR_TIMED_OUT');
    f.console('Failed to load resource: net::ERR_TIMED_OUT', FONT);
    expect(w.list()).toEqual([{ level: 'warn', kind: 'net-external', text: `net::ERR_TIMED_OUT ${FONT}` }]);
  });

  it('우리 앱 파일 실패와 스크립트 에러는 실패로 남는다', () => {
    const f = fakePage();
    const w = watchPage(f.page, BASE);
    f.console('Failed to load resource: the server responded with a status of 404 (Not Found)', CHUNK);
    f.failed(FONT, 'net::ERR_TIMED_OUT');
    f.pageerror('boom');
    const list = w.list();
    expect(list.filter(o => o.level === 'fail').map(o => o.kind)).toEqual(['console-error', 'console-error']);
    expect(list.filter(o => o.level === 'warn')).toHaveLength(1);
  });
});
