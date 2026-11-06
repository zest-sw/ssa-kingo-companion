/**
 * 화면 문구 검사. 빌드 결과(vite preview)를 띄워 모든 경로 × 학생 상태(새 학생, 예시) × 1440×900 에서
 * 보이는 글자를 읽고 기호·금지어·가운뎃점 사슬을 찾는다(규칙: rules.mjs). 찾으면 exit 1. 모달·서랍은 열지 않는다.
 *
 *   npm run audit:copy                    빌드 + 전체 검사
 *   npm run audit:copy -- --no-build      dist 를 그대로 쓴다
 *   npm run audit:copy -- --state example --route '^home$'
 *
 * 결과: .qa/copy/report.md, .qa/copy/report.json. 경로 목록은 레이아웃 검사와 같은 표(scripts/audit-layout/routes.mjs)를 쓴다.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { findFreePort, waitForServer, withRetry } from '../audit-layout/retry.mjs';
import { contextOf, routesFor } from '../audit-layout/routes.mjs';
import { findCopyIssues, KIND_LABEL } from './rules.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, '.qa/copy');
const SIZE = { width: 1440, height: 900 };

const STATES = {
  new: { label: '새 학생(멘토링)', make: async page => { await click(page, '멘토링'); await click(page, '다음'); await click(page, '다음'); await click(page, '이번 주 활동 보기'); } },
  example: { label: '예시로 둘러보기', make: async page => { await click(page, '예시로 둘러보기'); } }
};

async function click(page, name) { await page.getByRole('button', { name, exact: true }).click(); }

function parseArgs(list) {
  const o = { build: true, state: null, route: null, port: 5312 };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === '--no-build') o.build = false;
    else if (a === '--state') o.state = list[++i].split(',');
    else if (a === '--route') o.route = new RegExp(list[++i]);
    else if (a === '--port') o.port = Number(list[++i]);
    else throw new Error(`모르는 옵션: ${a}`);
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));

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
  const ctx = await browser.newContext({ viewport: SIZE, reducedMotion: 'reduce' });
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
 * 브라우저 안: 보이는 글자를 직접 가진 요소마다 { text, sel, parent } 하나. parent 는 가장 가까운 위 후보의 번호다.
 * 화면 밖으로 숨긴 글(sr-only)은 1px 짜리라 뺀다.
 */
function collect() {
  const out = [];
  const index = new Map();
  const visible = el => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const sel = el => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      const cls = [...e.classList].find(c => !c.startsWith('is-'));
      parts.unshift(e.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return parts.join(' > ');
  };
  const walker = document.createTreeWalker(document.getElementById('root') ?? document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.currentNode; el; el = walker.nextNode()) {
    if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName)) continue;
    const own = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!own || !visible(el)) continue;
    let parent = -1;
    for (let p = el.parentElement; p; p = p.parentElement) if (index.has(p)) { parent = index.get(p); break; }
    index.set(el, out.length);
    // SVG 글자(그림 이름표)도 보이는 글자다. innerText 가 없어 textContent 를 쓴다
    out.push({ text: el instanceof HTMLElement ? el.innerText : el.textContent, sel: sel(el), parent });
  }
  return out;
}

/** 같은 문제를 위 요소가 이미 말했으면 아래 요소는 뺀다(바깥 요소 하나만 남긴다) */
function issuesOf(blocks) {
  const found = blocks.map(b => findCopyIssues(b.text));
  const list = [];
  blocks.forEach((b, i) => {
    for (const is of found[i]) {
      let dup = false;
      for (let p = b.parent; p >= 0 && !dup; p = blocks[p].parent) dup = found[p].some(o => o.kind === is.kind && o.hit === is.hit);
      if (!dup) list.push({ ...is, text: b.text.replace(/\s+/g, ' ').trim().slice(0, 80), sel: b.sel });
    }
  });
  return list;
}

const esc = s => String(s).replace(/\|/g, '\\|');

function writeReports(results) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  const total = results.reduce((n, r) => n + r.issues.length, 0);
  const byKind = {};
  for (const r of results) for (const i of r.issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1;
  const lines = [
    '# 화면 문구 검사', '',
    `상태 ${new Set(results.map(r => r.state)).size} · 경로 ${results.length}개 · 1440×900 · 걸린 곳 ${total}건 (${Object.entries(byKind).map(([k, n]) => `${KIND_LABEL[k]} ${n}`).join(', ') || '없음'})`, '',
    '## 경로별', '', '| 상태 | 경로 | 기호 | 금지어 | 가운뎃점 사슬 |', '|---|---|---:|---:|---:|'
  ];
  for (const r of results) {
    const n = k => r.issues.filter(i => i.kind === k).length || '';
    lines.push(`| ${r.state} | ${r.path} | ${n('symbol')} | ${n('banned')} | ${n('dots')} |`);
  }
  lines.push('', '## 걸린 글자', '', '| 상태 | 경로 | 종류 | 걸린 것 | 글자 | 요소 |', '|---|---|---|---|---|---|');
  for (const r of results) for (const i of r.issues) lines.push(`| ${r.state} | ${r.path} | ${KIND_LABEL[i.kind]} | ${esc(i.hit)} | ${esc(i.text)} | \`${esc(i.sel)}\` |`);
  if (results.some(r => r.error)) {
    lines.push('', '## 열지 못한 경로', '');
    for (const r of results.filter(r => r.error)) lines.push(`- ${r.state} ${r.path}: ${r.error}`);
  }
  writeFileSync(join(OUT, 'report.md'), lines.join('\n') + '\n');
  return { total, byKind };
}

function printTable(results) {
  const rows = results.filter(r => r.issues.length || r.error);
  if (!rows.length) return;
  const w = Math.max(...rows.map(r => r.path.length), 4);
  console.log(`\n${'상태'.padEnd(8)} ${'경로'.padEnd(w)}  기호 금지어 사슬`);
  for (const r of rows) {
    const n = k => String(r.issues.filter(i => i.kind === k).length).padStart(4);
    console.log(`${r.state.padEnd(8)} ${r.path.padEnd(w)} ${n('symbol')} ${n('banned')} ${n('dots')}${r.error ? '  (열지 못함)' : ''}`);
  }
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
  const results = [];
  try {
    for (const key of Object.keys(STATES).filter(k => !args.state || args.state.includes(k))) {
      const storage = await makeState(browser, base, key);
      const raw = Object.values(storage).find(v => /"onboarded":true/.test(v));
      const { paths } = routesFor(mods, join(ROOT, 'src/app/router.ts'), contextOf(mods, raw));
      const ctx = await browser.newContext({ viewport: SIZE, reducedMotion: 'reduce' });
      await ctx.addInitScript(store => {
        if (sessionStorage.getItem('audit:seeded')) return;
        localStorage.clear(); sessionStorage.clear();
        for (const [k, v] of Object.entries(store)) localStorage.setItem(k, v);
        sessionStorage.setItem('audit:seeded', '1');
      }, storage);
      for (const path of paths.filter(p => !args.route || args.route.test(p))) {
        const page = await ctx.newPage();
        const res = { state: key, path, issues: [] };
        try {
          await withRetry(() => page.goto(`${base}/#/${path}`));
          await page.waitForFunction(() => !document.querySelector('.ui-loading'), null, { timeout: 8000 }).catch(() => {});
          await page.evaluate(() => document.fonts.ready);
          res.issues = issuesOf(await page.evaluate(collect));
        } catch (e) { res.error = String(e.message || e).split('\n')[0].slice(0, 120); }
        results.push(res);
        await page.close();
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await new Promise(r => server.httpServer.close(r));
  }
  const { total, byKind } = writeReports(results);
  printTable(results);
  const kinds = Object.entries(byKind).map(([k, n]) => `${KIND_LABEL[k]} ${n}`).join(', ');
  console.log(total ? `\n걸린 곳 ${total}건 (${kinds}). 자세한 표: .qa/copy/report.md` : `\n통과(경로 ${results.length}개). 표: .qa/copy/report.md`);
  process.exitCode = total || results.some(r => r.error) ? 1 : 0;
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
