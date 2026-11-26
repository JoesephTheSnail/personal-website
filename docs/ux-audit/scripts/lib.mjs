// Shared config for the UX audit scripts. Playwright and Lighthouse live in
// ~/ux-audit-tools (installed outside the repo, never in package.json).
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const TOOLS = path.join(os.homedir(), 'ux-audit-tools');
export const toolRequire = createRequire(path.join(TOOLS, 'package.json'));
export const BASE = process.env.AUDIT_BASE || 'http://localhost:3002';
const here = path.dirname(fileURLToPath(import.meta.url));
export const AUDIT_DIR = path.resolve(here, '..');
export const RESULTS = path.join(AUDIT_DIR, 'results');
export const SHOTS = path.join(AUDIT_DIR, 'screenshots');
export const TAG = process.env.AUDIT_TAG || 'before'; // 'before' | 'after'

export const PAGES = [
  { id: 'home', path: '/' },
  { id: 'projects', path: '/projects' },
  { id: 'category-creative', path: '/projects/creative' }, // ProjectLedger without the filter
  { id: 'project-gmo-bananas', path: '/projects/gmo-bananas' }, // longest MDX
  { id: 'project-screens-sleep', path: '/projects/screens-and-sleep-report' }, // has the PDF report
  { id: 'project-carbon-capture-model', path: '/projects/carbon-capture-model' }, // newest, 3D model
  { id: 'books', path: '/books' },
  { id: 'health', path: '/health' },
  { id: 'fitness', path: '/fitness' },
  { id: 'contact', path: '/contact' }, // check what it does
  { id: '404', path: '/this-page-does-not-exist' },
];

// engine: webkit for iPhone/iPad, chromium for the rest (per the brief)
export const VIEWPORTS = [
  { id: '360x640', w: 360, h: 640, engine: 'chromium', touch: true, mobile: true },
  { id: '390x844', w: 390, h: 844, engine: 'webkit', touch: true, mobile: true },
  { id: '844x390', w: 844, h: 390, engine: 'chromium', touch: true, mobile: true },
  { id: '768x1024', w: 768, h: 1024, engine: 'webkit', touch: true, mobile: true },
  { id: '1024x768', w: 1024, h: 768, engine: 'webkit', touch: true, mobile: true },
  { id: '1280x800', w: 1280, h: 800, engine: 'chromium', touch: false, mobile: false },
  { id: '1920x1080', w: 1920, h: 1080, engine: 'chromium', touch: false, mobile: false },
];

export function pw() {
  return toolRequire('playwright');
}

export function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export async function launch(engine) {
  return pw()[engine].launch();
}

export async function newContext(browser, vp, opts = {}) {
  return browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: vp.touch,
    isMobile: vp.mobile,
    deviceScaleFactor: vp.mobile ? 2 : 1,
    colorScheme: opts.colorScheme || 'dark',
    reducedMotion: opts.reducedMotion || 'no-preference',
    ...opts.context,
  });
}
