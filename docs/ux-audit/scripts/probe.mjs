// Debug helper: probe the effective hit area of controls matching a selector.
// Usage: node probe.mjs <path> <selector> [w] [h]
import { BASE, launch, newContext } from './lib.mjs';
const [p = '/', sel = 'button', w = '390', h = '844'] = process.argv.slice(2);
const b = await launch('chromium');
const ctx = await newContext(b, { w: +w, h: +h, engine: 'chromium', touch: true, mobile: true });
const page = await ctx.newPage();
await page.goto(BASE + p, { waitUntil: 'load' });
await page.waitForTimeout(800);
console.log(JSON.stringify(await page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const at = (x, y) => { const t = document.elementFromPoint(x, y); return t ? (t === el ? 'self' : el.contains(t) ? 'child' : t.tagName + '.' + String(t.className).slice(0, 24)) : 'none'; };
  const after = getComputedStyle(el, '::after');
  return { box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], L: at(cx - 21, cy), R: at(cx + 21, cy), T: at(cx, cy - 21), B: at(cx, cy + 21), after: [after.content, after.position, after.top, after.left] };
}), sel), null, 0));
await b.close();
