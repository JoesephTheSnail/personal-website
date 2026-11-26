// Targeted hypotheses for the redesign: cursor + sound cost, reduced motion, book covers, ProjectLedger.
// Usage: AUDIT_TAG=before node special.mjs
import path from 'node:path';
import { BASE, RESULTS, SHOTS, TAG, launch, newContext, writeJson, ensureDir } from './lib.mjs';

const out = {};

// ---------- 1. cursor + sound ----------
const AUDIO_SPY = `
  window.__audio = { contexts: 0, oscillators: 0, bufferSources: 0, resumeCalls: 0, states: [] };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const Orig = AC;
    window.AudioContext = function (...a) {
      const c = new Orig(...a); window.__audio.contexts++;
      const co = c.createOscillator.bind(c); c.createOscillator = () => { window.__audio.oscillators++; return co(); };
      const cb = c.createBufferSource.bind(c); c.createBufferSource = () => { window.__audio.bufferSources++; return cb(); };
      const rs = c.resume.bind(c); c.resume = () => { window.__audio.resumeCalls++; return rs(); };
      return c;
    };
    window.AudioContext.prototype = Orig.prototype;
  }
  window.__frames = [];
`;

async function sweep(page, steps = 160) {
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => { window.__frames.push(t - last); last = t; if (window.__run !== false) requestAnimationFrame(loop); };
    window.__run = true; requestAnimationFrame(loop);
  });
  const vp = page.viewportSize();
  for (let i = 0; i < steps; i++) {
    const x = 330 + ((i * 17) % (vp.width - 360));
    const y = 120 + ((i * 29) % (vp.height - 160));
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  await page.evaluate(() => { window.__run = false; });
  const f = await page.evaluate(() => window.__frames.slice(2));
  f.sort((a, b) => a - b);
  return { frames: f.length, p50: Math.round(f[Math.floor(f.length * 0.5)] * 10) / 10, p95: Math.round(f[Math.floor(f.length * 0.95)] * 10) / 10, max: Math.round(f[f.length - 1] * 10) / 10 };
}

async function cdpMetrics(page) {
  const c = await page.context().newCDPSession(page);
  await c.send('Performance.enable');
  const get = async () => Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  return get;
}

{
  const browser = await launch('chromium');
  const res = {};
  for (const mode of ['fine-pointer', 'touch']) {
    const vp = mode === 'fine-pointer' ? { id: '1280x800', w: 1280, h: 800, engine: 'chromium', touch: false, mobile: false } : { id: '1024x768', w: 1024, h: 768, engine: 'chromium', touch: true, mobile: true };
    const ctx = await newContext(browser, vp);
    await ctx.addInitScript(AUDIO_SPY);
    const page = await ctx.newPage();
    await page.goto(BASE + '/projects', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    const r = { pointerFine: await page.evaluate(() => matchMedia('(pointer: fine)').matches), pointerCoarse: await page.evaluate(() => matchMedia('(pointer: coarse)').matches), hover: await page.evaluate(() => matchMedia('(hover: hover)').matches) };
    r.cursorDom = await page.evaluate(() => ({ fixedSvgs: [...document.querySelectorAll('body > svg, body > div')].filter((e) => getComputedStyle(e).position === 'fixed' && e.getAttribute('aria-hidden')).length, bodyCursor: getComputedStyle(document.body).cursor, linkCursor: getComputedStyle(document.querySelector('a')).cursor }));
    r.noCustomCursorOnTouch = mode === 'touch' ? r.cursorDom.bodyCursor !== 'none' : undefined;
    const get = await cdpMetrics(page);
    if (mode === 'fine-pointer') {
      const m0 = await get();
      r.sweep = await sweep(page);
      const m1 = await get();
      r.cpu = { taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000), styleMs: Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000), sweepMs: 160 * 16 + 160 * 2 };
      // idle cost with cursor mounted but no movement (rAF loop still running?)
      const i0 = await get();
      await page.waitForTimeout(3000);
      const i1 = await get();
      r.idle3s = { taskMs: Math.round((i1.TaskDuration - i0.TaskDuration) * 1000), scriptMs: Math.round((i1.ScriptDuration - i0.ScriptDuration) * 1000) };
      // sound: the redesign has no hover sounds (playHover removed); check hover, then a nav click, then a UI toggle
      await page.evaluate(() => { window.__audio = { contexts: 0, oscillators: 0, bufferSources: 0, resumeCalls: 0 }; });
      const tile = page.locator('a[href^="/projects/"]').first();
      await tile.hover();
      await page.waitForTimeout(300);
      r.soundOnHover = await page.evaluate(() => ({ ...window.__audio }));
      await page.getByRole('link', { name: /books/i }).first().click();
      await page.waitForTimeout(400);
      r.soundOnNavClick = await page.evaluate(() => ({ ...window.__audio }));
      r.localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
      r.soundToggleUi = await page.evaluate(() => /sound|mute|audio/i.test(document.body.innerText) || !!document.querySelector('[aria-label*="sound" i], [aria-label*="mute" i]'));
    } else {
      // touch: tap around, verify no custom-cursor work
      const get2 = get;
      const m0 = await get2();
      for (let i = 0; i < 20; i++) { await page.touchscreen.tap(400 + i * 5, 300); await page.waitForTimeout(30); }
      const m1 = await get2();
      r.cpuTaps = { taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000) };
      r.soundOnTap = await page.evaluate(() => ({ ...window.__audio }));
    }
    res[mode] = r;
    await ctx.close();
  }
  await browser.close();
  out.cursorSound = res;
}

// ---------- 2. reduced motion ----------
{
  const browser = await launch('chromium');
  const res = {};
  for (const reduced of ['no-preference', 'reduce']) {
    for (const [pid, p] of [['home', '/'], ['projects', '/projects']]) {
      for (const vp of [{ id: '1280x800', w: 1280, h: 800, engine: 'chromium', touch: false, mobile: false }, { id: '390x844', w: 390, h: 844, engine: 'chromium', touch: true, mobile: true }]) {
        const ctx = await newContext(browser, vp, { reducedMotion: reduced });
        const page = await ctx.newPage();
        await page.goto(BASE + p, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const r = await page.evaluate(() => {
          const anims = document.getAnimations();
          const running = anims.filter((a) => a.playState === 'running');
          const infinite = running.filter((a) => a.effect?.getComputedTiming().iterations === Infinity);
          let longTransitions = 0, longAnimations = 0, nEls = 0;
          for (const el of document.querySelectorAll('body *')) {
            nEls++;
            const cs = getComputedStyle(el);
            const td = cs.transitionDuration.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 0.001 : 1));
            if (td.some((d) => d > 0.05) && cs.transitionProperty !== 'none') longTransitions++;
            const ad = cs.animationDuration.split(',').map((s) => parseFloat(s) * (s.includes('ms') ? 0.001 : 1));
            if (cs.animationName !== 'none' && ad.some((d) => d > 0.05)) longAnimations++;
          }
          return { running: running.length, infinite: infinite.length, infiniteNames: infinite.slice(0, 3).map((a) => a.animationName || a.constructor.name), longTransitions, longAnimations, nEls };
        });
        res[`${reduced}|${pid}|${vp.id}`] = r;
        await ctx.close();
      }
    }
  }
  await browser.close();
  out.reducedMotion = res;
}

// ---------- 3. book covers: shift + failure ----------
{
  const browser = await launch('chromium');
  const vp = { id: '390x844', w: 390, h: 844, engine: 'chromium', touch: true, mobile: true };
  const res = {};
  for (const mode of ['normal', 'covers-blocked']) {
    const ctx = await newContext(browser, vp);
    await ctx.addInitScript(`window.__cls=0; new PerformanceObserver((l)=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});`);
    const page = await ctx.newPage();
    const imgReqs = [];
    page.on('response', (r) => { if (r.url().includes('/_next/image') || r.url().includes('media-amazon')) imgReqs.push(r.status()); });
    if (mode === 'covers-blocked') {
      await page.route(/\/_next\/image.*books/, (r) => r.abort());
      await page.route(/\/books\/[^/]+\.jpg/, (r) => r.abort());
    }
    await page.goto(BASE + '/books', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const covers = imgs.filter((i) => /Cover of/.test(i.alt));
      return {
        covers: covers.length,
        loaded: covers.filter((i) => i.complete && i.naturalWidth > 0).length,
        failed: covers.filter((i) => i.complete && i.naturalWidth === 0).length,
        cls: Math.round(window.__cls * 1000) / 1000,
        coverSrcHost: covers[0]?.currentSrc.slice(0, 80),
        boxStable: covers.slice(0, 3).map((i) => { const r = i.parentElement.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
        scrollW: document.documentElement.scrollWidth,
      };
    });
    r.imgRequestStatuses = imgReqs.reduce((a, s) => ((a[s] = (a[s] || 0) + 1), a), {});
    ensureDir(SHOTS);
    if (mode === 'covers-blocked') await page.screenshot({ path: path.join(SHOTS, `${TAG}-books-covers-blocked-390x844.jpg`), type: 'jpeg', quality: 65, clip: { x: 0, y: 0, width: 390, height: 844 } });
    res[mode] = r;
    await ctx.close();
  }
  await browser.close();
  out.bookCovers = res;
}


// ---------- 4. ProjectLedger: filter, touch/keyboard access, preview cost ----------
{
  const browser = await launch('chromium');
  const res = {};
  for (const [label, vp] of [['desktop', { id: '1280x800', w: 1280, h: 800, engine: 'chromium', touch: false, mobile: false }], ['phone', { id: '390x844', w: 390, h: 844, engine: 'chromium', touch: true, mobile: true }]]) {
    const ctx = await newContext(browser, vp);
    const page = await ctx.newPage();
    await page.goto(BASE + '/projects', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    const r = {};
    r.rows = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('a.index-row')];
      const sizes = rows.map((a) => { const b = a.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
      return { count: rows.length, minHeight: Math.min(...sizes.map((s) => s[1])), under44: sizes.filter((s) => s[1] < 44).length, noHref: rows.filter((a) => !a.getAttribute('href')).length };
    });
    r.filter = await page.evaluate(() => [...document.querySelectorAll('.ledger-filter')].map((b) => { const x = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 20), w: Math.round(x.width), h: Math.round(x.height), pressed: b.getAttribute('aria-pressed') }; }));
    // filter works?
    const before = await page.locator('a.index-row').count();
    await page.locator('.ledger-filter').nth(1).click();
    await page.waitForTimeout(200);
    r.filterBefore = before;
    r.filterAfter = await page.locator('a.index-row').count();
    r.filterPressed = await page.locator('.ledger-filter').nth(1).getAttribute('aria-pressed');
    await page.locator('.ledger-filter').first().click();
    // keyboard: focus a row with artwork (carbon-capture-model) and confirm the preview timer path
    const art = page.locator('a[href="/projects/carbon-capture-model"]');
    await art.focus();
    r.previewBefore = await page.evaluate(() => { const el = [...document.querySelectorAll('body > div[aria-hidden=true]')].find((d) => d.className.includes('pointer-events-none') && d.querySelector('img')); return el ? getComputedStyle(el).opacity : null; });
    if (label === 'desktop') {
      const c = await page.context().newCDPSession(page);
      await c.send('Performance.enable');
      const m0 = Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      await page.waitForTimeout(5600);
      const m1 = Object.fromEntries((await c.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      r.previewAfter5s = await page.evaluate(() => { const el = [...document.querySelectorAll('body > div[aria-hidden=true]')].find((d) => d.className.includes('pointer-events-none') && d.querySelector('img')); return el ? getComputedStyle(el).opacity : null; });
      r.previewCost = { taskMs: Math.round((m1.TaskDuration - m0.TaskDuration) * 1000), layoutMs: Math.round((m1.LayoutDuration - m0.LayoutDuration) * 1000) };
      r.previewImgs = await page.evaluate(() => [...document.querySelectorAll('body > div[aria-hidden=true] img')].map((i) => ({ src: (i.currentSrc || i.src).slice(-70), loading: i.loading, nat: [i.naturalWidth, i.naturalHeight] })));
    }
    // does a tap on a row navigate (touch)?
    if (label === 'phone') {
      await art.tap();
      await page.waitForTimeout(1200);
      r.tapNavigatesTo = page.url().replace(BASE, '');
      r.touchHasPreviewAccess = 'preview is hover/focus only: not reachable by touch (artwork also shown on the project page?)';
    }
    res[label] = r;
    await ctx.close();
  }
  await browser.close();
  out.ledger = res;
}

writeJson(path.join(RESULTS, TAG, 'special.json'), out);
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
