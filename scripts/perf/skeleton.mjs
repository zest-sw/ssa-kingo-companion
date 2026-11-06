/**
 * 뼈대 모양 재기(measure.mjs --skeleton). 경로마다 화면 덩어리를 붙잡아 뼈대를 띄우고, 놓아준 뒤 실제 화면과 견준다.
 * - cls: 뼈대 → 실제 화면 사이 layout-shift 값 합(남아 있는 머리·사이드바가 움직였는지)
 * - title/tabs: 제목·구역 탭 줄 위치 차이(px)
 * - first: 본문 첫 덩어리(가장 바깥 1px 선 칸) 위치·폭 차이(px), cols: 첫 줄 칸 수(뼈대 / 실제)
 * 스크린샷: .qa/cap/skeleton/<상태>/<크기>/<경로>.png
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SKELETON_ROUTES = [
  'recommend', 'recommend/prepare/p-interview',
  'activities', 'activities/schedule', 'activities/records', 'activities/records/interview/a-hackathon',
  'analysis', 'analysis/techtree', 'analysis/map', 'analysis/flow', 'analysis/strengths',
  'profile', 'profile/friends', 'profile/recruit', 'profile/hall', 'settings'
];
const SIZES = [{ width: 1440, height: 900 }, { width: 1280, height: 640 }];

/** 화면 틀의 모양: 제목, 구역 탭, 본문 안 가장 바깥 1px 선 칸들 */
function shapeOf() {
  const os = document.querySelector('.app-main > .os');
  if (!os) return null;
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  // 머리·탭 줄을 뺀 나머지(추천 요약은 .os__body 없이 띠와 목록이 .os 바로 아래에 있다)
  const skip = el => el.matches('.ui-page-head, .ui-stabs, .ui-tabs, .rec-tabs, [role=status]');
  const boxed = el => { const s = getComputedStyle(el); return parseFloat(s.borderTopWidth) >= 1 && parseFloat(s.borderBottomWidth) >= 1 && parseFloat(s.borderTopLeftRadius) > 0 && el.getBoundingClientRect().height > 40; };
  const blocks = [];
  const walk = el => { for (const c of el.children) { if (boxed(c)) blocks.push(c); else walk(c); } };
  for (const c of os.children) if (!skip(c)) { if (boxed(c)) blocks.push(c); else walk(c); }
  const rects = blocks.map(r).filter(b => b.w > 0);
  const top = rects.length ? Math.min(...rects.map(b => b.y)) : 0;
  const firstRow = rects.filter(b => Math.abs(b.y - top) < 24);
  return {
    title: r(os.querySelector('.ui-page-head__title, .app-skel__bar--title')),
    tabs: r(os.querySelector(':scope > .ui-stabs, :scope > .ui-tabs, .rec-tabs')),
    first: rects.sort((a, b) => a.y - b.y || a.x - b.x)[0] ?? null,
    cols: firstRow.length
  };
}

const d = (a, b, k) => (a && b ? Math.abs(a[k] - b[k]) : null);

export async function skeletonShapes(browser, stores, { BASE, DIST, OUT }) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const first = new Set([...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]));
  const rows = [];
  const errors = [];
  for (const [state, store] of Object.entries(stores)) {
    for (const size of SIZES) {
      for (const path of SKELETON_ROUTES) {
        const ctx = await browser.newContext({ viewport: size });
        await ctx.route(/cdn\.jsdelivr\.net/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
        let release;
        const gate = new Promise(r => (release = r));
        // 첫 덩어리 밖의 JS·CSS 는 놓아줄 때까지 붙잡는다(미리 받기도 함께 멈춘다)
        await ctx.route(/\/assets\/.+\.(js|css)$/, async r => {
          const file = new URL(r.request().url()).pathname.slice(1);
          if (!first.has(file)) await gate;
          await r.continue();
        });
        await ctx.addInitScript(s => {
          if (!sessionStorage.getItem('perf:seeded')) { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('perf:seeded', '1'); }
          window.__cls = 0;
          new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput && window.__clsOn) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
        }, store);
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(`${path}: ${e.message}`));
        page.on('console', m => { if (m.type() === 'error') errors.push(`${path}: ${m.text()}`); });
        await page.goto(BASE + '/#/home');
        await page.waitForSelector('.app-main > .os:not([data-screen-loading])');
        await page.evaluate(p => { location.hash = '#/' + p; }, path);
        await page.waitForSelector('[data-screen-loading][data-shown]');
        const skel = await page.evaluate(shapeOf);
        const dir = join(OUT, state, `${size.width}x${size.height}`);
        mkdirSync(dir, { recursive: true });
        await page.screenshot({ path: join(dir, path.replaceAll('/', '_') + '.png') });
        await page.evaluate(() => { window.__clsOn = true; });
        release();
        await page.waitForFunction(() => !document.querySelector('[data-screen-loading]') && document.querySelector('[data-page-title]'), null, { timeout: 30000 });
        await page.waitForTimeout(400);
        const real = await page.evaluate(shapeOf);
        const cls = await page.evaluate(() => window.__cls);
        rows.push({
          state, size: `${size.width}x${size.height}`, path, cls: Number(cls.toFixed(4)),
          title: d(skel.title, real.title, 'y'), tabs: d(skel.tabs, real.tabs, 'y'),
          first: real.first && skel.first ? { y: d(skel.first, real.first, 'y'), x: d(skel.first, real.first, 'x'), w: d(skel.first, real.first, 'w') } : null,
          cols: `${skel.cols}/${real.cols}`
        });
        await ctx.close();
      }
    }
  }
  return { rows, errors };
}
