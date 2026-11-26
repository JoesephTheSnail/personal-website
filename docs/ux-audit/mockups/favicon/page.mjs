// Writes concepts.html (a viewable favicon options page) and a PNG of it.
// Usage: node page.mjs <out.png>
import fs from 'node:fs';
import { pw } from '../../scripts/lib.mjs';
import { C } from './concepts.mjs';
const cell = (svg, bg) => `<div class="c" style="background:${bg}"><span class="i" style="width:96px;height:96px">${svg}</span><span class="i" style="width:32px;height:32px">${svg}</span><span class="i" style="width:16px;height:16px">${svg}</span></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>Favicon options</title><style>
body{margin:0;background:#121211;color:#EEE9DF;font:15px/1.5 "Instrument Sans",system-ui,sans-serif;padding:36px 40px;max-width:1040px}
h1{font-size:30px;font-weight:500;letter-spacing:-.03em;margin:0 0 6px}p.s{color:rgba(238,233,223,.6);margin:0 0 28px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:26px 28px}.t{margin:0 0 8px;font-weight:600}
.row{display:flex;gap:6px}.c{display:flex;gap:18px;align-items:flex-end;padding:16px 18px;flex:1;border-radius:6px}.i svg{width:100%;height:100%;display:block}
</style><h1>Favicon options</h1><p class="s">Each at 96, 32 and 16px, on a light and a dark browser tab. Tell me the number you like (or what to change).</p>
<div class="g">${Object.entries(C).map(([n, s]) => `<div><p class="t">${n}</p><div class="row">${cell(s, '#f1f1f1')}${cell(s, '#2b2b2b')}</div></div>`).join('')}</div>`;
fs.writeFileSync(new URL('./concepts.html', import.meta.url), html);
const b = await pw().chromium.launch(); const pg = await b.newPage({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1.5 });
await pg.setContent(html); await pg.screenshot({ path: process.argv[2], fullPage: true }); await b.close(); console.log('ok');
