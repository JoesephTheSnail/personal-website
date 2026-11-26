// Verifies the animation fixes in a real browser.
// Usage: AUDIT_BASE=http://localhost:3001 node motioncheck.mjs
import { BASE, launch, newContext } from './lib.mjs';

const results = {};
const phone = { w: 390, h: 844, touch: true, mobile: true };
const desktop = { w: 1280, h: 800, touch: false, mobile: false };

// Reads the computed motion of the pieces under test.
const probe = () => {
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const panel = document.getElementById('mobile-menu-panel');
  const dialog = document.querySelector('[role=dialog]');
  const item = panel?.querySelector('a');
  const preview = document.querySelector('.ledger-preview');
  const trio = document.querySelector('.proud-card img');
  return {
    panelAnim: panel ? cs(panel).animationName + ' ' + cs(panel).animationDuration + ' ' + cs(panel).animationTimingFunction : null,
    itemAnim: item ? cs(item).animationName + ' ' + cs(item).animationDuration + ' delay ' + cs(item).animationDelay : null,
    dialogTransform: dialog ? cs(dialog).transform : null,
    previewTransform: preview ? cs(preview).transform : null,
    trioTransform: trio ? cs(trio).transform : null,
  };
};

async function run(label, vp, { reducedMotion = 'no-preference', appSwitch = false } = {}) {
  const b = await launch('chromium');
  const ctx = await newContext(b, vp, { reducedMotion });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (appSwitch) await page.evaluate(() => document.documentElement.classList.add('reduce-motion'));
  const r = {};

  // entrance
  r.entrance = await page.evaluate(() => {
    const el = document.querySelector('.rise');
    const s = getComputedStyle(el);
    return `${s.animationName} ${s.animationDuration}`;
  });
  r.entranceMaxDelay = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.rise')].map((e) => parseFloat(getComputedStyle(e).animationDelay) * 1000)));

  // trio hover zoom
  if (!vp.touch) {
    const img = page.locator('.proud-card img').first();
    await img.scrollIntoViewIfNeeded();
    await img.hover();
    await page.waitForTimeout(700);
    r.trioHover = (await page.evaluate(probe)).trioTransform;
    r.trioDuration = await page.evaluate(() => getComputedStyle(document.querySelector('.proud-card img')).transitionDuration);
  }

  // portrait tilt
  if (!vp.touch) {
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
    await page.waitForTimeout(200);
    const photo = page.locator('header .relative.flex-shrink-0').first();
    const box = await photo.boundingBox();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.waitForTimeout(250);
    r.tiltOnMouseMove = await photo.evaluate((e) => e.style.transform || '(none)');
    await page.mouse.move(2, 2);
    await page.waitForTimeout(700);
  } else {
    const photo = page.locator('header .relative.flex-shrink-0').first();
    await photo.tap();
    await page.waitForTimeout(300);
    r.tiltAfterTap = await photo.evaluate((e) => e.style.transform || '(none)');
  }

  // menu (phone) and dialog
  if (vp.touch) {
    await page.getByRole('button', { name: /open menu/i }).tap();
    await page.waitForTimeout(700);
    r.menuOpen = (await page.evaluate(probe));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(40);
    r.menuClosingPanel = (await page.evaluate(probe)).panelAnim;
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /open menu/i }).tap();
    await page.waitForTimeout(600);
    await page.locator('#mobile-menu-panel').getByRole('button', { name: /get in touch/i }).tap();
  } else {
    await page.locator('aside').getByRole('button', { name: /get in touch/i }).click();
  }
  await page.waitForTimeout(800);
  r.dialogTransform = (await page.evaluate(probe)).dialogTransform;
  await b.close();
  results[label] = r;
}

if (!process.argv.includes('--desktop-only')) {
  await run('phone normal', phone);
  await run('phone OS reduce', phone, { reducedMotion: 'reduce' });
  await run('phone in-app reduce', phone, { appSwitch: true });
}
await run('desktop normal', desktop);
await run('desktop OS reduce', desktop, { reducedMotion: 'reduce' });
await run('desktop in-app reduce', desktop, { appSwitch: true });

// ledger preview: hover a row with artwork for the 5s dwell, normal vs reduced
for (const [label, opts] of [['normal', {}], ['OS reduce', { reducedMotion: 'reduce' }], ['in-app reduce', { appSwitch: true }]]) {
  const b = await launch('chromium');
  const ctx = await newContext(b, desktop, opts);
  const page = await ctx.newPage();
  await page.goto(BASE + '/projects', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (opts.appSwitch) await page.evaluate(() => document.documentElement.classList.add('reduce-motion'));
  await page.locator('a[href="/projects/carbon-capture-model"]').hover();
  await page.waitForTimeout(5800);
  results['preview ' + label] = { previewTransform: (await page.evaluate(probe)).previewTransform, opacity: await page.evaluate(() => getComputedStyle(document.querySelector('.ledger-preview')).opacity) };
  await b.close();
}

for (const [k, v] of Object.entries(results)) console.log(k.padEnd(24), JSON.stringify(v));
