// SEO + sharing: titles, descriptions, canonical, OG/Twitter, JSON-LD validity, sitemap, robots.
import path from 'node:path';
import fs from 'node:fs';
import { BASE, PAGES, RESULTS, TAG, writeJson } from './lib.mjs';

const projDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../content/projects');
const routes = PAGES.filter((p) => !['contact'].includes(p.id)).map((p) => p.path);
for (const f of fs.readdirSync(projDir)) if (f.endsWith('.mdx') && !f.startsWith('_')) routes.push('/projects/' + f.replace('.mdx', ''));

const meta = (html, re) => (html.match(re) || [])[1];
const tag = (html, attr, val, get = 'content') => {
  const m = html.match(new RegExp(`<meta[^>]*${attr}="${val}"[^>]*>`, 'i'));
  if (!m) return undefined;
  return (m[0].match(new RegExp(`${get}="([^"]*)"`)) || [])[1];
};
const out = { pages: {}, issues: [] };
const canonicals = new Map();
for (const r of routes) {
  const res = await fetch(BASE + r);
  const html = await res.text();
  const p = {
    status: res.status,
    title: meta(html, /<title>([^<]*)<\/title>/),
    description: tag(html, 'name', 'description'),
    canonical: (html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/) || [])[1],
    ogTitle: tag(html, 'property', 'og:title'),
    ogDesc: tag(html, 'property', 'og:description'),
    ogImage: tag(html, 'property', 'og:image'),
    ogUrl: tag(html, 'property', 'og:url'),
    twCard: tag(html, 'name', 'twitter:card'),
    twImage: tag(html, 'name', 'twitter:image'),
    robots: tag(html, 'name', 'robots'),
    lang: meta(html, /<html[^>]*lang="([^"]*)"/),
    h1: (html.match(/<h1[^>]*>/g) || []).length,
    jsonld: [],
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); p.jsonld.push({ type: j['@type'], valid: true, keys: Object.keys(j) }); } catch { p.jsonld.push({ valid: false }); }
  }
  out.pages[r] = p;
  const expectedCanon = 'https://arnavchandra.com' + (r === '/' ? '' : r);
  if (r !== '/this-page-does-not-exist') {
    if (!p.title) out.issues.push(`${r}: missing title`);
    if (!p.description) out.issues.push(`${r}: missing description`);
    else if (p.description.length > 170) out.issues.push(`${r}: description ${p.description.length} chars (>170)`);
    if (!p.canonical) out.issues.push(`${r}: no canonical`);
    else if (p.canonical.replace(/\/$/, '') !== expectedCanon) out.issues.push(`${r}: canonical points to ${p.canonical} (expected ${expectedCanon})`);
    if (!p.ogTitle) out.issues.push(`${r}: no og:title`);
    if (!p.ogImage) out.issues.push(`${r}: no og:image`);
    if (!p.twCard) out.issues.push(`${r}: no twitter:card`);
    if (p.h1 !== 1) out.issues.push(`${r}: ${p.h1} <h1> elements`);
    if (p.title && p.title.length > 65) out.issues.push(`${r}: title ${p.title.length} chars`);
  }
  if (p.canonical) canonicals.set(p.canonical, [...(canonicals.get(p.canonical) || []), r]);
  for (const j of p.jsonld) if (!j.valid) out.issues.push(`${r}: invalid JSON-LD`);
}
for (const [c, rs] of canonicals) if (rs.length > 1) out.issues.push(`canonical ${c} shared by ${rs.length} pages (${rs.slice(0, 3).join(', ')}…)`);

// OG image reachable and an image?
for (const url of new Set(Object.values(out.pages).map((p) => p.ogImage).filter(Boolean))) {
  const u = url.replace('https://arnavchandra.com', BASE);
  const res = await fetch(u.startsWith('http') ? u : BASE + u);
  out.issues.push(...(res.ok && /image\//.test(res.headers.get('content-type') || '') ? [] : [`og:image ${url} -> ${res.status} ${res.headers.get('content-type')}`]));
  out.ogImage = { url, status: res.status, type: res.headers.get('content-type'), bytes: (await res.arrayBuffer()).byteLength };
}

// sitemap vs real routes
const sm = await (await fetch(BASE + '/sitemap.xml')).text();
const smUrls = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace('https://arnavchandra.com', '') || '/');
const real = routes.filter((r) => r !== '/this-page-does-not-exist' && r !== '/fitness');
out.sitemap = { count: smUrls.length, missing: real.filter((r) => !smUrls.includes(r)), extra: smUrls.filter((u) => !routes.includes(u)) };
if (out.sitemap.missing.length) out.issues.push(`sitemap missing: ${out.sitemap.missing.join(', ')}`);
out.robots = await (await fetch(BASE + '/robots.txt')).text();
console.log(JSON.stringify({ issues: out.issues, sitemap: out.sitemap, ogImage: out.ogImage }, null, 1));
writeJson(path.join(RESULTS, TAG, 'seo.json'), out);
