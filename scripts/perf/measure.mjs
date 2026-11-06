#!/usr/bin/env node
/**
 * 첫 화면 속도 재기(docs/qa/perf-2026-11-06.md). 빌드한 dist 를 작은 정적 서버로 띄우고 Playwright 로 잰다.
 *   node scripts/perf/measure.mjs --dist dist --label 나눈-뒤 [--port 6013] [--runs 3]
 * 1) 첫 덩어리: index.html 이 처음 받는 JS·CSS 크기(gzip)
 * 2) 홈 첫 그림: 새로 연 탭에서 홈 본문(.app-main > .os)이 붙을 때까지(ms). 학생 두 상태 × 네트워크(제한 없음, Fast 3G) × runs 번 평균
 * 3) 처음 가는 화면: 사이드바로 추천 → 내 활동 → 나의 분석 → 경험 지도 → 프로필. 뼈대가 보였는지, 누른 뒤 실제 화면까지(ms)
 * 4) --skeleton: 위 대신 경로마다 뼈대와 실제 화면 모양을 견준다(skeleton.mjs). --out 스크린샷 자리(기본 .qa/cap/skeleton)
 * 글꼴 CDN(Pretendard)은 막는다. 바깥 네트워크 흔들림이 숫자에 섞이지 않게.
 */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';
import { skeletonShapes } from './skeleton.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((o, a, i, l) => (a.startsWith('--') ? [...o, [a.slice(2), l[i + 1]]] : o), []));
const DIST = resolve(args.dist ?? 'dist');
const LABEL = args.label ?? DIST;
const PORT = Number(args.port ?? 6013);
const RUNS = Number(args.runs ?? 3);
const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.44 * 1024 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serve() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = join(DIST, path === '/' ? 'index.html' : path);
    if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(PORT, '127.0.0.1', () => r(server)));
}

/** index.html 이 바로 받는 JS·CSS(script, modulepreload, stylesheet) */
function firstLoad() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const files = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);
  const size = f => { const b = readFileSync(join(DIST, f)); return { raw: b.length, gz: gzipSync(b).length }; };
  const sum = ext => files.filter(f => f.endsWith(ext)).map(size).reduce((a, s) => ({ raw: a.raw + s.raw, gz: a.gz + s.gz }), { raw: 0, gz: 0 });
  const all = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js')).length;
  return { js: sum('.js'), css: sum('.css'), files: files.length, jsChunks: all };
}

const BASE = `http://127.0.0.1:${PORT}`;

async function newPage(browser, store, net) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.addInitScript(s => {
    if (s && !sessionStorage.getItem('perf:seeded')) {
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem('perf:seeded', '1');
    }
    // 홈 본문이 붙은 때, 뼈대가 보인 횟수
    window.__perf = { home: 0, skel: 0 };
    new MutationObserver(() => {
      if (!window.__perf.home && document.querySelector('.app-main > .os:not([data-screen-loading])')) window.__perf.home = performance.now();
      if (document.querySelector('[data-screen-loading][data-shown]')) window.__perf.skelNow = true;
      else if (window.__perf.skelNow) { window.__perf.skelNow = false; }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-shown'] });
    const tick = () => { if (window.__perf.skelNow && !window.__perf.counted) { window.__perf.skel++; window.__perf.counted = true; } if (!window.__perf.skelNow) window.__perf.counted = false; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, store);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (net) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', net);
  }
  return { ctx, page, errors };
}

/** 저장값: 새 학생(멘토링으로 가입 인터뷰를 마침), 예시 학생 */
async function makeStore(browser, kind) {
  const { ctx, page } = await newPage(browser, null, null);
  await page.goto(BASE + '/');
  const click = name => page.getByRole('button', { name, exact: true }).click();
  if (kind === 'example') await click('예시로 둘러보기');
  else { await click('멘토링'); await click('다음'); await click('다음'); await click('이번 주 활동 보기'); }
  await page.waitForFunction(() => Object.keys(localStorage).some(k => /"onboarded":true/.test(localStorage.getItem(k) || '')));
  const store = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  await ctx.close();
  return store;
}

async function homeTime(browser, store, net) {
  const { ctx, page, errors } = await newPage(browser, store, net);
  await page.goto(BASE + '/#/home');
  await page.waitForFunction(() => window.__perf.home > 0, null, { timeout: 60000 });
  // 첫 그림 기록(paint 항목)은 그린 다음 틀에 생긴다
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))));
  const t = await page.evaluate(() => ({
    home: window.__perf.home,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
  }));
  await ctx.close();
  return { ...t, errors };
}

const NAV_STEPS = [
  ['추천', p => p.locator('.app-nav a[href="#/recommend"]').click()],
  ['내 활동', p => p.locator('.app-nav a[href="#/activities"]').click()],
  ['나의 분석', p => p.locator('.app-nav a[href="#/analysis"]').click()],
  ['경험 지도', p => p.locator('a[href="#/analysis/map"]').first().click()],
  ['프로필', p => p.locator('.app-student').click()],
  // 다시 열 때: 같은 기록이면 지식 그래프 분석·배치를 다시 하지 않는다(memoRecent)
  ['나의 분석 다시', p => p.locator('.app-nav a[href="#/analysis"]').click()],
  ['경험 지도 다시', p => p.locator('a[href="#/analysis/map"]').first().click()]
];

/** 처음 가는 화면마다 뼈대가 보였는지와 실제 화면까지 걸린 시간. waitIdle 이면 홈에서 미리 받기가 끝날 만큼 잠깐 머문다 */
async function firstVisits(browser, store, net, waitIdle) {
  const { ctx, page, errors } = await newPage(browser, store, net);
  await page.goto(BASE + '/#/home');
  await page.waitForFunction(() => window.__perf.home > 0, null, { timeout: 60000 });
  if (waitIdle) await page.waitForTimeout(net ? 8000 : 1500);
  const out = [];
  for (const [label, go] of NAV_STEPS) {
    const before = await page.evaluate(() => window.__perf.skel);
    // 앞 화면 제목을 붙잡아 둔다. 주소가 바뀐 뒤에도 한 틀 동안은 앞 화면이 남아 있어서, 새 제목이 붙어야 다 그린 것으로 본다.
    const t0 = await page.evaluate(() => { window.__prevTitle = document.querySelector('[data-page-title]'); return performance.now(); });
    await go(page);
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-page-title]');
      return !!title && title !== window.__prevTitle && !document.querySelector('[data-screen-loading]');
    }, null, { timeout: 60000 });
    const t1 = await page.evaluate(() => performance.now());
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => window.__perf.skel);
    out.push({ label, ms: Math.round(t1 - t0), skeleton: after > before });
  }
  await ctx.close();
  return { steps: out, errors };
}

const avg = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

async function main() {
  const server = await serve();
  const browser = await chromium.launch();
  if ('skeleton' in args) {
    try {
      const stores = { new: await makeStore(browser, 'new'), example: await makeStore(browser, 'example') };
      console.log(JSON.stringify(await skeletonShapes(browser, stores, { BASE, DIST, OUT: resolve(args.out ?? '.qa/cap/skeleton') }), null, 2));
    } finally { await browser.close(); server.close(); }
    return;
  }
  const size = firstLoad();
  const result = { label: LABEL, size, home: {}, visits: {}, errors: [] };
  try {
    const stores = { new: await makeStore(browser, 'new'), example: await makeStore(browser, 'example') };
    for (const [netName, net] of [['제한 없음', null], ['Fast 3G', FAST_3G]]) {
      for (const [state, store] of Object.entries(stores)) {
        const runs = [];
        for (let i = 0; i < RUNS; i++) runs.push(await homeTime(browser, store, net));
        result.errors.push(...runs.flatMap(r => r.errors));
        result.home[`${netName}/${state}`] = { home: avg(runs.map(r => r.home)), fcp: avg(runs.map(r => r.fcp)), runs: runs.map(r => Math.round(r.home)) };
      }
    }
    for (const [name, net, idle] of [['제한 없음, 홈에서 잠깐 머묾', null, true], ['Fast 3G, 홈에서 잠깐 머묾', FAST_3G, true], ['Fast 3G, 홈이 뜨자마자 누름', FAST_3G, false]]) {
      const v = await firstVisits(browser, stores.example, net, idle);
      result.errors.push(...v.errors);
      result.visits[name] = v.steps;
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
