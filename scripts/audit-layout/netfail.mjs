/**
 * 페이지 콘솔 에러·요청 실패를 모아 실패와 경고로 나눈다. audit:layout 과 audit:copy 가 같이 쓴다.
 * 우리 앱 파일(같은 출처)이 안 오면 실패다. 바깥 출처(글꼴 CDN 등)가 안 오면 경고로만 센다:
 * CI 에서 cdn.jsdelivr.net 이 시간 초과되면 화면과 상관없이 검사가 떨어졌다(PR #78).
 */

const LOAD_FAILED = /^Failed to load resource\b/;

/** base 와 출처가 다른가. 주소를 못 읽으면 우리 것으로 본다(실패를 숨기지 않게) */
export function isForeign(url, base) {
  try { return new URL(url, base).origin !== new URL(base).origin; } catch { return false; }
}

/** 콘솔 에러 한 줄. 'Failed to load resource' 이고 그 주소가 바깥이면 경고, 나머지는 실패 */
export function classifyConsole(text, url, base) {
  if (LOAD_FAILED.test(text) && url && isForeign(url, base)) return 'warn';
  return 'fail';
}

/** 요청 실패 한 건. 바깥 출처는 경고, 우리 앱 파일은 실패 */
export function classifyRequest(url, base) {
  return isForeign(url, base) ? 'warn' : 'fail';
}

/**
 * page 에 귀를 단다. 같은 주소의 요청 실패와 콘솔 'Failed to load resource' 는 한 건으로 센다.
 * 돌려준 list() 는 { level, kind, text } 배열이다.
 */
export function watchPage(page, base) {
  const byUrl = new Map();
  const other = [];
  const add = (url, level, text) => {
    const key = url.split('#')[0];
    if (!byUrl.has(key)) byUrl.set(key, { level, text });
  };
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const text = m.text();
    const url = m.location?.()?.url ?? '';
    if (LOAD_FAILED.test(text) && url) add(url, classifyConsole(text, url, base), `${text} ${url}`);
    else other.push({ level: 'fail', text });
  });
  page.on('pageerror', e => other.push({ level: 'fail', text: String(e.message || e) }));
  page.on('requestfailed', r => {
    const url = r.url();
    add(url, classifyRequest(url, base), `${r.failure()?.errorText ?? '요청 실패'} ${url}`);
  });
  return {
    list: () => [
      ...other.map(o => ({ ...o, kind: 'console-error' })),
      ...[...byUrl.values()].map(o => ({ ...o, kind: o.level === 'warn' ? 'net-external' : 'console-error' }))
    ]
  };
}
