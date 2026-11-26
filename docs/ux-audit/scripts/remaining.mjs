// What is still failing? Aggregates contrast, tap-target and zoom offenders across pages.
// Usage: node remaining.mjs [tag] [viewport]
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, PAGES } from './lib.mjs';

const tag = process.argv[2] || 'after';
const vp = process.argv[3] || '390x844';
const dir = path.join(RESULTS, tag, 'crawl');
const rows = PAGES.map((p) => JSON.parse(fs.readFileSync(path.join(dir, `${vp}__${p.id}__dark.json`), 'utf8')));

const agg = (fn) => {
  const m = new Map();
  for (const r of rows) for (const x of fn(r)) { const k = x; const e = m.get(k) || { n: 0, pages: new Set() }; e.n++; e.pages.add(r.page); m.set(k, e); }
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 14).map(([k, v]) => `${v.n}x ${k}  [${[...v.pages].slice(0, 4).join(',')}]`);
};
console.log('--- contrast');
console.log(agg((r) => r.contrast.fails.map((f) => `${f.el} "${f.text}" ${f.ratio}:${f.need} fg=${f.fg} bg=${f.bg}`)).join('\n'));
console.log('--- taps (not effective 44)');
console.log(agg((r) => r.layout.tapTargets.examples.filter((t) => t.effective44 === false || t.effective44 === undefined).map((t) => `${t.el.replace(/"[^"]*"/, '').trim()} ${t.w}x${t.h}`)).join('\n'));
console.log('--- zoom200 offenders');
console.log(agg((r) => r.zoom200.offenders.map((o) => `${o.el} ${o.left}->${o.right}`)).join('\n'));
console.log('--- zoom200 fixed overlaps');
console.log(agg((r) => r.zoom200.fixedOverlaps.map((o) => `${o.fixed.slice(0, 30)} over ${o.content.slice(0, 30)}`)).join('\n'));
console.log('--- headings');
console.log(rows.map((r) => `${r.page}: ${r.layout.headings.list.slice(0, 6).join(' | ')}`).join('\n'));
