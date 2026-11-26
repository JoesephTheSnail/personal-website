import path from 'node:path';
import { BASE, toolRequire, pw } from './lib.mjs';
const route = process.argv[2] || '/books';
const chromeLauncher = toolRequire('chrome-launcher');
const lighthouse = (await import(path.join(path.dirname(toolRequire.resolve('lighthouse/package.json')), 'core/index.js'))).default;
const chrome = await chromeLauncher.launch({ chromePath: pw().chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const r = await lighthouse(BASE + route, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] });
const a = r.lhr.audits;
const el = a['largest-contentful-paint-element']?.details?.items;
console.log('LCP', Math.round(a['largest-contentful-paint'].numericValue));
console.log(JSON.stringify(el?.[0]?.items?.[0]?.node?.snippet || el?.[0], null, 0)?.slice(0, 300));
for (const k of ['lcp-breakdown-insight', 'lcp-discovery-insight']) {
  console.log(k, a[k]?.score, JSON.stringify(a[k]?.details?.items ?? a[k]?.details, null, 0)?.slice(0, 900));
}
await chrome.kill();
