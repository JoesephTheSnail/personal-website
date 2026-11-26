// Show the failing nodes of one Lighthouse audit on one page.
// Usage: node lhdetail.mjs /health color-contrast
import path from 'node:path';
import { BASE, toolRequire, pw } from './lib.mjs';
const [, , route = '/', auditId = 'color-contrast'] = process.argv;
const chromeLauncher = toolRequire('chrome-launcher');
const lighthouse = (await import(path.join(path.dirname(toolRequire.resolve('lighthouse/package.json')), 'core/index.js'))).default;
const chrome = await chromeLauncher.launch({ chromePath: pw().chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const r = await lighthouse(BASE + route, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['accessibility', 'seo', 'performance'] });
const a = r.lhr.audits[auditId];
console.log(auditId, a.score, a.title);
for (const it of a.details?.items ?? []) {
  const n = it.node ?? it;
  console.log('-', (n.snippet || '').slice(0, 110), '|', (n.explanation || '').replace(/\s+/g, ' ').slice(0, 220));
}
await chrome.kill();
