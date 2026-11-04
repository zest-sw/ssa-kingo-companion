/** 탐색·로드 단계의 일시 오류만 다시 시도한다. 레이아웃 판정(probe)은 여기 오지 않는다. */
import { createServer } from 'node:net';

export const MAX_RETRIES = 2;

const TRANSIENT = [/page\.goto: Timeout/i, /net::ERR_(CONNECTION_RESET|CONNECTION_REFUSED|CONNECTION_CLOSED|EMPTY_RESPONSE|TIMED_OUT|NETWORK_CHANGED)/i, /Navigation timeout/i, /Target page, context or browser has been closed/i];

export function isTransient(err) {
  const msg = String(err?.message ?? err);
  return TRANSIENT.some(re => re.test(msg));
}

/** fn 을 부른다. 일시 오류면 최대 max 번 더 부르고, 그 밖의 오류나 횟수 초과는 그대로 던진다. 다시 시도한 횟수를 돌려준다. */
export async function withRetry(fn, { max = MAX_RETRIES, onRetry } = {}) {
  for (let retries = 0; ; retries++) {
    try { await fn(retries); return retries; }
    catch (e) {
      if (retries >= max || !isTransient(e)) { e.retries = retries; throw e; }
      onRetry?.(e, retries + 1);
    }
  }
}

function canListen(port) {
  return new Promise(res => {
    const s = createServer();
    s.once('error', () => res(false));
    s.listen(port, () => s.close(() => res(true)));
  });
}

/** want 부터 차례로 훑어 비어 있는 첫 포트를 돌려준다(포트 충돌 대비). */
export async function findFreePort(want, span = 20) {
  for (let p = want; p < want + span; p++) if (await canListen(p)) return p;
  throw new Error(`빈 포트를 못 찾았어요 (${want}~${want + span - 1})`);
}

/** 서버가 응답할 때까지 기다린다. */
export async function waitForServer(url, { timeout = 15000, fetchFn = fetch } = {}) {
  const end = Date.now() + timeout;
  for (;;) {
    try { const r = await fetchFn(url); if (r.ok) return; } catch { /* 아직 안 떴다 */ }
    if (Date.now() > end) throw new Error(`서버가 ${timeout}ms 안에 응답하지 않았어요: ${url}`);
    await new Promise(r => setTimeout(r, 200));
  }
}
