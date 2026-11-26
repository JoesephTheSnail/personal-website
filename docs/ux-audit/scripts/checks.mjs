// In-page checks. Each function is self-contained so Playwright can serialize
// it into the page with page.evaluate(fn, arg).

export function layoutChecks(opts) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.documentElement;
  const out = {};

  const sel = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (c.length) s += '.' + c.join('.');
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return t ? `${s} "${t}"` : s;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
  };
  const inDialogOnly = opts.scope ? document.querySelector(opts.scope) : null;
  const root = inDialogOnly || document.body;
  const all = [...root.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'PATH', 'DEFS'].includes(e.tagName.toUpperCase()));

  // 1. horizontal overflow
  out.overflow = {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowing: doc.scrollWidth > doc.clientWidth + 1,
    offenders: [],
  };
  if (out.overflow.overflowing) {
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > vw + 1 || r.left < -1) && visible(el)) {
        out.overflow.offenders.push({ el: sel(el), left: Math.round(r.left), right: Math.round(r.right) });
        if (out.overflow.offenders.length >= 8) break;
      }
    }
  }

  // 2. tap targets
  const interactive = [...root.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=menuitem], [role=menuitemcheckbox], [role=link], [tabindex]:not([tabindex="-1"])')].filter(visible);
  const small = [];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      const cs = getComputedStyle(el);
      // inline links inside running text are exempt under WCAG 2.5.8
      const inlineInText = cs.display === 'inline' && !!el.closest('p, li, dd, blockquote');
      // within the viewport width only (off-screen carousels etc. still count)
      small.push({ el: sel(el), w: Math.round(r.width), h: Math.round(r.height), inline: inlineInText, hit24: r.width >= 24 && r.height >= 24 });
    }
  }
  // Effective hit area: some controls grow their tap area with ::after padding
  // or negative margins, which a plain bounding box misses. Probe four points
  // 21px out from the centre; if they all resolve to the control (or a
  // descendant), it is at least ~44px in both axes.
  let effectiveUnder44 = 0;
  const scrollY0 = window.scrollY;
  for (const s of small) {
    if (s.inline) continue;
    const el = interactive.find((e) => sel(e) === s.el);
    if (!el) continue;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); // html has scroll-behavior: smooth; probing mid-scroll gave false negatives
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
    s.effective44 = hit(cx - 21, cy) && hit(cx + 21, cy) && hit(cx, cy - 21) && hit(cx, cy + 21);
    if (!s.effective44) effectiveUnder44++;
  }
  window.scrollTo(0, scrollY0);
  out.tapTargets = {
    effectiveUnder44,
    total: interactive.length,
    under44: small.length,
    under44NonInline: small.filter((s) => !s.inline).length,
    under24NonInline: small.filter((s) => !s.inline && !s.hit24).length,
    examples: small.filter((s) => !s.inline).slice(0, 12),
  };

  // 3. text size
  const sizeCount = {};
  const smallText = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  let totalChars = 0;
  let smallChars = 0;
  while ((n = walker.nextNode())) {
    const txt = n.textContent.trim();
    if (!txt) continue;
    const p = n.parentElement;
    if (!p || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(p.tagName)) continue;
    if (!visible(p)) continue;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    totalChars += txt.length;
    sizeCount[fs] = (sizeCount[fs] || 0) + txt.length;
    if (fs < 16) {
      smallChars += txt.length;
      if (smallText.length < 400) smallText.push({ el: sel(p), fs, chars: txt.length, text: txt.slice(0, 40) });
    }
  }
  // group by size
  const bySize = {};
  for (const s of smallText) {
    const k = s.fs;
    bySize[k] = bySize[k] || { fontSize: k, nodes: 0, chars: 0, examples: [] };
    bySize[k].nodes++;
    bySize[k].chars += s.chars;
    if (bySize[k].examples.length < 3) bySize[k].examples.push(`${s.el} :: ${s.text}`);
  }
  out.text = {
    totalChars,
    charsUnder16: smallChars,
    pctUnder16: totalChars ? Math.round((smallChars / totalChars) * 100) : 0,
    sizes: Object.fromEntries(Object.entries(sizeCount).sort((a, b) => a[0] - b[0])),
    underBySize: Object.values(bySize).sort((a, b) => b.chars - a.chars).slice(0, 8),
  };

  // 4. inputs under 16px (iOS zooms on focus)
  out.inputs = [...root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, select')]
    .filter(visible)
    .map((el) => ({ el: sel(el), fontSize: parseFloat(getComputedStyle(el).fontSize) }))
    .filter((i) => i.fontSize < 16);

  // 5. clipped text (overflow hidden/clip with content larger than box)
  const clipped = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const clips = ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY);
    if (!clips) continue;
    const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
    if (!hasText && el.children.length === 0) continue;
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
      // ignore text-overflow ellipsis (intentional)
      if (cs.textOverflow === 'ellipsis' || /line-clamp/.test(el.className) || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp) continue;
      clipped.push({ el: sel(el), sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight });
      if (clipped.length >= 10) break;
    }
  }
  out.clipped = clipped;

  // 6. text cut off at viewport edges: text-bearing elements extending past viewport right edge
  // (covered by overflow); plus elements positioned beyond bottom of fixed containers.

  // 7. heading order / alt / names
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => ({ level: +h.tagName[1], text: h.textContent.trim().slice(0, 40) }));
  const skips = [];
  let prev = 0;
  for (const h of hs) {
    if (prev && h.level > prev + 1) skips.push(`h${prev}->h${h.level} "${h.text}"`);
    prev = h.level;
  }
  out.headings = { list: hs.map((h) => `h${h.level}:${h.text}`), h1Count: hs.filter((h) => h.level === 1).length, skips, startsAtH1: hs[0]?.level === 1 };
  out.images = [...document.querySelectorAll('img')].map((im) => ({
    src: (im.currentSrc || im.src).slice(-60),
    alt: im.getAttribute('alt'),
    hasWH: !!(im.getAttribute('width') && im.getAttribute('height')) || (getComputedStyle(im).position === 'absolute'),
    natural: [im.naturalWidth, im.naturalHeight],
    shown: [Math.round(im.getBoundingClientRect().width), Math.round(im.getBoundingClientRect().height)],
    loading: im.loading,
    complete: im.complete && im.naturalWidth > 0,
  }));
  out.imagesMissingAlt = out.images.filter((i) => i.alt === null).length;
  out.imagesBroken = out.images.filter((i) => !i.complete && i.loading !== 'lazy').length;
  const noName = [];
  for (const el of root.querySelectorAll('a[href], button, [role=button]')) {
    if (!visible(el)) continue;
    const name = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || '').trim();
    const imgAlt = el.querySelector('img[alt]:not([alt=""])');
    if (!name && !imgAlt) noName.push(sel(el));
  }
  out.unnamedControls = noName.slice(0, 10);
  out.landmarks = {
    main: document.querySelectorAll('main').length,
    nav: document.querySelectorAll('nav, [role=navigation]').length,
    lang: doc.lang,
    title: document.title,
  };

  // 8. fixed / sticky elements covering content
  const fixed = all.filter((el) => {
    const p = getComputedStyle(el).position;
    return (p === 'fixed' || p === 'sticky') && visible(el);
  });
  // keep outermost only
  const outer = fixed.filter((el) => !fixed.some((o) => o !== el && o.contains(el)));
  out.fixed = outer.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      el: sel(el),
      pos: getComputedStyle(el).position,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      pctOfViewport: Math.round(((Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))) / (vw * vh)) * 100),
    };
  });
  // overlap count: content elements (text/interactive) intersecting a fixed rect, not inside it
  const overlaps = [];
  const contentEls = [...document.querySelectorAll('main p, main h1, main h2, main h3, main a, main button, main li, main img, main input')].filter(visible);
  for (const f of outer) {
    if (f.closest('[role=dialog]') || f.id === 'mobile-menu-panel') continue;
    const fr = f.getBoundingClientRect();
    for (const c of contentEls) {
      if (f.contains(c)) continue;
      const r = c.getBoundingClientRect();
      const ix = Math.min(fr.right, r.right) - Math.max(fr.left, r.left);
      const iy = Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top);
      if (ix > 4 && iy > 4) overlaps.push({ fixed: sel(f), content: sel(c) });
    }
  }
  // fixed containers whose own content spills past the container or off-screen
  // (e.g. a sidebar taller than a landscape phone) — unreachable when the
  // container itself cannot scroll.
  out.fixedSpill = outer.map((f) => {
    const fr = f.getBoundingClientRect();
    let maxBottom = fr.bottom;
    let lastEl = null;
    for (const d of f.querySelectorAll('*')) {
      if (!visible(d)) continue;
      const r = d.getBoundingClientRect();
      if (r.bottom > maxBottom) { maxBottom = r.bottom; lastEl = d; }
    }
    const cs = getComputedStyle(f);
    return {
      el: sel(f),
      boxBottom: Math.round(fr.bottom),
      contentBottom: Math.round(maxBottom),
      viewportH: vh,
      spillsBox: maxBottom > fr.bottom + 1,
      offscreen: maxBottom > vh + 1,
      scrollable: ['auto', 'scroll'].includes(cs.overflowY),
      lastEl: lastEl ? sel(lastEl) : null,
    };
  }).filter((s) => s.spillsBox || s.offscreen);
  out.fixedOverlaps = overlaps.slice(0, 8);
  out.fixedOverlapCount = overlaps.length;

  return out;
}

// WCAG contrast over text-bearing elements. Composites alpha through ancestors.
export function contrastChecks() {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const over = (top, bot) => {
    const a = top.a + bot.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (top.r * top.a + bot.r * bot.a * (1 - top.a)) / a,
      g: (top.g * top.a + bot.g * bot.a * (1 - top.a)) / a,
      b: (top.b * top.a + bot.b * bot.a * (1 - top.a)) / a,
      a,
    };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const bodyBg = (() => { const b = parse(getComputedStyle(document.body).backgroundColor); const h = parse(getComputedStyle(document.documentElement).backgroundColor); return over(b || { r: 0, g: 0, b: 0, a: 0 }, over(h || { r: 0, g: 0, b: 0, a: 0 }, { r: 255, g: 255, b: 255, a: 1 })); })();
  const effBg = (el) => {
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.push(e);
    let bg = { r: 0, g: 0, b: 0, a: 0 };
    let unknown = false;
    for (const e of chain) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') unknown = true;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) bg = over(bg, c); // composite from nearest outward: nearest on top
      if (bg.a >= 0.999) break;
    }
    bg = over(bg, bodyBg);
    return { bg, unknown };
  };
  const effOpacity = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const sel = (el) => { let s = el.tagName.toLowerCase(); const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2); if (c.length) s += '.' + c.join('.'); return s; };
  const fails = [];
  let checked = 0;
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const txt = n.textContent.trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
    if (el.closest('[aria-hidden="true"], [aria-hidden=true]')) continue; // decorative, skipped by AT and axe
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') continue;
    const key = el;
    if (seen.has(key)) continue;
    seen.add(key);
    const fg0 = parse(cs.color);
    if (!fg0) continue;
    const { bg, unknown } = effBg(el);
    const op = effOpacity(el);
    const fg = over({ ...fg0, a: fg0.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    checked++;
    if (ratio < need) {
      fails.push({ el: sel(el), text: txt.slice(0, 32), ratio: Math.round(ratio * 100) / 100, need, size, unknownBg: unknown, fg: `${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)}`, bg: `${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}` });
    }
  }
  fails.sort((a, b) => a.ratio - b.ratio);
  return { checked, failCount: fails.length, fails: fails.slice(0, 15) };
}

// Hover-only: CSS rules whose :hover selector changes display/visibility/opacity/max-height etc.
export function hoverOnlyScan() {
  const found = [];
  let hoverRules = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (rs) => {
      for (const r of rs) {
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        if (!r.selectorText || !/:hover/.test(r.selectorText)) continue;
        hoverRules++;
        const st = r.style;
        const props = ['display', 'visibility', 'opacity', 'max-height', 'height', 'transform', 'clip-path', 'pointer-events'];
        const hit = props.filter((p) => st.getPropertyValue(p));
        if (hit.some((p) => ['display', 'visibility', 'max-height', 'clip-path', 'pointer-events'].includes(p)) || (hit.includes('opacity') )) {
          found.push(`${r.selectorText.slice(0, 80)} {${hit.map((p) => `${p}:${st.getPropertyValue(p)}`).join(';')}}`);
        }
      }
    };
    walk(rules);
  }
  return { hoverRules, revealing: found.slice(0, 30) };
}
