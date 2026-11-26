// Link health: collect every href from the rendered pages (+ MDX frontmatter links),
// check internal ones against the local server and external ones over the network.
// Links to arnavchandra.com are mapped to the local server — production is never contacted.
// LinkedIn 999 responses are ignored (it blocks bots).
import path from 'node:path';
import { BASE, PAGES, RESULTS, TAG, launch, writeJson } from './lib.mjs';
import fs from 'node:fs';

const browser = await launch('chromium');
const ctx = await browser.newContext();
const page = await ctx.newPage();

const routes = new Set(PAGES.filter((p) => p.id !== '404' && p.id !== 'contact').map((p) => p.path));
// every project page too
const projDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../content/projects');
for (const f of fs.readdirSync(projDir)) if (f.endsWith('.mdx') && !f.startsWith('_')) routes.add('/projects/' + f.replace('.mdx', ''));

const found = new Map(); // url -> Set(source pages)
for (const r of routes) {
  await page.goto(BASE + r, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(400);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
  const srcs = await page.evaluate(() => [...document.querySelectorAll('iframe[src], embed[src], object[data]')].map((e) => e.src || e.data));
  for (const h of [...hrefs, ...srcs]) {
    if (!found.has(h)) found.set(h, new Set());
    found.get(h).add(r);
  }
}
await browser.close();

const results = [];
const LOCAL = new URL(BASE).origin;
async function check(url) {
  let target = url;
  const u = new URL(url);
  if (u.protocol === 'mailto:' || u.protocol === 'tel:') return { status: 'skip', note: u.protocol };
  if (u.hostname === 'arnavchandra.com' || u.hostname === 'www.arnavchandra.com') target = LOCAL + u.pathname + u.search; // never hit production
  const internal = target.startsWith(LOCAL);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 15000);
  try {
    let res = await fetch(target, { method: 'GET', redirect: 'follow', signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 (ux-audit link check)' } });
    return { status: res.status, internal, final: res.url !== target ? res.url.slice(0, 100) : undefined };
  } catch (e) {
    return { status: 'error', internal, note: String(e.cause?.code || e.message).slice(0, 60) };
  } finally { clearTimeout(t); }
}
const urls = [...found.keys()].filter((u) => !u.includes('#') || u.split('#')[0] !== BASE + '/');
const queue = [...new Set(urls.map((u) => u.split('#')[0]))];
const CONC = 6;
let i = 0;
await Promise.all(Array.from({ length: CONC }, async () => {
  while (i < queue.length) {
    const u = queue[i++];
    const r = await check(u);
    results.push({ url: u, ...r, from: [...found.get(u) || found.get(u + '#') || []].slice(0, 3) });
  }
}));
const bad = results.filter((r) => r.status !== 'skip' && !(typeof r.status === 'number' && r.status < 400) && !(r.status === 999 && /linkedin\.com/.test(r.url)));
const summary = { total: results.length, internal: results.filter((r) => r.internal).length, external: results.filter((r) => r.internal === false).length, bad: bad.length };
console.log(JSON.stringify(summary), '\n', bad.map((b) => `${b.status} ${b.url} <- ${b.from.join(',')} ${b.note || ''}`).join('\n'));
writeJson(path.join(RESULTS, TAG, 'links.json'), { summary, bad, all: results.sort((a, b) => String(a.status).localeCompare(String(b.status))) });
