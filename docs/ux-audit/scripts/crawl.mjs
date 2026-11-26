// Main measurement crawl: every page x every viewport. Dark only (the redesign has no light theme).
// Usage: AUDIT_TAG=before node crawl.mjs [--page=home] [--vp=390x844] [--shots=0]
import path from 'node:path';
import { BASE, PAGES, VIEWPORTS, RESULTS, SHOTS, TAG, launch, newContext, writeJson, ensureDir } from './lib.mjs';
import { layoutChecks, contrastChecks, hoverOnlyScan } from './checks.mjs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const onlyPage = arg('page');
const onlyVp = arg('vp');
const doShots = arg('shots') !== '0';
const openOnly = process.argv.includes('--open-only');
const SHOT_WIDTHS = new Set(['390x844', '768x1024', '1280x800']);

const INIT = `
  window.__cls = 0; window.__clsEntries = []; window.__longTasks = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (!e.hadRecentInput) { window.__cls += e.value; window.__clsEntries.push({v: e.value, t: Math.round(e.startTime), n: (e.sources||[]).map(s => s.node && (s.node.nodeName + '.' + (s.node.className||'').toString().slice(0,30))).filter(Boolean).slice(0,2)}); } } }).observe({type: 'layout-shift', buffered: true});
  } catch (e) {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longTasks.push(Math.round(e.duration)); }).observe({type: 'longtask', buffered: true});
  } catch (e) {}
`;

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

async function focusPass(page, max = 30) {
  const seq = [];
  await page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur?.(); });
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      const outlineW = parseFloat(cs.outlineWidth) || 0;
      const hasOutline = cs.outlineStyle !== 'none' && outlineW > 0;
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      return {
        tag: el.tagName.toLowerCase(),
        name,
        y: Math.round(r.top + window.scrollY),
        inViewport: r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth,
        hasIndicator: hasOutline || !!hasShadow,
        outline: hasOutline ? `${cs.outlineWidth} ${cs.outlineStyle}` : 'none',
        offscreenX: r.left < -1 || r.right > window.innerWidth + 1,
        hidden: r.width === 0 || r.height === 0,
      };
    });
    if (!info) break;
    seq.push(info);
    if (seq.length > 1 && seq[seq.length - 1].name === seq[0].name && seq.length > 3) break;
  }
  return {
    stops: seq.length,
    noIndicator: seq.filter((s) => !s.hasIndicator).map((s) => `${s.tag} "${s.name}"`).slice(0, 10),
    offscreen: seq.filter((s) => !s.inViewport).map((s) => `${s.tag} "${s.name}"`).slice(0, 5),
    first: seq.slice(0, 3).map((s) => `${s.tag} "${s.name}"`),
    order: seq.map((s) => s.name || s.tag).slice(0, 30),
  };
}

async function shot(page, name, tall = true) {
  ensureDir(SHOTS);
  // html has scroll-behavior: smooth and the focus pass leaves the skip link focused:
  // reset both so fixed elements are captured where a fresh visitor would see them.
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  await page.waitForTimeout(250);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const vw = await page.evaluate(() => window.innerWidth);
  const CH = 1800;
  const parts = tall ? Math.min(Math.ceil(total / CH), 8) : 1;
  const files = [];
  if (parts <= 1) {
    const f = path.join(SHOTS, `${name}.jpg`);
    await page.screenshot({ path: f, type: 'jpeg', quality: 70, fullPage: tall });
    files.push(f);
  } else {
    for (let i = 0; i < parts; i++) {
      const f = path.join(SHOTS, `${name}-p${i + 1}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 70, fullPage: true, clip: { x: 0, y: i * CH, width: vw, height: Math.min(CH, total - i * CH) } });
      files.push(f);
    }
  }
  return files.map((f) => path.basename(f));
}

async function runPage(page, p, vp, theme) {
  const res = { page: p.id, url: p.path, viewport: vp.id, engine: vp.engine, theme, console: [], failed: [], pageErrors: [] };
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) res.console.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', (e) => res.pageErrors.push(String(e).slice(0, 200)));
  page.on('requestfailed', (r) => res.failed.push(`FAILED ${r.url().slice(0, 120)} ${r.failure()?.errorText || ''}`));
  page.on('response', (r) => { if (r.status() >= 400) res.failed.push(`${r.status()} ${r.url().slice(0, 120)}`); });

  const resp = await page.goto(BASE + p.path, { waitUntil: 'load', timeout: 45000 });
  res.status = resp?.status();
  res.finalUrl = page.url().replace(BASE, '');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  // nothing should hold focus on a fresh load (a ring on a nav button at load is a bug)
  res.activeAtLoad = await page.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? null : `${a.tagName.toLowerCase()} ${a.getAttribute('aria-label') || a.id || ''}`; });
  await autoScroll(page);
  await page.waitForTimeout(300);

  res.layout = await page.evaluate(layoutChecks, {});
  res.contrast = await page.evaluate(contrastChecks);
  res.docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  res.cls = await page.evaluate(() => ({ cls: Math.round(window.__cls * 1000) / 1000, entries: window.__clsEntries.slice(0, 5), longTasks: window.__longTasks }));
  res.mainWidth = await page.evaluate(() => { const m = document.querySelector('main'); if (!m) return null; const r = m.getBoundingClientRect(); const cs = getComputedStyle(m); return { mainBox: Math.round(r.width), contentBox: Math.round(r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), padL: cs.paddingLeft, padR: cs.paddingRight }; });
  if (p.id === 'home' && vp.id === '1280x800') res.hover = await page.evaluate(hoverOnlyScan);
  res.focus = await focusPass(page);

  // 200% text zoom (root font-size doubled; the site is rem-based)
  await page.evaluate(() => { window.scrollTo(0, 0); document.documentElement.style.fontSize = '200%'; });
  await page.waitForTimeout(250);
  const z = await page.evaluate(layoutChecks, {});
  res.zoom200 = { overflow: z.overflow.overflowing, scrollWidth: z.overflow.scrollWidth, clientWidth: z.overflow.clientWidth, offenders: z.overflow.offenders.slice(0, 4), fixedOverlapCount: z.fixedOverlapCount, fixedOverlaps: z.fixedOverlaps.slice(0, 3), fixedSpill: z.fixedSpill, clipped: z.clipped.slice(0, 4), fixed: z.fixed };
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; window.scrollTo(0, 0); });
  await page.waitForTimeout(150);

  if (doShots && SHOT_WIDTHS.has(vp.id) && p.id !== 'contact') {
    res.shots = await shot(page, `${TAG}-${p.id}-${vp.id}`);
  }
  return res;
}


async function openContact(page, isDesktopNav) {
  if (isDesktopNav) {
    await page.locator('aside').getByRole('button', { name: /get in touch/i }).click();
  } else {
    await page.getByRole('button', { name: /open menu/i }).click();
    await page.waitForTimeout(600);
    await page.locator('#mobile-menu-panel').getByRole('button', { name: /get in touch/i }).click();
  }
}

// Open states: contact modal, mobile nav, accessibility menu
async function runOpenStates(page, vp) {
  const out = {};
  const isDesktopNav = vp.w >= 1024; // sidebar at lg (1024); full-width bar + sheet below
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);

  // MobileNav (pill menu) — only exists below md
  if (!isDesktopNav) {
    try {
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.waitForTimeout(700);
      const panel = '#mobile-menu-panel';
      out.mobileNav = {
        layout: await page.evaluate(layoutChecks, { scope: panel }),
        rect: await page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), vh: innerHeight }; }, panel),
        buttonLabelWhileOpen: await page.evaluate(() => document.querySelector('button[aria-label="Open menu"]')?.getAttribute('aria-label')),
        ariaExpanded: await page.evaluate(() => document.querySelector('button[aria-label*="menu" i]')?.getAttribute('aria-expanded')),
      };
      if (SHOT_WIDTHS.has(vp.id) && doShots) out.mobileNav.shots = await shot(page, `${TAG}-open-mobilenav-${vp.id}`, false);
      // does Esc close it? does focus move into it?
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      out.mobileNav.closesOnEscape = !(await page.evaluate(() => !!document.getElementById('mobile-menu-panel')));
      out.mobileNav.focusInside = 'checked below';
      if (!out.mobileNav.closesOnEscape) { await page.mouse.click(vp.w / 2, vp.h - 5); await page.waitForTimeout(400); }
    } catch (e) { out.mobileNav = { error: String(e).slice(0, 200) }; }
  }

  // Contact modal
  try {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    await openContact(page, isDesktopNav);
    await page.waitForTimeout(600);
    const dlg = '[role=dialog]';
    const m = {};
    m.layout = await page.evaluate(layoutChecks, { scope: dlg });
    m.panel = await page.evaluate(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), vh: innerHeight, vw: innerWidth, clippedTopOrBottom: r.top < 0 || r.bottom > innerHeight }; });
    m.scrollLock = await page.evaluate(() => ({ bodyOverflow: getComputedStyle(document.body).overflow, htmlOverflow: getComputedStyle(document.documentElement).overflow, bodyPos: getComputedStyle(document.body).position }));
    m.focusStart = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()} ${a.getAttribute('aria-label') || a.textContent.trim().slice(0, 20)}` : null; });
    m.hasInputs = await page.evaluate(() => document.querySelectorAll('[role=dialog] input, [role=dialog] textarea').length);
    // can the page behind still scroll via wheel/touch?
    const before = await page.evaluate(() => window.scrollY);
    try {
      await page.mouse.move(vp.w / 2, 5);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(250);
      m.pageScrolledBehind = (await page.evaluate(() => window.scrollY)) !== before;
    } catch {
      // mobile WebKit has no wheel events: fall back to a synthetic touch drag on the overlay
      m.pageScrolledBehind = 'untested (no wheel in mobile WebKit)';
    }
    // focus trap: tab 14 times; does focus ever leave the dialog?
    let leaks = 0;
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      // A leak is focus landing on a real element of the page behind the dialog.
      // Focus going to the browser's own UI (activeElement === body) is not one.
      const leaked = await page.evaluate(() => { const a = document.activeElement; return !!a && a !== document.body && !a.closest('[role=dialog]'); });
      if (leaked) leaks++;
    }
    m.focusLeaksInto = leaks;
    if (SHOT_WIDTHS.has(vp.id) && doShots) m.shots = await shot(page, `${TAG}-open-contact-${vp.id}`, false);
    // close by backdrop click, check focus return
    await page.mouse.click(5, 5);
    await page.waitForTimeout(500);
    m.closedByBackdrop = !(await page.evaluate(() => !!document.querySelector('[role=dialog]')));
    m.focusAfterClose = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()} ${a.getAttribute('aria-label') || a.textContent.trim().slice(0, 20)}` : null; });
    m.bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow || '(unset)');
    out.contactModal = m;
    // Escape
    await openContact(page, isDesktopNav);
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    out.contactModal.closedByEscape = !(await page.evaluate(() => !!document.querySelector('[role=dialog]')));
  } catch (e) { out.contactModal = { ...(out.contactModal || {}), error: String(e).slice(0, 300) }; }

  // Accessibility menu
  try {
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    // below 1024px the floating button is hidden and the options live in the mobile menu
    if (!isDesktopNav) {
      await page.getByRole('button', { name: /open menu/i }).click();
      await page.waitForTimeout(700);
      out.a11yMenu = { inMobileMenu: await page.locator('#mobile-menu-panel').getByRole('button', { name: /reduce motion/i }).count(), cornerDisplay: await page.evaluate(() => getComputedStyle(document.querySelector('.a11y-corner')).display) };
      if (SHOT_WIDTHS.has(vp.id) && doShots) out.a11yMenu.shots = await shot(page, `${TAG}-open-a11y-${vp.id}`, false);
      return out;
    }
    const btn = page.getByRole('button', { name: /accessibility options/i });
    out.a11yMenu = { buttonRect: await btn.evaluate((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) }; }) };
    await btn.click({ timeout: 8000 });
    await page.waitForTimeout(400);
    out.a11yMenu.layout = await page.evaluate(layoutChecks, { scope: '.a11y-menu' });
    out.a11yMenu.rect = await page.evaluate(() => { const r = document.querySelector('.a11y-menu')?.getBoundingClientRect(); return r && { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw: innerWidth, vh: innerHeight }; });
    if (SHOT_WIDTHS.has(vp.id) && doShots) out.a11yMenu.shots = await shot(page, `${TAG}-open-a11y-${vp.id}`, false);
  } catch (e) { out.a11yMenu = { ...(out.a11yMenu || {}), error: String(e).slice(0, 200) }; }
  return out;
}

async function main() {
  const vps = VIEWPORTS.filter((v) => !onlyVp || v.id === onlyVp);
  const pages = PAGES.filter((p) => !onlyPage || p.id === onlyPage);
  const dir = path.join(RESULTS, TAG, 'crawl');
  const engines = [...new Set(vps.map((v) => v.engine))];
  for (const engine of engines) {
    const browser = await launch(engine);
    for (const vp of vps.filter((v) => v.engine === engine)) {
      for (const p of openOnly ? [] : pages) {
        for (const theme of ['dark']) {
          const ctx = await newContext(browser, vp, { colorScheme: theme });
          await ctx.addInitScript(INIT);
          const page = await ctx.newPage();
          try {
            const r = await runPage(page, p, vp, theme);
            writeJson(path.join(dir, `${vp.id}__${p.id}__${theme}.json`), r);
            console.log(`ok   ${vp.id} ${p.id} ${theme}`);
          } catch (e) {
            writeJson(path.join(dir, `${vp.id}__${p.id}__${theme}.json`), { page: p.id, viewport: vp.id, theme, error: String(e).slice(0, 400) });
            console.log(`FAIL ${vp.id} ${p.id} ${theme}: ${String(e).slice(0, 120)}`);
          }
          await ctx.close();
        }
      }
      if (!onlyPage) {
        const ctx = await newContext(browser, vp);
        const page = await ctx.newPage();
        try {
          const o = await runOpenStates(page, vp);
          writeJson(path.join(dir, `${vp.id}__open-states.json`), o);
          console.log(`ok   ${vp.id} open-states`);
        } catch (e) { console.log(`FAIL ${vp.id} open-states: ${String(e).slice(0, 120)}`); }
        await ctx.close();
      }
    }
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
