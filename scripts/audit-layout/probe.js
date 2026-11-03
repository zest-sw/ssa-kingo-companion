/**
 * 브라우저 안에서 도는 레이아웃 검사. page.evaluate(probe, opts) 로 넘기므로 바깥 변수를 쓰지 않는다(함수 하나로 직렬화된다).
 * 돌려주는 것: [{ k: 항목, level: 'fail'|'warn', d: 크기(px), el: 요소 이름, box?: 상자 이름, with?: 겹친 상대, rect: [x,y,w,h] }]
 *
 * 표시로 빼는 법(화면 코드에서)
 *   data-allow-overlap  의도된 겹침(차트 마커 위 이름표 등). 그 안의 요소는 겹침 검사에서 뺀다.
 *   data-fill           목록·지도처럼 남은 높이를 채우는 게 의도인 칸. 늘어난 빈 칸 검사에서 뺀다.
 *   data-audit-skip     검사 전체에서 뺀다(개발용 칸 등). 쓰면 이유를 주석으로 남긴다.
 */
export function probe(opts) {
  const { breakOnly = false } = opts || {};
  const out = [];
  const de = document.documentElement;
  const W = innerWidth, H = innerHeight;
  const add = (o, el) => {
    if (el) { const r = el.getBoundingClientRect(); o.rect = [r.left, r.top, r.width, r.height].map(Math.round); }
    out.push(o);
  };
  const OVERLAY = '[role=dialog],[role=tooltip],[role=alertdialog],.ui-toast-region,.app-skip,[data-audit-skip]';
  const cs = el => getComputedStyle(el);
  const name = el => {
    const t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || el.textContent || '';
    const s = t.trim().replace(/\s+/g, ' ').slice(0, 40);
    const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : (el.className && el.className.baseVal || '').split(' ')[0];
    return s ? s : `<${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}>`;
  };
  const tag = el => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ((el.className && el.className.baseVal) || '').trim().split(/\s+/)[0];
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
  };
  // aria-hidden 은 보이는 그림(타임라인 이름표 등)에도 붙으니 보임 판단에 쓰지 않는다. 읽기 전용 문장(.sr-only)만 뺀다.
  // 닫힌 <details> 의 내용, 넘침을 자르는 조상 밖으로 완전히 나간 요소(스크롤해야 보이는 목록 아래쪽 등)는 안 보이는 것으로 친다.
  /** el 안의 사각형 r(기본은 el 자체)이 넘침을 자르는 조상들에 잘리고 남은 보이는 부분. 다 가려지면 null */
  const clipRect = (el, r = el.getBoundingClientRect()) => {
    let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      // 본문 칸 스크롤은 최후 수단이라 '보이는 자리'로 치지 않는다(창 밖 버튼 검사가 잡게).
      if (p === SCROLL_ROOT) continue;
      const s = cs(p);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const q = p.getBoundingClientRect();
      box = { left: Math.max(box.left, q.left), top: Math.max(box.top, q.top), right: Math.min(box.right, q.right), bottom: Math.min(box.bottom, q.bottom) };
      if (box.right <= box.left || box.bottom <= box.top) return null;
    }
    return box;
  };
  /** 그려져 있는지(스크롤 칸에 가려졌는지는 따지지 않는다) */
  const drawn = el => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (el.closest('.sr-only')) return false;
    const d = el.closest('details:not([open])');
    if (d && !el.closest('summary')) return false;
    const s = cs(el);
    return !(s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) <= 0.05);
  };
  /** 지금 화면에서 조금이라도 보이는지 */
  const vis = el => drawn(el) && !!clipRect(el);
  const isScroller = el => { const s = cs(el); return /(auto|scroll)/.test(s.overflowY + ' ' + s.overflowX); };
  const isClipper = el => { const s = cs(el); return s.overflowY !== 'visible' || s.overflowX !== 'visible'; };
  const SCROLL_ROOT = document.querySelector('[data-scroll-root]');
  const main = SCROLL_ROOT || document.querySelector('main') || document.body;
  const inter = (a, b) => [Math.min(a.right, b.right) - Math.max(a.left, b.left), Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)];

  // a) 페이지·본문 칸 스크롤. 본문 칸 스크롤은 600px 미만 높이에서만 허용되는 최후 수단이다.
  if (de.scrollWidth > W + 1) add({ k: 'page-hscroll', level: 'fail', d: de.scrollWidth - W, el: 'document' });
  if (!breakOnly && de.scrollHeight > H + 1) add({ k: 'page-scroll', level: 'fail', d: de.scrollHeight - H, el: 'document' });
  if (SCROLL_ROOT) {
    if (SCROLL_ROOT.scrollWidth > SCROLL_ROOT.clientWidth + 1) add({ k: 'page-hscroll', level: 'fail', d: SCROLL_ROOT.scrollWidth - SCROLL_ROOT.clientWidth, el: '본문 칸' });
    if (!breakOnly && SCROLL_ROOT.scrollHeight > SCROLL_ROOT.clientHeight + 1) add({ k: 'page-scroll', level: 'fail', d: SCROLL_ROOT.scrollHeight - SCROLL_ROOT.clientHeight, el: '본문 칸' });
  }

  const all = [...main.querySelectorAll('*')].filter(el => !el.closest(OVERLAY) && vis(el));
  const inSvg = el => el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg';

  // 테두리나 그림자가 있는 둥근 상자 = 카드·패널
  const hasEdge = s => {
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const border = sides.some(x => parseFloat(s['border' + x + 'Width']) > 0 && !/rgba\(0, 0, 0, 0\)|transparent/.test(s['border' + x + 'Color']));
    return border || s.boxShadow !== 'none';
  };
  const boxes = all.filter(el => {
    if (inSvg(el) || !el.children.length) return false;
    const s = cs(el), r = el.getBoundingClientRect();
    return hasEdge(s) && parseFloat(s.borderTopLeftRadius) > 0 && r.height > 60 && r.width > 120 && !el.matches('button,a,input,select,textarea,[role=button]');
  });
  const boxSet = new Set(boxes);
  const nearestBox = el => { let p = el.parentElement; while (p && p !== main) { if (boxSet.has(p)) return p; p = p.parentElement; } return null; };
  // el 과 상자 사이(상자 제외)에 넘친 걸 자르거나 스크롤하는 칸이 있는지
  const clippedBetween = (el, b) => { let p = el.parentElement; while (p && p !== b) { if (isClipper(p)) return true; p = p.parentElement; } return false; };

  // b) 카드·패널 밖으로 삐져나온 요소. 가장 가까운 상자만 기준으로, 바깥쪽 요소 하나만 적는다.
  const escaped = new Set();
  {
    for (const el of all) {
      if (inSvg(el)) continue;
      const b = nearestBox(el);
      if (!b || isClipper(b) || clippedBetween(el, b)) continue;
      if ([...escaped].some(x => x.contains(el))) continue;
      const s = cs(el);
      if (s.position === 'fixed') continue;
      const br = b.getBoundingClientRect(), r = el.getBoundingClientRect();
      const d = Math.max(r.bottom - br.bottom, br.top - r.top, r.right - br.right, br.left - r.left);
      if (d > 2) { escaped.add(el); add({ k: 'escapes-box', level: 'fail', d: Math.round(d), el: name(el), box: tag(b) }, el); }
    }
  }

  // c) overflow hidden 으로 잘린 내용(말줄임·line-clamp 는 따로 '말줄임' 경고로)
  const ellipsisOn = s => s.textOverflow === 'ellipsis' || /\d/.test(s.webkitLineClamp || '');
  for (const el of all) {
    if (inSvg(el)) continue;
    const s = cs(el);
    const y = (s.overflowY === 'hidden' || s.overflowY === 'clip') && el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 12;
    const x = (s.overflowX === 'hidden' || s.overflowX === 'clip') && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 24;
    if (!y && !x) continue;
    if (ellipsisOn(s)) {
      if (!breakOnly && el.textContent.trim()) add({ k: 'truncated', level: 'warn', d: x ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight, el: name(el) }, el);
      continue;
    }
    if (!breakOnly) add({ k: y ? 'clipped-y' : 'clipped-x', level: 'fail', d: y ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth, el: name(el), box: tag(el) }, el);
  }
  // c2) SVG 는 기본으로 자기 상자 밖을 자른다. 그림 조각이 svg 사각형 밖으로 나가면 잘린 것이다.
  for (const svg of main.querySelectorAll('svg')) {
    if (svg.closest(OVERLAY) || !vis(svg) || cs(svg).overflow === 'visible' || svg.closest('button') && svg.getBoundingClientRect().width < 40) continue;
    const sr = svg.getBoundingClientRect();
    let worst = 0, who = null;
    for (const g of svg.querySelectorAll('text,circle,rect,ellipse,line,polyline,polygon,path,image,foreignObject')) {
      if (g.closest('defs,clipPath,mask,marker,pattern,symbol')) continue;
      const r = g.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const d = Math.max(r.bottom - sr.bottom, sr.top - r.top, r.right - sr.right, sr.left - r.left);
      if (d > worst) { worst = d; who = g; }
    }
    if (!breakOnly && worst > 1.5) add({ k: 'clipped-svg', level: 'fail', d: +worst.toFixed(1), el: name(who), box: tag(svg) }, svg);
  }

  // 글자 줄 사각형(줄바꿈된 글자는 줄마다). 상자 전체보다 정확하다. 스크롤 칸에 가려진 부분은 뺀다.
  const lineRects = el => {
    let list;
    if (el instanceof SVGElement) list = [el.getBoundingClientRect()];
    else { const rg = document.createRange(); rg.selectNodeContents(el); list = [...rg.getClientRects()]; }
    // 말줄임된 글자는 줄 사각형이 잘리기 전 폭이라, 자기 상자로도 자른다.
    const own = isClipper(el) ? el.getBoundingClientRect() : null;
    const cut = r => (own ? { left: Math.max(r.left, own.left), top: Math.max(r.top, own.top), right: Math.min(r.right, own.right), bottom: Math.min(r.bottom, own.bottom) } : r);
    return list.filter(r => r.width > 1 && r.height > 1).map(r => clipRect(el, cut(r))).filter(b => b && b.right > b.left && b.bottom > b.top);
  };
  const shown = el => clipRect(el);
  // 같은 항목의 두 조각(막대와 그 마감 표시처럼): 이름의 첫 토막(쉼표 앞)이 같으면 같은 항목이다.
  const itemOf = el => (el.getAttribute('aria-label') || '').split(',')[0].trim();
  const leaves = all.filter(el => !el.children.length && el.textContent.trim() && !el.matches('style,script,title,desc'));
  const allowOverlap = el => !!el.closest('[data-allow-overlap]');

  // d) 버튼·링크가 다른 글자·버튼과 겹침
  {
    const ctrls = all.filter(el => el.matches('button,a[href],input,select,textarea,[role=button],[role=tab],[role=switch]') && !allowOverlap(el) && !inSvg(el));
    const texts = leaves.filter(t => !t.closest('button,a[href],[role=button],[role=tab],[role=switch],label') && !allowOverlap(t));
    const seen = new Set();
    for (const c of ctrls) {
      const a = shown(c);
      if (!a) continue;
      // 차트 점 버튼과 그 점의 이름표처럼, 버튼 이름에 그 글자가 들어 있으면 버튼 자기 이름표다.
      const own = (c.getAttribute('aria-label') || '').replace(/\s+/g, ' ');
      for (const t of texts) {
        if (c.contains(t) || t.contains(c)) continue;
        const tt = t.textContent.trim().replace(/\s+/g, ' ');
        if (own && tt && own.includes(tt)) continue;
        const hit = lineRects(t).find(r => { const [ix, iy] = inter(a, r); return ix > 4 && iy > 4; });
        if (hit) { add({ k: 'overlap', level: 'fail', el: name(c), with: name(t) }, c); break; }
      }
      for (const o of ctrls) {
        if (o === c || c.contains(o) || o.contains(c)) continue;
        const key = [c, o].map(name).sort().join('|'); if (seen.has(key)) continue;
        if (itemOf(c) && itemOf(c) === itemOf(o)) continue;
        const b = shown(o); if (!b) continue;
        const [ix, iy] = inter(a, b);
        if (ix > 2 && iy > 2) { seen.add(key); add({ k: 'ctrl-overlap', level: 'fail', el: name(c), with: name(o) }, c); }
      }
    }
    // 글자끼리 겹침(차트 이름표 충돌 등)
    const tseen = new Set();
    for (let i = 0; i < texts.length; i++) {
      const ra = lineRects(texts[i]);
      for (let j = i + 1; j < texts.length; j++) {
        if (texts[i].contains(texts[j]) || texts[j].contains(texts[i])) continue;
        const rb = lineRects(texts[j]);
        if (ra.some(a => rb.some(b => { const [ix, iy] = inter(a, b); return ix > 3 && iy > 3; }))) {
          const key = name(texts[i]) + '|' + name(texts[j]); if (tseen.has(key)) continue; tseen.add(key);
          add({ k: 'text-overlap', level: 'fail', el: name(texts[i]), with: name(texts[j]) }, texts[i]);
        }
      }
    }
  }
  if (breakOnly) return dedupe(out);

  // e) 칸 안 스크롤이 아닌데 창 밖에 있는 버튼. 본문 칸 스크롤은 최후 수단이라 '칸 안'으로 치지 않는다.
  const innerScroller = el => { let p = el.parentElement; while (p && p !== SCROLL_ROOT && p !== document.body) { if (isScroller(p)) return true; p = p.parentElement; } return false; };
  for (const c of all.filter(el => el.matches('button,a[href],input,select,textarea,[role=button]'))) {
    if (innerScroller(c)) continue;
    const r = c.getBoundingClientRect();
    if (r.bottom > H + 1 || r.right > W + 1) add({ k: 'offscreen', level: 'fail', d: Math.round(Math.max(r.bottom - H, r.right - W)), el: name(c) }, c);
  }

  // f) 늘어난 빈 칸: 상자 안 내용(글자·그림·안쪽 상자) 위아래 빈 높이가 120px 넘거나 상자 높이의 40% 넘음
  const isContent = el => {
    if (el.tagName.toLowerCase() === 'svg' || el.matches('img,canvas,video,input,select,textarea,button,hr')) return true;
    if (inSvg(el)) return false;
    if (el.children.length) return false;
    if (el.textContent.trim()) return true;
    const s = cs(el);
    return s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none' || hasEdge(s);
  };
  for (const b of boxes) {
    if (b.closest('[data-fill]')) continue;
    const br = b.getBoundingClientRect();
    if (br.height < 100) continue;
    const s = cs(b);
    const top = br.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
    const bottom = br.bottom - parseFloat(s.borderBottomWidth) - parseFloat(s.paddingBottom);
    let lo = Infinity, hi = -Infinity;
    const walk = el => {
      for (const c of el.children) {
        // 스크롤 칸 아래로 가려진 내용도 내용이다(가려졌다고 빈 칸이 아니다).
        if (!drawn(c) || c.closest(OVERLAY)) continue;
        if (boxSet.has(c) || isContent(c)) { const r = c.getBoundingClientRect(); lo = Math.min(lo, r.top); hi = Math.max(hi, r.bottom); continue; }
        walk(c);
      }
    };
    walk(b);
    if (hi === -Infinity) continue;
    const gap = Math.max(0, lo - top) + Math.max(0, bottom - hi);
    const inner = bottom - top;
    if (gap > 120 || (gap > 48 && gap > inner * 0.4)) add({ k: 'stretched-empty', level: 'fail', d: Math.round(gap), el: tag(b), box: `${Math.round(gap / Math.max(inner, 1) * 100)}% 빔` }, b);
  }

  // g) 글자 크기
  for (const t of leaves) {
    if (inSvg(t)) continue;
    const fs = parseFloat(cs(t).fontSize);
    if (fs < 11) add({ k: 'tiny-text', level: 'fail', d: fs, el: name(t) }, t);
  }
  for (const t of main.querySelectorAll('svg text')) {
    if (!vis(t) || t.closest(OVERLAY)) continue;
    const fs = parseFloat(cs(t).fontSize);
    const m = t.getScreenCTM();
    const sc = m ? Math.hypot(m.a, m.b) : 1;
    if (fs * sc < 10.5) add({ k: 'tiny-text', level: 'fail', d: +(fs * sc).toFixed(1), el: name(t) }, t);
  }

  // h) 같은 차트 안 같은 이름표가 두 번. 숫자·날짜, 줄마다 되풀이되는 짧은 분야 이름(8자 미만)은 뺀다.
  //    줄마다 같은 이름이 나오는 게 의도인 차트는 data-allow-repeat 로 표시한다.
  const charts = [...main.querySelectorAll('.ui-dg,svg,figure,[role=img],[data-chart]')].filter(c => !c.parentElement.closest('.ui-dg,figure,[role=img],[data-chart]') && vis(c));
  for (const c of charts) {
    if (c.closest('[data-allow-repeat]')) continue;
    const count = new Map();
    for (const t of c.querySelectorAll('*')) {
      if (t.children.length || !vis(t)) continue;
      const s = t.textContent.trim().replace(/\s+/g, ' ');
      if (s.replace(/\s/g, '').length < 8 || /^[\d\s./:~\-월일주%·()]+$/.test(s)) continue;
      count.set(s, (count.get(s) || 0) + 1);
    }
    for (const [s, n] of count) if (n > 1) add({ k: 'dup-label', level: 'fail', d: n, el: s.slice(0, 40), box: name(c).slice(0, 24) }, c);
  }

  // 본문이 왼쪽에 몰리고 오른쪽 절반이 빈 화면: 맨 바깥 카드들이 본문 폭의 60% 안쪽에 왼쪽 정렬로만 있다(가운데 정렬은 의도로 본다).
  if (SCROLL_ROOT && W >= 1280) {
    const s = cs(SCROLL_ROOT), mr = SCROLL_ROOT.getBoundingClientRect();
    const left = mr.left + parseFloat(s.paddingLeft), right = mr.right - parseFloat(s.paddingRight);
    const outer = boxes.filter(b => !nearestBox(b));
    if (outer.length) {
      const l = Math.min(...outer.map(b => b.getBoundingClientRect().left)), r = Math.max(...outer.map(b => b.getBoundingClientRect().right));
      const width = right - left;
      if (r - l < width * 0.6 && l - left < width * 0.05) {
        out.push({ k: 'half-empty', level: 'fail', d: Math.round(right - r), el: `본문 폭의 ${Math.round((r - l) / width * 100)}%만 씀`, box: tag(outer[0]), rect: [Math.round(r), Math.round(mr.top), Math.round(right - r), Math.round(mr.height)] });
      }
    }
  }

  // 로딩 뼈대처럼 보이는 빈 상태: 로딩 중이 아닌데 글자 없는 회색 막대가 둘 이상(넓으면 하나) 있고, 같은 상자에 색 있는 데이터 막대가 없다.
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const neutralBar = el => {
    // 진행 막대의 빈 트랙(0 / 3)은 값이 0인 데이터라 뼈대가 아니다.
    if (el.textContent.trim() || el.closest('.ui-loading,[role=progressbar],[role=meter]') || inSvg(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.height < 4 || r.height > 20 || r.width < 40) return false;
    const [R, G, B, A = 1] = rgb(cs(el).backgroundColor);
    if (A < 0.3 || R === undefined) return false;
    const l = (R + G + B) / 3;
    return Math.max(R, G, B) - Math.min(R, G, B) < 14 && l > 180 && l < 250;
  };
  const colored = el => { const [R, G, B, A = 1] = rgb(cs(el).backgroundColor); return A >= 0.3 && R !== undefined && Math.max(R, G, B) - Math.min(R, G, B) >= 30; };
  const ghostIn = new Map();
  for (const el of all) {
    if (!neutralBar(el)) continue;
    const b = nearestBox(el) || main;
    ghostIn.set(b, [...(ghostIn.get(b) || []), el]);
  }
  for (const [b, bars] of ghostIn) {
    if (bars.length < 2 && bars[0].getBoundingClientRect().width < 120) continue;
    if ([...b.querySelectorAll('*')].some(x => x.getBoundingClientRect().height <= 24 && colored(x) && vis(x))) continue;
    const u = bars.map(x => x.getBoundingClientRect());
    const rect = [Math.min(...u.map(r => r.left)), Math.min(...u.map(r => r.top))];
    out.push({ k: 'skeleton-look', level: 'fail', d: bars.length, el: name(b).slice(0, 40), box: tag(b), rect: [...rect, Math.max(...u.map(r => r.right)) - rect[0], Math.max(...u.map(r => r.bottom)) - rect[1]].map(Math.round) });
  }

  // 말줄임 표시가 글자 끝에 박힌 것(스크립트로 자른 이름)
  for (const t of leaves) {
    const s = t.textContent.trim();
    if (/(…|\.\.\.)$/.test(s) && s.length > 6) add({ k: 'truncated', level: 'warn', el: s.slice(0, 40) }, t);
  }

  return dedupe(out);

  function dedupe(list) {
    const seen = new Set();
    return list.filter(o => { const key = o.k + '|' + o.el + '|' + (o.with || '') + '|' + (o.box || ''); if (seen.has(key)) return false; seen.add(key); return true; });
  }
}
