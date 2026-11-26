// Round 2: simple, single-colour, negative-space marks. Usage: node round2.mjs <out.png>
import fs from 'node:fs';
import { pw } from '../../scripts/lib.mjs';
const P = '#5BA3C2';
export const C2 = {
  'A Full stop: the sentence-ender': `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="${P}"/></svg>`,
  'B A without a crossbar (chevron + dot)': `<svg viewBox="0 0 64 64"><path d="M10 54 L32 10 L54 54" fill="none" stroke="${P}" stroke-width="11" stroke-linejoin="miter" stroke-miterlimit="10"/><circle cx="32" cy="44" r="6" fill="${P}"/></svg>`,
  'C Two arches (a doorway)': `<svg viewBox="0 0 64 64"><path fill="${P}" fill-rule="evenodd" d="M8 58V30C8 17 19 7 32 7s24 10 24 23v28H44V31c0-7-5-12-12-12s-12 5-12 12v27z"/></svg>`,
  'D Quarter cut (corner and sweep)': `<svg viewBox="0 0 64 64"><path fill="${P}" d="M6 6H58V58H6Z M6 58A52 52 0 0 0 58 6Z" fill-rule="evenodd"/></svg>`,
  'E Half circle on a bar': `<svg viewBox="0 0 64 64"><path fill="${P}" d="M8 34a24 24 0 0 1 48 0z"/><rect x="8" y="40" width="48" height="12" fill="${P}"/></svg>`,
  'F Ring and bar (a + I)': `<svg viewBox="0 0 64 64"><circle cx="24" cy="36" r="15" fill="none" stroke="${P}" stroke-width="10"/><rect x="43" y="8" width="10" height="48" fill="${P}"/></svg>`,
};
const cell = (svg, bg) => `<div class="c" style="background:${bg}"><span class="i" style="width:96px;height:96px">${svg}</span><span class="i" style="width:32px;height:32px">${svg}</span><span class="i" style="width:16px;height:16px">${svg}</span></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>Favicon options, round 2</title><style>
body{margin:0;background:#121211;color:#EEE9DF;font:15px/1.5 "Instrument Sans",system-ui,sans-serif;padding:36px 40px;max-width:1040px}
h1{font-size:30px;font-weight:500;letter-spacing:-.03em;margin:0 0 6px}p.s{color:rgba(238,233,223,.6);margin:0 0 28px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:26px 28px}.t{margin:0 0 8px;font-weight:600}
.row{display:flex;gap:6px}.c{display:flex;gap:18px;align-items:flex-end;padding:16px 18px;flex:1;border-radius:6px}.i svg{width:100%;height:100%;display:block}
</style><h1>Favicon options, round 2</h1><p class="s">Single colour, simple shapes, transparent negative space.</p>
<div class="g">${Object.entries(C2).map(([n, s]) => `<div><p class="t">${n}</p><div class="row">${cell(s, '#f1f1f1')}${cell(s, '#2b2b2b')}</div></div>`).join('')}</div>`;
if (process.argv[2]) {
  fs.writeFileSync(new URL('./round2.html', import.meta.url), html);
  const b = await pw().chromium.launch(); const pg = await b.newPage({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1.5 });
  await pg.setContent(html); await pg.screenshot({ path: process.argv[2], fullPage: true }); await b.close(); console.log('ok');
}
