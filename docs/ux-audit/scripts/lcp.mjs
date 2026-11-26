// What is the LCP element on each page, and how heavy are the images/network?
// Usage: node lcp.mjs [/path ...]
import { BASE, launch, newContext } from './lib.mjs';
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/projects', '/books', '/health'];
const b = await launch('chromium');
for (const p of pages) {
  const ctx = await newContext(b, { w: 390, h: 844, engine: 'chromium', touch: true, mobile: true });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('response', async (r) => {
    try {
      const h = r.headers();
      reqs.push({ url: r.url().replace(BASE, '').slice(0, 110), type: h['content-type']?.split(';')[0], kb: Math.round((Number(h['content-length']) || 0) / 1024) });
    } catch {}
  });
  await page.addInitScript(`window.__lcp=null; new PerformanceObserver((l)=>{const e=l.getEntries().pop(); window.__lcp={t:Math.round(e.startTime), el:e.element&&(e.element.tagName+'.'+(e.element.className||'').toString().slice(0,40)), url:e.url&&e.url.slice(0,110), size:e.size};}).observe({type:'largest-contentful-paint',buffered:true});`);
  await page.goto(BASE + p, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  console.log(p, JSON.stringify(await page.evaluate(() => window.__lcp)));
  const big = reqs.filter((r) => r.kb >= 30 || /image|font/.test(r.type || '')).sort((a, b) => b.kb - a.kb).slice(0, 6);
  console.log('  heavy:', big.map((r) => `${r.kb}kb ${r.type} ${r.url}`).join(' | '));
  await ctx.close();
}
await b.close();
