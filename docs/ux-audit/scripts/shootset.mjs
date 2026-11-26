// Full-page screenshots of a fixed page set at several widths (reduced motion), for before/after diffs.
// Usage: node shootset.mjs <outDir>   [AUDIT_BASE to change host]
import fs from 'node:fs';
import path from 'node:path';
import { BASE, pw } from './lib.mjs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const PAGES = ['/', '/projects', '/projects/research', '/books', '/health', '/projects/carbon-capture-model', '/projects/insusense', '/projects/gmo-bananas'];
const WIDTHS = [390, 768, 1280];
const b = await pw().chromium.launch();
for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  for (const p of PAGES) {
    await pg.goto(BASE + p, { waitUntil: 'networkidle' });
    await pg.addStyleTag({ content: '*{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: path.join(out, `${w}${p.replace(/\//g, '_') || '_'}.png`), fullPage: true });
  }
  await ctx.close();
}
await b.close(); console.log('ok');
