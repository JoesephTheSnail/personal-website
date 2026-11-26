// Verifies the second batch of animation fixes.
// Usage: AUDIT_BASE=http://localhost:3002 node motioncheck2.mjs
import { BASE, launch, newContext } from './lib.mjs';

const out = {};
const desktop = { w: 1280, h: 800, touch: false, mobile: false };
const phone = { w: 390, h: 844, touch: true, mobile: true };

// 1. hover motion only for a real mouse
for (const [label, vp] of [['desktop', desktop], ['phone', phone]]) {
  const b = await launch('chromium');
  const ctx = await newContext(b, vp);
  const page = await ctx.newPage();
  await page.goto(BASE + '/projects', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const row = page.locator('a.index-row').first();
  await row.hover();
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => getComputedStyle(document.querySelector('a.index-row .index-label')).transform);
  out[`hover ${label}: row label transform after hover`] = t;
  out[`hover ${label}: matches (hover:hover) and (pointer:fine)`] = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  await b.close();
}

// 2. cover strip: distance covered in 1s at the right edge, normal vs 6x CPU throttle
for (const [label, throttle] of [['normal', 1], ['cpu 6x slower', 6]]) {
  const b = await launch('chromium');
  const ctx = await newContext(b, desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + '/books', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (throttle > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
  const track = page.locator('.cover-track');
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.waitForTimeout(200);
  const before = await track.evaluate((e) => e.scrollLeft);
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.waitForTimeout(1000);
  const after = await track.evaluate((e) => e.scrollLeft);
  out[`strip scroll in 1s at max edge speed, ${label}`] = `${Math.round(after - before)}px (target about 132px/s)`;
  await b.close();
}

// 3. filter / sort fade
for (const [label, opts] of [['normal', {}], ['OS reduce', { reducedMotion: 'reduce' }]]) {
  const b = await launch('chromium');
  const ctx = await newContext(b, desktop, opts);
  const page = await ctx.newPage();
  await page.goto(BASE + '/projects', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => document.querySelector('.list-swap') ? 'has list-swap on load (bad)' : 'none on load (good)');
  await page.locator('.ledger-filter').nth(1).click();
  await page.waitForTimeout(40);
  const during = await page.evaluate(() => { const e = document.querySelector('.list-swap'); return e ? getComputedStyle(e).animationName + ' ' + getComputedStyle(e).animationDuration : 'missing'; });
  out[`projects filter swap (${label})`] = `${before}; after click: ${during}`;
  await page.goto(BASE + '/books', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Title A–Z' }).click();
  await page.waitForTimeout(40);
  out[`books sort swap (${label})`] = await page.evaluate(() => { const e = document.querySelector('.list-swap'); return e ? getComputedStyle(e).animationName : 'missing'; });
  await b.close();
}

// 4. hamburger crossfade, skip link, dialog overlay
{
  const b = await launch('chromium');
  const ctx = await newContext(b, phone);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const icons = () => page.evaluate(() => [...document.querySelectorAll('.menu-toggle svg')].map((s) => getComputedStyle(s).opacity));
  out['hamburger icons closed [bars, cross]'] = JSON.stringify(await icons());
  await page.getByRole('button', { name: /open menu/i }).tap();
  await page.waitForTimeout(500);
  out['hamburger icons open [bars, cross]'] = JSON.stringify(await icons());
  await b.close();
}
{
  const b = await launch('chromium');
  const ctx = await newContext(b, desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const rect = () => page.evaluate(() => { const r = document.querySelector('.skip-link').getBoundingClientRect(); return `top ${Math.round(r.top)} bottom ${Math.round(r.bottom)}`; });
  out['skip link unfocused'] = await rect();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  out['skip link focused'] = await rect();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  out['skip link after focus moves on'] = await rect();
  await page.locator('aside').getByRole('button', { name: /get in touch/i }).click();
  await page.waitForTimeout(30);
  out['dialog overlay 30ms after open'] = await page.evaluate(() => { const o = document.querySelector('.contact-modal-overlay'); const s = getComputedStyle(o); return `backdrop-filter ${s.backdropFilter}, opacity ${Number(s.opacity).toFixed(2)}`; });
  await page.waitForTimeout(600);
  out['dialog overlay settled'] = await page.evaluate(() => { const o = document.querySelector('.contact-modal-overlay'); const s = getComputedStyle(o); return `backdrop-filter ${s.backdropFilter}, opacity ${Number(s.opacity).toFixed(2)}`; });
  await b.close();
}

// 5. token in use
{
  const b = await launch('chromium');
  const ctx = await newContext(b, desktop);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  out['--ease-out token'] = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim());
  out['.rise timing function'] = await page.evaluate(() => getComputedStyle(document.querySelector('.rise')).animationTimingFunction);
  await b.close();
}

for (const [k, v] of Object.entries(out)) console.log(k.padEnd(58), v);
