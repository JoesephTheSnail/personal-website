// Home page shots (first screen + full page) at 390x844 and 1280x800.
// Usage: AUDIT_BASE=http://localhost:3001 node shots-home.mjs <name>
import path from 'node:path';
import { BASE, SHOTS, launch, newContext, ensureDir } from './lib.mjs';
const name = process.argv[2] || 'home';
ensureDir(SHOTS);
const b = await launch('webkit');
for (const vp of [{ id: '390x844', w: 390, h: 844, touch: true, mobile: true }, { id: '1280x800', w: 1280, h: 800, touch: false, mobile: false }]) {
  const ctx = await newContext(b, vp);
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); });
  await page.screenshot({ path: path.join(SHOTS, `${name}-home-${vp.id}-first-screen.jpg`), type: 'jpeg', quality: 70 });
  await ctx.close();
}
await b.close();
