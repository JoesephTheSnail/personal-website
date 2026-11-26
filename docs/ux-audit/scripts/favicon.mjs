// Renders src/app/icon.svg to PNGs (512, 192, 180 apple, 48, 32, 16) and a preview sheet.
// Usage: node favicon.mjs <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { pw } from './lib.mjs';
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const svg = fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../src/app/icon.svg'), 'utf8');
const browser = await pw().chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const size of [512, 192, 180, 48, 32, 16]) {
  // the Apple icon needs a solid, full-bleed square (iOS rounds the corners itself): dark, pencil inset
  const solid = size === 180;
  const markup = solid ? svg.replace(/(<svg[^>]*>)/, '$1<rect width="64" height="64" fill="#121211"/><g transform="translate(7 7) scale(.78)">').replace('</svg>', '</g></svg>') : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  await page.screenshot({ path: path.join(out, `icon-${size}.png`), omitBackground: !solid });
}
// preview: real size next to 8x pixelated, on light and dark "tab" backgrounds
await page.setViewportSize({ width: 560, height: 300 });
const b64 = (n) => 'data:image/png;base64,' + fs.readFileSync(path.join(out, `icon-${n}.png`)).toString('base64');
await page.setContent(`<style>body{margin:0;font:13px system-ui;display:flex;flex-direction:column;gap:0}
.row{display:flex;align-items:center;gap:20px;padding:14px 20px}
.l{background:#f1f1f1;color:#222}.d{background:#2b2b2b;color:#ddd}
img.px{image-rendering:pixelated}</style>
<div class="row l"><img src="${b64(16)}" width="16"><span>Arnav Chandra | Writer, Student &amp; Builder</span><img class="px" src="${b64(16)}" width="128"><img src="${b64(32)}" width="32"><img src="${b64(48)}" width="48"></div>
<div class="row d"><img src="${b64(16)}" width="16"><span>Arnav Chandra | Writer, Student &amp; Builder</span><img class="px" src="${b64(16)}" width="128"><img src="${b64(32)}" width="32"><img src="${b64(48)}" width="48"></div>
<div class="row d" style="background:#000"><img src="${b64(180)}" width="120" style="border-radius:26px"><img src="${b64(192)}" width="120"><span>apple-touch-icon (iOS rounds it) and 192 icon</span></div>`);
await page.screenshot({ path: path.join(out, 'preview.png') });
await browser.close();
console.log('ok');
