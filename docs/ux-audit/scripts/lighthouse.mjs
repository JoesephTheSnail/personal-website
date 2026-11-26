// Lighthouse (mobile, default throttling) against the production build.
// Usage: AUDIT_TAG=before node lighthouse.mjs [--runs=1] [--page=home]
import path from 'node:path';
import { BASE, PAGES, RESULTS, TAG, toolRequire, writeJson, pw } from './lib.mjs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const runs = Number(arg('runs') || 1);
const only = arg('page');
const preset = arg('preset') || 'mobile'; // mobile | desktop

const chromeLauncher = toolRequire('chrome-launcher');
const lighthouse = (await import(path.join(path.dirname(toolRequire.resolve('lighthouse/package.json')), 'core/index.js'))).default;

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const chromePath = pw().chromium.executablePath();

// fitness/404 return non-200 or heavy mock data; 404 cannot be audited by Lighthouse (status code check), skip it.
const targets = PAGES.filter((p) => !['contact', '404'].includes(p.id)).filter((p) => !only || p.id === only);
const out = {};
for (const p of targets) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
    try {
      const flags = { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'seo', 'best-practices'] };
      const config = preset === 'desktop' ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : undefined;
      const r = await lighthouse(BASE + p.path, flags, config);
      const lhr = r.lhr;
      const a = lhr.audits;
      samples.push({
        perf: Math.round(lhr.categories.performance.score * 100),
        a11y: Math.round(lhr.categories.accessibility.score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        bp: Math.round(lhr.categories['best-practices'].score * 100),
        lcp: Math.round(a['largest-contentful-paint'].numericValue),
        cls: Math.round(a['cumulative-layout-shift'].numericValue * 1000) / 1000,
        tbt: Math.round(a['total-blocking-time'].numericValue),
        fcp: Math.round(a['first-contentful-paint'].numericValue),
        si: Math.round(a['speed-index'].numericValue),
        tti: Math.round(a['interactive'].numericValue),
        bytes: Math.round(a['total-byte-weight'].numericValue / 1024),
        lcpEl: a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet?.slice(0, 120) || null,
        failedAudits: Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable' && x.scoreDisplayMode !== 'manual').map((x) => `${x.id}(${x.score})`).slice(0, 25),
        opportunities: Object.values(a).filter((x) => x.details?.type === 'opportunity' && x.details.overallSavingsMs > 100).map((x) => `${x.id}:${Math.round(x.details.overallSavingsMs)}ms`),
        unusedJs: Math.round((a['unused-javascript']?.details?.overallSavingsBytes || 0) / 1024),
      });
    } catch (e) {
      samples.push({ error: String(e).slice(0, 200) });
    } finally {
      await chrome.kill();
    }
  }
  const ok = samples.filter((s) => !s.error);
  const summary = ok.length ? Object.fromEntries(['perf', 'a11y', 'seo', 'bp', 'lcp', 'cls', 'tbt', 'fcp', 'si', 'tti', 'bytes', 'unusedJs'].map((k) => [k, median(ok.map((s) => s[k]))])) : null;
  out[p.id] = { summary, last: ok[ok.length - 1] || samples[0], runs: samples.length };
  console.log(p.id, preset, JSON.stringify(summary));
}
writeJson(path.join(RESULTS, TAG, `lighthouse-${preset}${only ? '-' + only : ''}.json`), out);
