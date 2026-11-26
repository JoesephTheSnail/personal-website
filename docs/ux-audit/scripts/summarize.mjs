// Condense results/<tag>/crawl/*.json into short tables (markdown + json).
// Usage: node summarize.mjs [before|after]
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, VIEWPORTS, writeJson } from './lib.mjs';

const tag = process.argv[2] || 'before';
const dir = path.join(RESULTS, tag, 'crawl');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('open-states'));
const rows = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((r) => !r.error);
const errs = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((r) => r.error);

const isNoise = (s) => /_vercel\/(insights|speed-insights)|Failed to load resource.*404/.test(s);
const perVp = {};
for (const vp of VIEWPORTS) {
  const rs = rows.filter((r) => r.viewport === vp.id && r.theme === 'dark');
  if (!rs.length) continue;
  const lt = (r) => r.layout;
  perVp[vp.id] = {
    engine: vp.engine,
    pages: rs.length,
    overflowPages: rs.filter((r) => lt(r).overflow.overflowing).map((r) => `${r.page}(${lt(r).overflow.scrollWidth}>${lt(r).overflow.clientWidth})`),
    tapUnder44: rs.reduce((n, r) => n + lt(r).tapTargets.under44NonInline, 0),
    tapEffectiveUnder44: rs.reduce((n, r) => n + (lt(r).tapTargets.effectiveUnder44 ?? 0), 0),
    tapUnder24: rs.reduce((n, r) => n + lt(r).tapTargets.under24NonInline, 0),
    tapTotal: rs.reduce((n, r) => n + lt(r).tapTargets.total, 0),
    textUnder16Pct: Math.round(rs.reduce((n, r) => n + lt(r).text.pctUnder16, 0) / rs.length),
    inputsUnder16: rs.reduce((n, r) => n + lt(r).inputs.length, 0),
    clipped: rs.filter((r) => lt(r).clipped.length).map((r) => `${r.page}:${lt(r).clipped.length}`),
    contrastFails: rs.reduce((n, r) => n + r.contrast.failCount, 0),
    headingIssues: rs.filter((r) => lt(r).headings.skips.length || lt(r).headings.h1Count !== 1).map((r) => r.page),
    imagesMissingAlt: rs.reduce((n, r) => n + lt(r).imagesMissingAlt, 0),
    unnamedControls: rs.reduce((n, r) => n + lt(r).unnamedControls.length, 0),
    fixedOverlapPages: rs.filter((r) => lt(r).fixedOverlapCount).map((r) => `${r.page}:${lt(r).fixedOverlapCount}`),
    fixedSpill: rs.filter((r) => lt(r).fixedSpill.length).map((r) => `${r.page}:${lt(r).fixedSpill.map((s) => `${s.contentBottom}>${s.viewportH}`).join('/')}`),
    maxCls: Math.max(...rs.map((r) => r.cls.cls)),
    longTasks: rs.reduce((n, r) => n + r.cls.longTasks.length, 0),
    consoleErrors: rs.reduce((n, r) => n + r.console.filter((c) => !isNoise(c)).length, 0) + rs.reduce((n, r) => n + r.pageErrors.length, 0),
    failedReqs: rs.reduce((n, r) => n + r.failed.filter((c) => !isNoise(c)).length, 0),
    focusNoIndicator: rs.reduce((n, r) => n + r.focus.noIndicator.length, 0),
    zoomOverflowPages: rs.filter((r) => r.zoom200.overflow).map((r) => r.page),
    zoomFixedOverlapPages: rs.filter((r) => r.zoom200.fixedOverlapCount).map((r) => `${r.page}:${r.zoom200.fixedOverlapCount}`),
    contentWidthMain: rs.find((r) => r.page === 'home')?.mainWidth,
  };
}
// theme comparison on / and /projects
const themes = {};
for (const r of rows.filter((r) => ['home', 'projects'].includes(r.page))) {
  const k = `${r.page}|${r.theme}`;
  themes[k] = themes[k] || { contrastFails: 0, overflow: 0, runs: 0 };
  themes[k].contrastFails += r.contrast.failCount;
  themes[k].overflow += r.layout.overflow.overflowing ? 1 : 0;
  themes[k].runs++;
}
// open states
const open = {};
for (const vp of VIEWPORTS) {
  const f = path.join(dir, `${vp.id}__open-states.json`);
  if (fs.existsSync(f)) open[vp.id] = JSON.parse(fs.readFileSync(f, 'utf8'));
}
const openSummary = Object.fromEntries(Object.entries(open).map(([id, o]) => [id, {
  mobileNav: o.mobileNav && (o.mobileNav.error || { rect: o.mobileNav.rect, tapUnder44: o.mobileNav.layout.tapTargets.under44NonInline, overflow: o.mobileNav.layout.overflow.overflowing, closesOnEscape: o.mobileNav.closesOnEscape, ariaExpanded: o.mobileNav.ariaExpanded }),
  contact: o.contactModal && (o.contactModal.error ? { error: o.contactModal.error, ...o.contactModal } : { panel: o.contactModal.panel, scrollLock: o.contactModal.scrollLock.bodyOverflow, pageScrolledBehind: o.contactModal.pageScrolledBehind, focusStart: o.contactModal.focusStart, focusLeaks: o.contactModal.focusLeaksInto, closedByBackdrop: o.contactModal.closedByBackdrop, closedByEscape: o.contactModal.closedByEscape, focusAfterClose: o.contactModal.focusAfterClose, tapUnder44: o.contactModal.layout.tapTargets.under44NonInline, smallTargets: o.contactModal.layout.tapTargets.examples.slice(0, 3).map((e) => `${e.el} ${e.w}x${e.h}`), hasInputs: o.contactModal.hasInputs }),
  a11y: o.a11yMenu && (o.a11yMenu.error || { button: o.a11yMenu.buttonRect, menu: o.a11yMenu.rect, tapUnder44: o.a11yMenu.layout.tapTargets.under44NonInline }),
}]));

const summary = { tag, perVp, themes, openSummary, loadErrors: errs.map((e) => `${e.viewport} ${e.page}: ${e.error}`) };
writeJson(path.join(RESULTS, tag, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 1));
