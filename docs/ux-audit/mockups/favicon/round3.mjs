// Round 3: generic, well-made personal-site favicons: a solid tile with a monogram, so it holds
// contrast on light and dark tabs. Usage: node round3.mjs <out.png>
import fs from 'node:fs';
import { pw } from '../../scripts/lib.mjs';
const P = '#5BA3C2', BG = '#121211', BONE = '#EEE9DF';
// Geometric "A": flat apex, even stroke, crossbar included.
const A = (fill, tx = '') => `<path fill="${fill}" fill-rule="evenodd" ${tx} d="M32 11 L51 53 H42.6 L39.4 45.4 H24.6 L21.4 53 H13 Z M27.7 38.4 H36.3 L32 27.4 Z"/>`;
const tile = (r, bg, inner) => `<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="${r}" fill="${bg}"/>${inner}</svg>`;
export const C3 = {
  '1 Petrol tile, dark A': tile(14, P, A(BG)),
  '2 Bone tile, dark A': tile(14, BONE, A(BG)),
  '3 Dark tile, petrol A (with hairline)': `<svg viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="14" fill="${BG}" stroke="${P}" stroke-opacity=".55" stroke-width="2"/>${A(P)}</svg>`,
  '4 Petrol circle, dark A': `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${P}"/>${A(BG, 'transform="translate(0 1.5) scale(.94) translate(2 2)"')}</svg>`,
  '5 Petrol tile, bone A + dot (small mark)': tile(14, P, `<g transform="translate(32 32) scale(.9) translate(-32 -32)">${A(BONE)}</g><circle cx="51" cy="13" r="0" fill="${BONE}"/>`),
  '6 Square tile, dark A (sharp, editorial)': tile(0, P, A(BG)),
};
const cell = (svg, bg) => `<div class="c" style="background:${bg}"><span class="i" style="width:96px;height:96px">${svg}</span><span class="i" style="width:32px;height:32px">${svg}</span><span class="i" style="width:16px;height:16px">${svg}</span></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>Favicon options, round 3</title><style>
body{margin:0;background:#121211;color:#EEE9DF;font:15px/1.5 "Instrument Sans",system-ui,sans-serif;padding:36px 40px;max-width:1040px}
h1{font-size:30px;font-weight:500;letter-spacing:-.03em;margin:0 0 6px}p.s{color:rgba(238,233,223,.6);margin:0 0 28px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:26px 28px}.t{margin:0 0 8px;font-weight:600}
.row{display:flex;gap:6px}.c{display:flex;gap:18px;align-items:flex-end;padding:16px 18px;flex:1;border-radius:6px}.i svg{width:100%;height:100%;display:block}
</style><h1>Favicon options, round 3</h1><p class="s">A solid tile with a monogram: the safe, recognisable shape for a personal site, and it keeps its contrast on light and dark tabs.</p>
<div class="g">${Object.entries(C3).map(([n, s]) => `<div><p class="t">${n}</p><div class="row">${cell(s, '#f1f1f1')}${cell(s, '#2b2b2b')}</div></div>`).join('')}</div>`;
if (process.argv[2]) {
  fs.writeFileSync(new URL('./round3.html', import.meta.url), html);
  const b = await pw().chromium.launch(); const pg = await b.newPage({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1.5 });
  await pg.setContent(html); await pg.screenshot({ path: process.argv[2], fullPage: true }); await b.close(); console.log('ok');
}
