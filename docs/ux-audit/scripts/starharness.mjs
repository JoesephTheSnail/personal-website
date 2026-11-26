// Fast visual check of the star buttons: pulls the real CSS block out of globals.css, mirrors the
// StarButton markup, and screenshots rest and forced-hover states side by side at 2x.
// Usage: node starharness.mjs <outPng> [variant...]
import fs from 'node:fs';
import path from 'node:path';
import { pw } from './lib.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const out = process.argv[2];
const only = process.argv.slice(3);
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
const star = css.slice(css.indexOf('/* ── Star project buttons'));

const D = (c) => `<i class="sx ${c}" aria-hidden="true"></i>`;
const face = (t) => `<span class="sx-face"><span class="sx-label">${t}</span></span>`;
const V = {
  sleep: (t) => `<a class="star-cta sc-sleep" href="#">${face(t)}${D('sx-pillow')}<i class="sx sx-z sx-z1">z</i><i class="sx sx-z sx-z2">z</i><i class="sx sx-z sx-z3">z</i></a>`,
  mind: (t) => `<a class="star-cta sc-mind" href="#">${D('sx-rays')}${D('sx-sun')}${D('sx-bump sx-bump--a')}${D('sx-bump sx-bump--b')}${D('sx-bump sx-bump--c')}${face(t)}${D('sx-rain sx-rain--a')}${D('sx-rain sx-rain--b')}${D('sx-rain sx-rain--c')}</a>`,
  insu: (t) => `<a class="star-cta sc-insu" href="#"><span class="sx-plunger"><i class="sx-knob"></i><i class="sx-rod"></i></span>${face(t)}${D('sx-hub')}${D('sx-needle')}${D('sx-drop')}</a>`,
  wear: (t) => `<a class="star-cta sc-wear" href="#"><svg class="sx-peg" viewBox="0 0 40 30"><circle cx="16" cy="5" r="4.2"/></svg><span class="sx-hang"><svg class="sx-string" viewBox="0 0 40 64"><path d="M16 5 C 9 22, 9 42, 16 60"/><path d="M16 5 C 23 22, 23 42, 16 60"/></svg>${face(t)}${D('sx-eyelet')}${D('sx-barcode')}${D('sx-sheen')}</span></a>`,
  mail: (t) => `<a class="star-cta sc-mail" href="#"><svg class="sx sx-flap-open" viewBox="0 0 100 17" preserveAspectRatio="none"><polygon points="0,17 100,17 50,0"/></svg>${D('sx-letter')}${face(t)}<svg class="sx sx-flap" viewBox="0 0 100 17" preserveAspectRatio="none"><polygon points="0,0 100,0 50,17"/></svg>${D('sx-stamp')}</a>`,
};
const LABELS = { sleep: 'Read the report', mind: 'View the prototype', insu: 'See the pitch deck', wear: 'See the pitch', mail: 'Read the newsletter' };
const list = (only.length ? only : Object.keys(V));
const row = (v) => `<div class="row"><div class="cell star-gallery">${V[v](LABELS[v])}</div><div class="cell star-gallery"><input type="checkbox" class="star-force" checked hidden>${V[v](LABELS[v])}</div></div>`;
const html = `<style>
:root{--fg:#EEE9DF;--ease-out:cubic-bezier(0.22,1,0.36,1);--accent:#5BA3C2}
body{margin:0;background:#121211;font-family:"Instrument Sans",system-ui,sans-serif;padding:8px 24px}
.row{display:flex;gap:48px;align-items:center}.cell{min-width:330px;padding:6px 18px}
${star}</style>${list.map(row).join('')}`;
const browser = await pw().chromium.launch();
const page = await browser.newPage({ viewport: { width: 780, height: 130 * list.length + 20 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.waitForTimeout(1300); // let the forced-hover animations reach a mid-loop frame
await page.screenshot({ path: out });
await browser.close();
console.log('ok');
