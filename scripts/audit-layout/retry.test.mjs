import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:net';
import { findFreePort, isTransient, withRetry } from './retry.mjs';

const timeout = () => new Error('page.goto: Timeout 30000ms exceeded.');

describe('audit-layout 다시 시도', () => {
  it('일시 오류만 일시 오류로 본다', () => {
    expect(isTransient(timeout())).toBe(true);
    expect(isTransient(new Error('page.goto: net::ERR_CONNECTION_RESET at http://x'))).toBe(true);
    expect(isTransient(new Error('locator.click: 버튼 없음'))).toBe(false);
  });

  it('한 번 실패 뒤 성공하면 1번 다시 시도했다고 알린다', async () => {
    const fn = vi.fn().mockRejectedValueOnce(timeout()).mockResolvedValue(undefined);
    expect(await withRetry(fn)).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('계속 실패하면 최대 2번 다시 시도하고(총 3번) 던진다', async () => {
    const fn = vi.fn().mockRejectedValue(timeout());
    await expect(withRetry(fn)).rejects.toMatchObject({ retries: 2 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('일시 오류가 아니면 다시 시도하지 않는다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('locator.click: 없음'));
    await expect(withRetry(fn)).rejects.toMatchObject({ retries: 0 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('쓰는 중인 포트면 다음 빈 포트를 준다', async () => {
    const s = createServer();
    await new Promise(r => s.listen(0, r));
    const used = s.address().port;
    const got = await findFreePort(used);
    s.close();
    expect(got).not.toBe(used);
  });
});
