// Does tapping the hamburger while the menu is open close it (or close then reopen)?
// Usage: AUDIT_BASE=http://localhost:3002 node menutoggle.mjs
import { BASE, launch, newContext } from './lib.mjs';
for (const engine of ['chromium', 'webkit']) {
  const b = await launch(engine);
  const ctx = await newContext(b, { w: 390, h: 844, touch: true, mobile: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const btn = page.locator('button[aria-controls="mobile-menu-panel"], button[aria-label="Open menu"], button[aria-label="Close menu"]').first();
  const open = async () => page.evaluate(() => !!document.getElementById('mobile-menu-panel'));
  await btn.tap();
  await page.waitForTimeout(500);
  const afterOpen = await open();
  await btn.tap();
  await page.waitForTimeout(700);
  const afterSecondTap = await open();
  // keyboard: Escape
  let afterEscape = null;
  if (!afterSecondTap) { await btn.tap(); await page.waitForTimeout(500); }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  afterEscape = await open();
  console.log(engine, JSON.stringify({ afterOpen, afterSecondTapStillOpen: afterSecondTap, afterEscapeStillOpen: afterEscape }));
  await b.close();
}
