/**
 * 자동 레이아웃 검사. 빌드 결과(vite preview)를 띄워 모든 경로 × 크기 × 학생 상태를 돌고, 걸린 것이 있으면 exit 1.
 *
 *   npm run audit:layout                         빌드 + 전체 검사
 *   npm run audit:layout -- --no-build           dist 를 그대로 쓴다
 *   npm run audit:layout -- --state new --size 1280x640 --route home
 *   npm run audit:layout -- --clean              스크린샷에 걸린 곳 표시(빨간 틀)를 그리지 않는다
 *
 * 결과: .qa/layout/<상태>/<크기>/<경로>.png, .qa/layout/report.json, .qa/layout/report.md
 * 검사 항목은 probe.js, 경로를 뽑는 법은 routes.mjs 에 있다.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { probe } from './probe.js';
import { writeReports } from './report.mjs';
import { findFreePort, waitForServer, withRetry } from './retry.mjs';
import { contextOf, routesFor } from './routes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, '.qa/layout');

/** 크기. break 는 '깨지지 않음'(가로 넘침·삐져나옴·겹침·콘솔 에러)만 본다 */
const SIZES = [
  { w: 1280, h: 640 }, { w: 1366, h: 650 }, { w: 1440, h: 700 }, { w: 1536, h: 730 }, { w: 1440, h: 900 }, { w: 1920, h: 960 },
  { w: 1024, h: 640, breakOnly: true }
];

/** 학생 상태: 실제 가입 인터뷰를 눌러서 만든다(화면이 바뀌면 여기서 먼저 실패한다). */
const STATES = {
  new: { label: '새 학생(멘토링)', make: async page => { await chip(page, '멘토링'); await finishOnboarding(page); } },
  unknown: { label: "새 학생('아직 모르겠어요')", make: async page => { await chip(page, '아직 모르겠어요'); await finishOnboarding(page); } },
  example: { label: '예시로 둘러보기', make: async page => { await page.getByRole('button', { name: '예시로 둘러보기', exact: true }).click(); } }
};

/** 주소 하나로 못 가는 단계(버튼을 눌러 넘어가는 화면). 경로 모양이 맞으면 그 경로 뒤에 단계별로 한 번 더 본다. */
const STEPS = [
  {
    match: /^recommend\/prepare\/[^/]+$/, steps: {
      draft: async page => { await toDraft(page); },
      apply: async page => { await toDraft(page); await click(page, '신청하러 가기'); },
      done: async page => { await finishPrep(page); }
    }
  },
  {
    match: /^activities\/records\/interview\/[^/]+$/, steps: {
      preview: async page => { await toPreview(page); },
      done: async page => { await toPreview(page); await saveRetro(page); }
    }
  }
];
/** 가입 인터뷰 화면(저장값이 없을 때 홈 자리). 상태 'onboarding' 으로 따로 본다. */
const ONBOARDING_STEPS = {
  '1-관심': async () => {},
  '2-시간': async page => { await chip(page, '멘토링'); await click(page, '다음'); },
  '3-목표': async page => { await chip(page, '멘토링'); await click(page, '다음'); await click(page, '다음'); },
  '4-끝': async page => { await chip(page, '멘토링'); await finishOnboarding(page); }
};

const args = parseArgs(process.argv.slice(2));

async function chip(page, name) { await page.getByRole('button', { name, exact: true }).click(); }
async function click(page, name) { await page.getByRole('button', { name, exact: true }).click(); }
async function clickIf(page, name) { const b = page.getByRole('button', { name, exact: true }); if (await b.count()) await b.first().click(); }
async function finishOnboarding(page) { await click(page, '다음'); await click(page, '다음'); await click(page, '이번 주 활동 보기'); }

/** 신청 준비: 초안 단계까지 */
async function toDraft(page) { await clickIf(page, '신청 준비 시작'); await click(page, '초안 보기'); await settle(page); }
/**
 * 신청 준비를 끝까지: 내가 할 일을 다 체크하고(밖에서 하는 일은 연 뒤 '했어요') 사이트를 연 뒤 '신청했어요'.
 * 새 탭은 열지 않는다(window.open·target=_blank 막기). 화면 쪽 동작은 그대로다.
 */
async function finishPrep(page) {
  await page.evaluate(() => {
    window.open = () => null;
    document.addEventListener('click', e => { if (e.target instanceof Element && e.target.closest('a[target=_blank]')) e.preventDefault(); }, true);
  });
  await clickIf(page, '신청 준비 시작');
  for (const box of await page.locator('.rec-items input[type=checkbox]:not(:checked):not(:disabled)').all()) await box.check();
  for (const link of await page.locator('.rec-items a[target=_blank]').all()) await link.click();
  for (const b of await page.getByRole('button', { name: '했어요', exact: true }).all()) await b.click();
  await click(page, '초안 보기'); await settle(page);
  await click(page, '신청하러 가기');
  await page.getByRole('button', { name: /^학교 사이트에서 신청하기/ }).click();
  await click(page, '신청했어요');
}
/** 회고 인터뷰: 첫 질문에 한 줄 쓰고 나머지는 넘겨 미리보기까지. 쓰던 초안이 있으면 거기서 이어 간다. */
async function toPreview(page) {
  const done = page.getByRole('heading', { name: '이렇게 남아요' });
  const field = page.locator('.iv-input');
  if (await field.count() && !(await field.inputValue()).trim()) await field.fill('발표 자료를 같이 정리했어요');
  for (let i = 0; i < 6 && !(await done.count()); i++) await page.locator('.iv-next').click();
  await done.waitFor();
}
/** 회고 저장: 에너지를 고르고 저장, 끝 장면이 뜰 때까지 */
async function saveRetro(page) {
  await page.getByRole('button', { name: /^더 생겼어요/ }).click();
  await click(page, '경험 카드 저장');
  await page.locator('.iv-done').waitFor({ timeout: 5000 });
}

/** 분석 중·초안 쓰는 중 같은 기다림이 끝나고, 폭을 재는 그림이 자리를 잡을 때까지 */
async function settle(page) {
  await page.waitForFunction(() => !document.querySelector('.ui-loading'), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await page.waitForTimeout(150);
}

function parseArgs(list) {
  const o = { build: true, clean: false, state: null, size: null, route: null, workers: 4, port: 4319 };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--no-build') o.build = false;
    else if (a === '--clean') o.clean = true;
    else if (a === '--state') o.state = list[++i].split(',');
    else if (a === '--size') o.size = list[++i].split(',');
    else if (a === '--route') o.route = new RegExp(list[++i]);
    else if (a === '--workers') o.workers = Number(list[++i]);
    else if (a === '--port') o.port = Number(list[++i]);
    else throw new Error(`모르는 옵션: ${a}`);
  }
  return o;
}

/** 라우트 표·저장값 복원·후보 고르기를 화면과 같은 코드로 불러온다(vite 로 .ts 를 읽는다). */
async function loadAppModules() {
  const server = await createServer({ root: ROOT, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const load = p => server.ssrLoadModule(p);
    return {
      router: await load('/src/app/router.ts'), settings: await load('/src/data/settings.ts'), storage: await load('/src/app/storage.ts'),
      candidates: await load('/src/domain/candidates.ts'), catalog: await load('/src/data/catalog.ts')
    };
  } finally { await server.close(); }
}

async function makeState(browser, base, key) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await withRetry(() => page.goto(base + '/'));
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await STATES[key].make(page);
  await page.waitForFunction(() => Object.keys(localStorage).some(k => /"onboarded":true/.test(localStorage.getItem(k) || '')), null, { timeout: 5000 });
  const storage = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  await ctx.close();
  return storage;
}

/**
 * 주소가 검사한 경로 그대로인가. 경로가 같고 검사 경로에 적은 상태(?open= 등)가 남아 있으면 같다.
 * 흐름 화면이 덧붙이는 상태(?step=draft)는 화면이 고른 것이라 주소가 바뀐 것으로 보지 않는다.
 */
function sameRoute(want, got) {
  const [wp, wq = ''] = want.split('?');
  const [gp, gq = ''] = got.split('?');
  const g = new URLSearchParams(gq);
  return wp === gp && [...new URLSearchParams(wq)].every(([k, v]) => g.get(k) === v);
}

// 파일 이름에 못 쓰는 글자(/ ? = &)는 _ 로 바꾼다. 'recommend?open=p-x' → 'recommend_open_p-x'
const slug = (path, step) => path.replace(/[/?=&]/g, '_') + (step ? `@${step}` : '');

async function runJob(browser, base, job) {
  const ctx = await browser.newContext({ viewport: { width: job.size.w, height: job.size.h }, reducedMotion: 'reduce' });
  // 경로마다 같은 저장값에서 시작한다(앞 경로에서 바뀐 상태가 넘어오지 않게).
  await ctx.addInitScript(store => {
    if (sessionStorage.getItem('audit:seeded')) return;
    localStorage.clear(); sessionStorage.clear();
    for (const [k, v] of Object.entries(store)) localStorage.setItem(k, v);
    sessionStorage.setItem('audit:seeded', '1');
  }, job.storage);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e.message || e)));
  let issues = [];
  let retries = 0;
  try {
    // 탐색·로드만 다시 시도한다. 레이아웃 판정은 한 번만 한다.
    retries = await withRetry(async n => {
      if (n) await page.waitForTimeout(500 * n);
      await page.goto(`${base}/#/${job.path}`);
      await settle(page);
    });
    if (job.step) { await job.run(page); await settle(page); }
    issues = await page.evaluate(probe, { breakOnly: !!job.size.breakOnly });
    const hash = await page.evaluate(() => location.hash);
    if (!sameRoute(job.path, hash.slice(2))) issues.push({ k: 'route-changed', level: 'warn', el: `${job.path} → ${hash.slice(2)}` });
  } catch (e) {
    retries = e.retries ?? retries;
    issues.push({ k: 'run-error', level: 'fail', el: String(e.message || e).split('\n')[0].slice(0, 120) });
  }
  for (const e of errors) issues.push({ k: 'console-error', level: 'fail', el: e.slice(0, 120) });
  const shot = join(OUT, job.state, `${job.size.w}x${job.size.h}`, `${slug(job.path, job.step)}.png`);
  mkdirSync(dirname(shot), { recursive: true });
  if (!args.clean) await page.evaluate(markIssues, issues).catch(() => {});
  await page.screenshot({ path: shot }).catch(() => {});
  await ctx.close();
  return { ...job, issues, retries, shot: shot.slice(ROOT.length + 1).replace(/\\/g, '/') };
}

/** 스크린샷에 걸린 곳을 빨간(실패)·주황(경고) 틀과 번호로 그린다 */
function markIssues(list) {
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  list.forEach((o, i) => {
    if (!o.rect) return;
    const [x, y, w, h] = o.rect;
    const c = o.level === 'warn' ? '#f08c00' : '#e03131';
    const b = document.createElement('div');
    b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;outline:2px solid ${c};outline-offset:-1px`;
    const n = document.createElement('span');
    n.textContent = String(i + 1);
    n.style.cssText = `position:absolute;left:-2px;top:-14px;font:700 10px/12px sans-serif;color:#fff;background:${c};padding:0 3px`;
    b.append(n); layer.append(b);
  });
  document.body.append(layer);
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      done++;
      if (done % 25 === 0 || done === items.length) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  }));
  return out;
}

async function main() {
  if (args.build) {
    const r = spawnSync(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  const mods = await loadAppModules();
  const port = await findFreePort(args.port);
  if (port !== args.port) console.log(`포트 ${args.port} 사용 중 → ${port} 로 띄워요`);
  const server = await preview({ root: ROOT, logLevel: 'silent', preview: { port, strictPort: true, open: false } });
  const base = `http://localhost:${port}`;
  await waitForServer(base + '/');
  const browser = await chromium.launch();
  try {
    if (!args.route && !args.size && !args.state) rmSync(OUT, { recursive: true, force: true });
    const sizes = SIZES.filter(s => !args.size || args.size.includes(`${s.w}x${s.h}`));
    const jobs = [];
    const skipped = [];
    const stateKeys = Object.keys(STATES).filter(k => !args.state || args.state.includes(k));
    for (const key of stateKeys) {
      const storage = await makeState(browser, base, key);
      const raw = Object.values(storage).find(v => /"onboarded":true/.test(v));
      const { paths, skipped: sk } = routesFor(mods, join(ROOT, 'src/app/router.ts'), contextOf(mods, raw));
      skipped.push(...sk.map(s => ({ state: key, ...s })));
      for (const path of paths.filter(p => !args.route || args.route.test(p))) {
        for (const size of sizes) {
          jobs.push({ state: key, path, size, storage });
          for (const s of STEPS.filter(s => s.match.test(path))) for (const [step, run] of Object.entries(s.steps)) jobs.push({ state: key, path, size, storage, step, run });
        }
      }
    }
    if (!args.state || args.state.includes('onboarding')) {
      for (const size of sizes) for (const [step, run] of Object.entries(ONBOARDING_STEPS)) {
        if (!args.route || args.route.test('home')) jobs.push({ state: 'onboarding', path: 'home', size, storage: {}, step, run });
      }
    }
    console.log(`레이아웃 검사: 상태 ${stateKeys.length + (!args.state || args.state.includes('onboarding') ? 1 : 0)} · 크기 ${sizes.length} · 화면 ${jobs.length}개`);
    const results = await pool(jobs, args.workers, job => runJob(browser, base, job));
    const { fails, warns } = writeReports(OUT, results.map(({ storage, run, ...r }) => r), skipped, STATES);
    process.exitCode = fails ? 1 : 0;
    console.log(fails ? `\n실패 ${fails}건, 경고 ${warns}건. 자세한 표: .qa/layout/report.md` : `\n통과(경고 ${warns}건). 표: .qa/layout/report.md`);
  } finally {
    await browser.close();
    await new Promise(r => server.httpServer.close(r));
  }
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
