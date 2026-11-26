// Round 4: icon-based (not letters) favicons on the bone tile, each tied to a personal website.
// Usage: node round4.mjs <out.png>
import fs from 'node:fs';
import { pw } from '../../scripts/lib.mjs';
const INK = '#121211', BONE = '#EEE9DF', P = '#3F86A8';
const tile = (inner) => `<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BONE}"/>${inner}</svg>`;
export const C4 = {
  '1 Person (the profile)': tile(`<circle cx="32" cy="24" r="9.5" fill="${INK}"/><path d="M13 53c0-11 8-17 19-17s19 6 19 17z" fill="${INK}"/>`),
  '2 Open book (read, learn, write)': tile(`<path d="M9 17c8-2 17-1 22 4v30c-5-4-14-5-22-3z" fill="${INK}"/><path d="M55 17c-8-2-17-1-22 4v30c5-4 14-5 22-3z" fill="${INK}"/>`),
  '3 Pencil (the writer)': tile(`<g transform="rotate(40 32 32)"><rect x="25.5" y="9" width="13" height="8" rx="2.5" fill="${P}"/><rect x="25.5" y="19" width="13" height="25" fill="${INK}"/><path d="M25.5 46h13L32 57z" fill="${INK}"/></g>`),
  '4 Sprout (growth mindset)': tile(`<path d="M30 54V34h4v20z" fill="${INK}"/><path d="M32 38C19 38 12 30 12 18c13 0 20 7 20 20z" fill="${INK}"/><path d="M32 32c0-12 8-19 20-19 0 12-8 19-20 19z" fill="${P}"/>`),
  '5 Compass (finding direction)': tile(`<circle cx="32" cy="32" r="20" fill="none" stroke="${INK}" stroke-width="5"/><g transform="rotate(40 32 32)"><path d="M32 16l6 16-6 16-6-16z" fill="${INK}"/><path d="M32 16l6 16H26z" fill="${P}"/></g>`),
  '6 Speech bubble (get in touch)': tile(`<path d="M18 12h28c5 0 9 4 9 9v15c0 5-4 9-9 9H34L21 55V45h-3c-5 0-9-4-9-9V21c0-5 4-9 9-9z" fill="${INK}"/><circle cx="23" cy="29" r="3.2" fill="${BONE}"/><circle cx="32" cy="29" r="3.2" fill="${BONE}"/><circle cx="41" cy="29" r="3.2" fill="${BONE}"/>`),
  '7 House with a door (a home online)': tile(`<path fill="${INK}" fill-rule="evenodd" d="M32 9 56 30h-8v23H16V30H8z M27 53V40a5 5 0 0 1 10 0v13z"/>`),
  '8 Peak with a flag (goals reached)': tile(`<path d="M6 52 23 23l9 14 8-11 18 26z" fill="${INK}"/><path d="M23 23V10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M23 10l11 4-11 4z" fill="${P}"/>`),
};
const cell = (svg, bg) => `<div class="c" style="background:${bg}"><span class="i" style="width:96px;height:96px">${svg}</span><span class="i" style="width:32px;height:32px">${svg}</span><span class="i" style="width:16px;height:16px">${svg}</span></div>`;
const html = `<!doctype html><meta charset="utf-8"><title>Favicon options, round 4</title><style>
body{margin:0;background:#121211;color:#EEE9DF;font:15px/1.5 "Instrument Sans",system-ui,sans-serif;padding:36px 40px;max-width:1040px}
h1{font-size:30px;font-weight:500;letter-spacing:-.03em;margin:0 0 6px}p.s{color:rgba(238,233,223,.6);margin:0 0 28px}
.g{display:grid;grid-template-columns:repeat(2,1fr);gap:26px 28px}.t{margin:0 0 8px;font-weight:600}
.row{display:flex;gap:6px}.c{display:flex;gap:18px;align-items:flex-end;padding:16px 18px;flex:1;border-radius:6px}.i svg{width:100%;height:100%;display:block}
</style><h1>Favicon options, round 4</h1><p class="s">Icons rather than letters, on the bone tile. Each is a heavy, simple shape so it survives at 16px.</p>
<div class="g">${Object.entries(C4).map(([n, s]) => `<div><p class="t">${n}</p><div class="row">${cell(s, '#f1f1f1')}${cell(s, '#2b2b2b')}</div></div>`).join('')}</div>`;
if (process.argv[2]) {
  fs.writeFileSync(new URL('./round4.html', import.meta.url), html);
  const b = await pw().chromium.launch(); const pg = await b.newPage({ viewport: { width: 1120, height: 700 }, deviceScaleFactor: 1.5 });
  await pg.setContent(html); await pg.screenshot({ path: process.argv[2], fullPage: true }); await b.close(); console.log('ok');
}
