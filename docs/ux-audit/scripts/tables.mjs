// Print markdown tables comparing results/before and results/after (after optional).
// Usage: node tables.mjs
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, VIEWPORTS } from './lib.mjs';

const read = (tag, f) => { const p = path.join(RESULTS, tag, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
const lhB = read('before', 'lighthouse-mobile.json');
const lhA = read('after', 'lighthouse-mobile.json');
const sB = read('before', 'summary.json');
const sA = read('after', 'summary.json');

const fmt = (v, unit = '') => (v === null || v === undefined ? 'n/a' : `${v}${unit}`);
const ms = (v) => (v == null ? 'n/a' : `${(v / 1000).toFixed(2)}s`);

console.log('### Lighthouse (mobile, simulated slow 4G, median of 3 runs, production build)\n');
console.log('| Page | Perf | A11y | SEO | Best practices | LCP | CLS | TBT |');
console.log('|---|---|---|---|---|---|---|---|');
for (const id of Object.keys(lhB || {})) {
  const b = lhB[id].summary; const a = lhA?.[id]?.summary;
  if (!b || b.perf === 0) { console.log(`| ${id} | not measurable (route returns 404) | | | | | | |`); continue; }
  const cell = (k, f = (x) => x) => (a ? `${f(b[k])} → ${f(a[k])}` : f(b[k]));
  console.log(`| ${id} | ${cell('perf')} | ${cell('a11y')} | ${cell('seo')} | ${cell('bp')} | ${cell('lcp', ms)} | ${cell('cls')} | ${cell('tbt', (x) => x + 'ms')} |`);
}

console.log('\n### Per device (dark theme, 10 pages each; counts are summed over pages)\n');
console.log('| Viewport | Engine | Overflow pages | Taps <44px box (non-inline) | Taps <44px effective hit area | Inputs <16px | Contrast fails | Heading issues | 200% zoom overflow | Fixed content spill |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const vp of VIEWPORTS) {
  const b = sB?.perVp?.[vp.id]; const a = sA?.perVp?.[vp.id];
  if (!b) continue;
  const f = (k, g = (x) => x) => (a ? `${g(b[k])} → ${g(a[k])}` : g(b[k]));
  const len = (x) => (Array.isArray(x) ? x.length : x);
  console.log(`| ${vp.id} | ${vp.engine} | ${f('overflowPages', len)} | ${f('tapUnder44')} | ${a ? a.tapEffectiveUnder44 : 'n/a'} | ${f('inputsUnder16')} | ${f('contrastFails')} | ${f('headingIssues', len)} | ${f('zoomOverflowPages', len)} | ${f('fixedSpill', len)} |`);
}
console.log('\n### Content width beside the sidebar (home page main column)\n');
console.log('| Viewport | Content width before | after |');
console.log('|---|---|---|');
for (const vp of VIEWPORTS) {
  const b = sB?.perVp?.[vp.id]?.contentWidthMain; const a = sA?.perVp?.[vp.id]?.contentWidthMain;
  if (b) console.log(`| ${vp.id} | ${b.contentBox}px | ${a ? a.contentBox + 'px' : 'n/a'} |`);
}
