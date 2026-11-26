// Sanity check: on a fresh load the fixed pill header sits at top 16px and does not overlap the h1.
// Usage: node pillcheck.mjs [path] [width] [height] [engine]
import path from 'node:path';
import { BASE, SHOTS, launch, newContext, ensureDir } from './lib.mjs';
const [p = '/', w = '390', h = '844', engine = 'webkit'] = process.argv.slice(2);
const b = await launch(engine);
const ctx = await newContext(b, { w: +w, h: +h, engine, touch: true, mobile: true });
const page = await ctx.newPage();
await page.goto(BASE + p, { waitUntil: 'load' });
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const pill = document.querySelector('div.fixed[class*="left-1/2"]');
  const h1 = document.querySelector('h1');
  const a = pill.getBoundingClientRect(), b = h1.getBoundingClientRect();
  return { scrollY: window.scrollY, pillTop: Math.round(a.top), pillBottom: Math.round(a.bottom), h1Top: Math.round(b.top), overlap: a.bottom > b.top };
});
console.log(JSON.stringify(r));
ensureDir(SHOTS);
await page.screenshot({ path: path.join(SHOTS, `after-home-fresh-${w}x${h}.jpg`), type: 'jpeg', quality: 70 });
await b.close();
