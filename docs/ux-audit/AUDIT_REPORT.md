# UX audit: the redesign

Target: the uncommitted redesign in this worktree (branch `claude/truck-exhaust-carbon-capture-20492b`), dark only, bone and petrol, one typeface, no pills. **Nothing is committed, pushed or deleted.** Measured on a production build (`npm run build && npm start -- -p 3002`), not the dev server. Port 3001 (your dev server) and 3000 (the old `ux-audit` worktree) were not touched; my 3002 server is stopped.

Home page verified first: `localhost:3001` matches the screenshot you attached (portrait with petrol block, "TORONTO, ONTARIO", name, "Student, builder, and writer." + LinkedIn icon, About copy). Port 3001's process runs from this worktree.

Phases: 1 measure, 2 two review agents (haiku), 3 fixes with two measure/fix/re-measure rounds. Every agent claim was checked against the code; two were wrong and dropped (see "Agent claims I rejected").

## Headline numbers (before to after)

| Measure | Before | After |
|---|---|---|
| Lighthouse mobile Accessibility, 8 pages | 96 on 6 pages | **100 on 8 of 8** |
| Lighthouse mobile Performance | 93 to 100 (gmo-bananas 93, books 96) | 100 on 7 pages, books 96 |
| Horizontal overflow at 768 and 844x390 | home and contact overflow (876 > 768) | none, all 11 pages x 7 viewports |
| Content column beside the nav at 768px | 358px | 688px |
| Contrast failures at 1280 (11 pages) | 99 | 3 (all known, below) |
| Contrast failures at 390 | 36 | 3 |
| Contact modal: Tab presses (of 14) that left the dialog | 7 to 10 | **0** at all 6 viewports |
| Contact modal: focus moves in on open (Chromium) | no | yes |
| Phone-landscape menu reachable ("Get in touch", newsletter) | no, 549px sidebar in 405px viewport | yes |
| Tap targets under 44px (effective hit area), phones | 64 | 14 to 19 |
| Inputs under 16px on touch widths (iOS zoom) | 11 | 0 |
| og:image on project + category pages | 0 of 30 | 30 of 30 |
| Sitemap | missing 6 category pages | complete (34 URLs) |
| Cursor animation callbacks while idle | one every frame, never stops | 0 in 2s |
| CLS | 0 | 0 |

## 1. Lighthouse, mobile, simulated slow 4G, median of 3 runs, production build

| Page | Perf | A11y | SEO | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| / | 100 → 100 | 96 → **100** | 100 → 100 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 29 → 26ms |
| /projects | 100 → 100 | 96 → **100** | 100 → 100 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 26 → 27ms |
| /projects/creative | 100 → 100 | 96 → **100** | 100 → 100 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 24 → 32ms |
| /projects/gmo-bananas | 93 → **100** | 100 → 100 | 100 → 100 | 96 → 96 | 0.77s → 0.76s | 0 → 0 | 317 → 59ms |
| /projects/screens-and-sleep-report | 100 → 100 | 96 → **100** | 100 → 100 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 40 → 25ms |
| /projects/carbon-capture-model | 100 → 100 | 96 → **100** | 92 → 92 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 40 → 32ms |
| /books | 96 → 96 | 96 → **100** | 100 → 100 | 96 → 96 | 2.82s → 2.81s | 0 → 0 | 32 → 27ms |
| /health | 100 → 100 | 96 → **100** | 100 → 100 | 96 → 96 | 0.76s → 0.76s | 0 → 0 | 71 → 44ms |
| /fitness | not measurable: `HIDDEN = true` makes it a 404 (not flipped) | | | | | | |

All three targets (Perf, A11y, SEO at 95+; LCP < 2.5s, CLS < 0.1, TBT < 200ms) are met except: **SEO 92 on carbon-capture-model** (link text "here", your copy: see Questions 6e) and **/books LCP 2.8s**. The books LCP is a slow-4G simulation artifact: in the trace the cover image itself loads in about 120ms after the first byte, and in real Chromium the LCP is 60 to 80ms. I tried `preload` on the Now-reading covers and `loading="eager"` on the first six strip covers; neither moved the simulated number (2.81 and 2.98s) and both added bytes, so both were reverted (kept in `patches/rejected/`). TBT on gmo-bananas was 317ms once and 59ms after; it is run-to-run noise, not a fix. "Errors in console" (Best practices 96) is Vercel Insights and Speed Insights returning 404 on localhost.

## 2. Navigation breakpoints (your hypothesis: confirmed, same bug as the old site)

| Viewport | Content column before | after | Result before | Result after |
|---|---|---|---|---|
| 768x1024 | 358px | 688px | home + contact overflowed (876 > 768); About text one word per line | no overflow; mobile top bar and menu |
| 844x390 | 434px | 764px | sidebar 549px tall in a 405px viewport, cannot scroll, so "Get in touch" and the newsletter field unreachable; overflow 876 > 844 | top bar; menu sheet capped to the viewport and scrolls |
| 1024x768 | 614px | 614px | fine | fine (sidebar 549px fits) |
| 1280 / 1920 | 870 / 1510px | unchanged | fine | fine |

The sidebar (270px, `md:flex`, with `md:pl-[330px] md:pr-20` on `main`) now starts at `lg` (1024px) and scrolls if a window is short.

## 3. Per device (summed over the 11 pages; effective tap area uses `elementFromPoint`)

| Viewport | Engine | Issues found | Fixed? |
|---|---|---|---|
| 360x640 | Chromium, touch | Taps <44px effective 64; contrast 36; 200% text zoom overflows on 6 pages | taps 64 → 14, contrast 36 → 3; zoom overflow **not fixed** (6 pages) |
| 390x844 | WebKit, touch | Taps 64; contrast 36; zoom overflow 6 pages; modal focus leaks 7 of 14 | taps 64 → 19, contrast → 3, leaks → 0; zoom **not fixed** |
| 844x390 | Chromium, touch | Overflow on 2 pages; sidebar spill; taps 152; inputs <16px 11; contrast 94; modal focus did not move in, 10 leaks | overflow → 0, taps → 12, inputs → 0, contrast → 3, leaks → 0; zoom 4 → 2 pages |
| 768x1024 | WebKit, touch | Overflow on 2 pages; 358px column; taps 141; inputs 11; contrast 94; leaks 9 | overflow → 0, taps → 17, inputs → 0, contrast → 3, leaks → 0; zoom 5 → 3 pages |
| 1024x768 | WebKit, touch | Taps 146; inputs 11 (iPad landscape zoom on focus); contrast 99; leaks 9 | taps → 79, inputs → 0, contrast → 3, leaks → 0; zoom 4 → 4 pages |
| 1280x800 | Chromium | Contrast 99; no focus move into modal, 10 leaks; sidebar/Close/Copy small (mouse) | contrast → 3, leaks → 0; sidebar links stay 43px (mouse, not touch) |
| 1920x1080 | Chromium | same as 1280 | same as 1280 |

Remaining 3 contrast hits on every viewport: the yellow "Explore the 3D model" truck button on the carbon-capture page (deliberately left alone per HANDOFF.md), and the two ‹ › cover-strip arrows on /books (invisible at the scroll edge, so the measurement is meaningless). Remaining taps under 44 on touch are the off-screen skip link (only visible on focus), the 404 page's rocket button and a handful of small controls on pages I did not restyle. **Text-only 200% zoom**: the Now rows (home), the ledger rows and the Health quick-facts rows still run past the viewport on phones because their columns use fixed rem widths. I tried a width cap; it did nothing, so it was reverted. Real browser zoom to 200% (which also changes breakpoints) shows zero overflow at 1280 and 1920. Not fixed because the only fix I found (`flex-wrap`) moves right-hand labels onto a second line at normal phone widths, which changes the look.

## 4. Open states

| State | Before | After |
|---|---|---|
| Contact modal, focus on open | Chromium: stays on trigger; WebKit: Close button | Close button, both engines |
| Tab trap (14 presses) | 7 to 10 leaks | 0 leaks, all viewports (rest of page is `inert`) |
| Escape / backdrop | close | close |
| Focus after close | Chromium: trigger; Safari: lost to `<body>` (it does not focus clicked buttons) | trigger, or the menu button on mobile |
| Scroll lock | locked | locked |
| Keyboard covering the input | n/a: the dialog has no text input; the sidebar newsletter field is hidden on phones | n/a |
| Mobile menu, Escape | did not close | closes, focus back on the button |
| Mobile menu button | label "Open menu" always, no `aria-expanded` | "Open menu" / "Close menu", `aria-expanded`, `aria-controls` |
| Mobile menu in phone landscape | 412px tall in a 390px viewport, last link unreachable | capped to viewport height, scrolls |
| Accessibility menu | `role="menu"` with no arrow keys, Escape drops focus | plain toggle buttons with `aria-pressed`, Escape returns focus to the icon |
| Escape listener | modal's listener ran on every Escape press site-wide (played the close sound each time) | only while open |
| Focus at page load | `<body>` | `<body>` (I introduced a stray focus ring in one build, caught by a new check, fixed in patch 11) |

I could not test the real iOS keyboard (no Xcode in this environment); WebKit via Playwright covers focus, Tab and Escape but not software-keyboard occlusion.

## 5. Cursor, sound, reduced motion, ledger, images

- **Cursor:** one `requestAnimationFrame` loop that never stopped. Now it sleeps once everything has settled and wakes on any pointer event: 0 callbacks in 2s idle, 23 per 0.5s while moving, p95 frame 16.8ms while moving (was 16.7ms). Touch devices keep the native cursor and never start the loop. Idle CPU as measured by task time barely changed (131 to 124ms per 3s) because the remaining idle time is other page work, not the cursor.
- **Sound:** no hover sounds. Click tones on nav links, panels, subscribe. First click creates the AudioContext. No mute control anywhere. Recommendation in Questions 1.
- **Reduced motion:** 0 infinite animations either way; `prefers-reduced-motion` drops the 5 entrance animations. The in-app "Reduce motion" toggle does not cover the inline styles on the mobile sheet, modal and ledger preview (reviewer finding, checked in code, **not fixed**: the OS setting does cover them, and the fix needs `!important` overrides on inline styles; low value).
- **ProjectLedger:** 23 rows, each 92px (desktop) or 106px (phone) tall, all real links; filter works (23 → 7 for Creative); a tap navigates. The artwork preview needs a 5s hover or keyboard focus; nothing important is behind it. Preview cost: 4 lazy 384px WebP images, no layout. Filter buttons are 27px tall; they now get an invisible 44px hit area on touch.
- **Images:** every cover and project image is a local file through `next/image` (WebP, 256 to 828px). No hotlinked images. CLS 0 everywhere. With the covers blocked the frames hold their size (CLS 0) and show an empty box. Home page transfer 317KB.

## 6. SEO and sharing

| Check | Before | After |
|---|---|---|
| Per-page title, description, canonical | present, correct | same |
| og:image + twitter:image on project and category pages | **missing** (child `openGraph` replaces the layout's) | restored, all 30 |
| twitter card on category pages | missing | added |
| JSON-LD | valid (Person) | same |
| Sitemap | 28 URLs, missing 6 category pages | 34 URLs, complete; `/projects/training` correctly left out (it 404s: no published project) |
| robots.txt | fine | same |
| `/fitness` | 404, canonical points to home, no h1 | not touched (hidden) |

## 7. Link health (60 links, production build)

All internal links return 200 (the only 404 is `/fitness`, hidden). 27 external. Bot-blocked, to open by hand: LinkedIn (999), `medium.com/@arnav0` (403, contact dialog), `medium.com/@arnav0/eco-trucks-3c9d5dc10f63` (403), `canva.link/2pe0tqkzv9oospj` (403), `canva.link/wxcbpkt78bqdhrt` (403). Calendly, Substack, TikTok `@arnav.gym`, Google Docs/Slides/Drive and Figma all 200. TikTok link and `sameAs` entry kept.

## 8. Every change made

All paths are relative to the repo root. Patches live in `docs/ux-audit/patches/`, each against the state left by the one before it (apply in numeric order). Files edited are exactly these 17 (the cumulative patch `ALL-fixes-vs-baseline.patch` holds all of it).

| Patch | What | Files |
|---|---|---|
| 01-nav-breakpoint | Sidebar and content offset start at `lg` (1024) instead of `md` (768); sidebar scrolls when short; small hit-area on nav links | `src/components/TopNav.tsx`, `src/components/SiteWrapper.tsx` |
| 02-contact-modal-focus-inert | Focus moves in after the panel mounts; rest of the page `inert` while open; Tab wrap kept | `src/components/ContactModal.tsx` |
| 03-menu-and-a11y-menu-semantics | Menu button label/`aria-expanded`/`aria-controls`, Escape closes it; accessibility menu as `aria-pressed` buttons, Escape returns focus | `src/components/MobileNav.tsx`, `src/components/AccessibilityMenu.tsx` |
| 04-cursor-loop-sleeps-when-idle | Cursor loop stops when settled, wakes on pointer events; identical visuals | `src/components/CustomCursor.tsx` |
| 05-contrast-and-touch-targets | `--fg-45` 0.45 → 0.52, `--fg-dim` 0.4 → 0.52, `--fg-dimmer` 0.25 → 0.5, ledger year numerals use `--fg-45`; `.tap-44` invisible 44px hit area on touch only; 16px sidebar input and 44px menu items on touch | `src/app/globals.css`, `src/app/page.tsx`, `src/components/NowSection.tsx`, `src/components/BackLink.tsx`, `src/components/ProjectLedger.tsx` |
| 06-share-metadata-and-sitemap | og:image/twitter on project and category pages; category pages in the sitemap; `aria-label` on the bare "here" link (wording untouched) | `src/app/projects/[slug]/page.tsx`, `src/app/sitemap.ts`, `content/projects/carbon-capture-model.mdx` |
| 08-modal-focus-return-and-sheet-scroll | Remember the pressed button (Safari does not focus clicked buttons); mobile sheet capped to viewport and scrollable | `src/components/ContactModal.tsx`, `src/components/MobileNav.tsx` |
| 09-zoom-reflow-and-more-tap-targets | Tap padding on Books and project-page buttons; (label width cap, reverted in 12) | `src/components/ProjectLedger.tsx`, `src/app/page.tsx`, `src/components/BooksList.tsx`, `src/app/projects/[slug]/page.tsx` |
| 10-404-heading-and-tap-target | 404 gets a real `<h1>` (same look); tap area on "Take me home" | `src/app/not-found.tsx` |
| 11-modal-focus-return-only-on-real-close | Fix for a regression I introduced: focus-return ran on first load | `src/components/ContactModal.tsx` |
| 12-revert-label-width-cap | Reverts the no-op width cap from 09 | `src/components/ProjectLedger.tsx`, `src/app/page.tsx` |
| 13-sitemap-only-published-categories | Only list categories that have a published project | `src/app/sitemap.ts` |
| 15-health-section-numerals-contrast | Section numerals on Health 2.4:1 → 4.9:1 (Lighthouse flagged them although `aria-hidden`) | `src/app/health/page.tsx` |
| applied/PROPOSAL-hero-actions.APPLIED | **Applied on your request (after the audit).** Repeats your closing "Get in touch" and "Read my newsletter" under the tagline | `src/app/page.tsx` |
| 16-modal-focus-return-prefers-pressed-button | Safari focuses `<main>` on a button click, so focus-return now prefers the pressed button (keyboard opens still return to the focused button); found while verifying the hero buttons | `src/components/ContactModal.tsx` |
| PROPOSAL-proof-before-coming-up | **Not applied.** Puts "Three projects I'm proudest of" before "Coming up" | `src/app/page.tsx` |
| rejected/07, rejected/14 | Books LCP experiments, no gain, reverted | `src/app/books/page.tsx`, `src/components/BookCoverScroll.tsx` |

(Patch numbers 07 and 14 are the rejected books experiments; they are not part of the final state.)

**Baseline and how to apply or revert.** `~/ux-audit-tools/baseline/` is a copy of `src/`, `content/`, `public/`, `next.config.mjs`, `tailwind.config.ts` and `tsconfig.json` taken before my first edit (your uncommitted redesign as it was). The numbered patches are already applied in your working tree.
- Revert one group: `patch -R -p1 < docs/ux-audit/patches/NN-name.patch` (revert later patches that touch the same file first, e.g. 12 before 09, 11 and 08 before 02).
- Revert everything I changed: `patch -R -p1 < docs/ux-audit/patches/ALL-fixes-vs-baseline.patch`.
- Try the remaining proposal: `patch -p1 < docs/ux-audit/patches/PROPOSAL-proof-before-coming-up.patch`; drop it with `patch -R -p1`. The hero actions proposal is applied; revert with `patch -R -p1 < docs/ux-audit/patches/applied/PROPOSAL-hero-actions.APPLIED.patch`.
Screenshots of both proposals: `screenshots/proposal-*` (compare with `current-dev-*`).

## 9. Found but not fixed, and why

| Issue | Why not |
|---|---|
| Text under 16px (65% of characters; labels at 10 to 11px) | Design decision; changing it changes the look. Recommendation in Questions 13 |
| 200% text-only zoom overflow on Now rows, ledger rows, Health facts | Only fix found changes the layout at normal sizes (see §3) |
| /books LCP 2.8s in Lighthouse | Simulation artifact; two experiments gave no gain |
| SEO 92 on carbon-capture-model ("here" link) | It is your copy; Questions 6e |
| In-app "Reduce motion" does not cover inline animation styles | OS-level setting does; low value |
| Hover rules stay "sticky" after a tap on touch (nudged rows) | Cosmetic; would need `@media (hover: hover)` wrapping of the shared hover rules |
| Pill shapes remain (a11y switch, corner button, dots) | Locked decision; Questions 11 |
| Yellow truck button contrast | Deliberately left alone in HANDOFF.md |
| `/fitness`, 404 page old look | Hidden / not redesigned yet; only the 404's h1, contrast and tap target were fixed |
| `/projects/[slug]/demo` and `/dev-preview/carbon-capture-3d` (WebGL) | Not audited here (work in progress; WebGL needs a different harness) |
| `npm run lint` | Broken in Next 16 (`next lint` removed, ESLint not installed). Skipped, not fixed |
| Real iOS keyboard / Safari | Not testable here; WebKit via Playwright used for iPhone and iPad runs |

## 10. Agent claims I rejected

Reviewer A said the Projects page's stars exclude MindSet; wrong, `featured: true` is on 5 projects including mindset-app. It also gave the discipline count as 6, which is right, but proposed new hero copy; copy changes are in Questions, not edited. Reviewer B said tapping the hamburger while the menu is open closes then reopens it; I tested tap and slow-click timing in Chromium and WebKit on the unmodified build: it closes. Not changed.

## 11. How I verified

Before and after numbers come from `docs/ux-audit/scripts/` (crawl, Lighthouse x3 median, special, seo, links, lcp; adapted from the old audit: theme loop removed, redesign selectors, breakpoint at 1024), results in `docs/ux-audit/results/{before,after}/`. Final state: `npm test` 27/27, `npx tsc --noEmit` clean, `npm run build` clean (47 static pages). Screenshots: `docs/ux-audit/screenshots/before-*` and `after-*` by page and viewport (390, 768, 1280 plus open states), `before-books-covers-blocked-390x844.jpg` for the failed-image state.

## 12. After the audit: applied at your request

| Patch | What | Files |
|---|---|---|
| applied/PROPOSAL-hero-actions.APPLIED | "Get in touch" and "Read my newsletter" under the tagline | `src/app/page.tsx` |
| 16-modal-focus-return-prefers-pressed-button | Focus returns to the button that opened the dialog (Safari focuses `<main>` on click) | `src/components/ContactModal.tsx` |
| PROPOSAL-outcome-in-header | Outcome line shown under the project description | `src/app/projects/[slug]/page.tsx` |
| PROPOSAL-project-closing-block | Next project, contact and newsletter at the end of every project page | `src/app/projects/[slug]/page.tsx` |
| PROPOSAL-accessibility-in-mobile-menu | Accessibility options in the mobile menu; floating button hidden below 1024px | `src/components/MobileNav.tsx`, `src/lib/useAccessibilityPrefs.ts`, `src/app/globals.css` |
| ALL-current-vs-baseline | Everything above plus all audit fixes, against the pre-audit baseline (`ALL-fixes-vs-baseline.patch` is the audit fixes only, as of the end of the overnight run) | all |

Still unapplied: `PROPOSAL-proof-before-coming-up.patch`. Read-only reviews written after the audit: `UX_IMPROVEMENTS.md`, `ANIMATION_AUDIT.md`. Final state: `npm test` 27/27, `npx tsc --noEmit` clean, `npm run build` clean (47 pages).

## 13. Animation fixes (applied at your request)

Patches 17 (shorter page entrance), 18 (menu close easing and stagger) and 19 (reduced-motion coverage, portrait tilt, trio zoom duration); details and measurements in `ANIMATION_AUDIT.md`. `ALL-current-vs-baseline.patch` was regenerated and now includes them. Still open from that audit: gating hover motion for touch, the dialog's animated blur, time-based cover-strip scrolling, motion tokens, the skip link's `top` animation, the hamburger icon swap, and the filter-change fade. Final state: `npm test` 27/27, `npx tsc --noEmit` clean, production build clean (47 pages; one `/_global-error` retry warning appeared while the machine was under heavy load, and the build still finished).

## 14. Second animation batch (applied at your request)

Patches 20 to 24 (mouse-only hover motion, named transitions plus a static-blur dialog plus transform skip link, time-based cover strip, icon crossfade plus list-swap fade, `--ease-out` token). Details and measurements in `ANIMATION_AUDIT.md`. `ALL-current-vs-baseline.patch` regenerated. Final state: `npm test` 27/27, `npx tsc --noEmit` clean, production build clean (47 pages).

Finding, now fixed (section 15 below): two project-page images were unoptimized originals served straight from `public/projects/`.

## 15. Two project photos compressed (applied at your request)

| File | Before | After |
|---|---|---|
| `public/projects/tiny-hearts-booth.jpg` | 2048x1536, 359KB | 1536x1152, 147KB |
| `public/projects/school-livestream-teleprompter.jpg` | 1483x1142, 268KB | 1483x1142, 151KB |
| Total | 627KB | 298KB (52% smaller) |

Re-encoded as progressive JPEG at quality 80, 4:2:0, 1536px wide at most (the write-up column is 768px, so that is 2x for retina). The Display P3 colour profile is kept so colours do not shift. **The iPhone EXIF (device model and capture date) is stripped**; no GPS data was present. File names, `alt` text and Markdown are unchanged. Checked on both pages in Chromium and WebKit: images load at natural 1536 and 1483px wide, shown at 768px (desktop) and 342px (phone), CLS 0, no overflow.

Originals are backed up outside the repo at `~/ux-audit-tools/originals/`. To restore: `cp ~/ux-audit-tools/originals/*.jpg public/projects/`. These are binary files, so they are not in the numbered text patches; `ALL-current-vs-baseline.patch` predates them and only notes that binary files differ. Other large files in `public/` were not touched: five book covers (176 to 344KB as stored) and the report cover PNG (216KB) go through `next/image`, which serves them as 12 to 62KB WebP (measured on the Books and home pages); the Sleep study PDF (1.2MB) is only fetched when someone opens it. Only these two Markdown `![]()` images bypassed `next/image`.

## 16. Code cleanups (applied at your request)

| Change | Where |
|---|---|
| All outbound links and the email in one file (`LINKS`); Substack was in 7 places across 6 files, LinkedIn in 3 | new `src/lib/links.ts`; used in `layout.tsx` (JSON-LD), `page.tsx`, `ContactModal.tsx`, `TopNav.tsx`, `navItems.ts` |
| The "Get in touch" plus newsletter pair, written 3 times, is now one `ContactActions` component (`size` `md` for the home hero, `lg` for the home closing and the end of project pages) | new `src/components/ContactActions.tsx`; `page.tsx`, `projects/[slug]/page.tsx` |
| The `eyebrow` and `smallCaps` class strings, copied into 6 files, now live in one module. It sits in `components/` because Tailwind only scans `app`, `components` and `pages`, so a copy in `lib/` would silently lose its CSS | new `src/components/typeClasses.ts`; `projects/page.tsx`, `page.tsx`, `health/page.tsx`, `books/page.tsx`, `ProjectLedger.tsx`, `BooksList.tsx` |
| `/dev-preview/*` is marked `noindex, nofollow` (the page is kept; it is your scratch route) | new `src/app/dev-preview/layout.tsx` |
| `.gitignore` now ignores `docs/ux-audit/screenshots/` (33MB) and `docs/ux-audit/results/` (3MB); the reports, patches and scripts remain trackable | `.gitignore` |
| `findings.md` and `fixes.md` (old 3D-demo test notes, untracked) moved out of the repo root, not deleted | now in `~/ux-audit-tools/archive/` |

Patch `25-cleanup-links-actions-type-classes` covers the `src/` changes (`.gitignore` and the moved notes are not in it). Verified by fetching the rendered HTML of 7 pages (home, projects, books, health, two project pages, a discipline page) from the production build before and after: identical once script and link tags are stripped. `npm test` 27/27, `npx tsc --noEmit` clean, build clean. Not done from the earlier list: splitting `Scene3D.tsx` (5,163 lines), the doubled reduced-motion rules, the 112 inline colour styles, the `@types/three` dependency move, and compressing the book cover sources.

## 17. Round of design requests (applied)

| Request | What changed | Patch |
|---|---|---|
| Hover feedback on "Get in touch" | The underlined actions ("Get in touch" on the home hero and closing, the sidebar and menu versions, the email in the dialog) turn petrol, the underline thickens from 2px to 3px, and the arrow moves 3px. Mouse only for hover, same cue on keyboard focus, off under reduced motion. Filters are excluded (they use the underline to mark the active one). | 26 |
| Now section | Removed the big "07" and the per-row 01 to 07 numbers; the list is now a plain `ul`. | 26 |
| Star on Mindset Matters | `featured: true` on the Mindset Matters project, so it gets a ★ in the Projects list (6 stars now). | 27 |
| Remove the "23" | Removed the outlined count from the Projects header. Category pages (Creative, Research, ...) still have theirs. I did not fill the space (see Questions). | 26 |
| Remove the books hint | "Hover the edges to scroll, click a cover to jump to it" is gone. | 26 |
| Mouse disappears between covers | The strip was marked `data-hide-cursor`, which hid the custom cursor except over a link, while the native cursor is hidden site-wide, so the gaps had none. Attribute removed; verified the custom cursor is visible in the 16px gap. | 26 |
| No blue on Health | Petrol on the "My protocol" label, the 01 to 05 section numerals, the rail numerals, and the two inline link underlines. | 26 |
| Favicon | New mark: bold bone "A" with the petrol offset block from the portrait, on a graphite tile. Set: `icon.svg`, `icon.png` (192), `apple-icon.png` (180, solid), `favicon.ico` (16, 32, 48). Old indigo lightbulb backed up in `~/ux-audit-tools/originals/icon-old-lightbulb.png`. | 28 (SVG; PNG and ICO are binary) |
| Glanceable body text | Rewrote the body of 21 project pages (short sentences, headings, lists, in the style of the Truck Exhaust page) and shortened the one-line descriptions shown in the Projects list (the longest went from 163 to 142 characters including the bold proof line, most are under 100). No facts, names, numbers or links changed; the Outcome lines are word for word. Originals: `~/ux-audit-tools/copy-backup/` and `~/ux-audit-tools/baseline/content/`. Books were left alone (already short). | 27 |
| Star buttons (phase two) | Research and a static mockup only: `docs/ux-audit/mockups/star-buttons.html` (open in a browser). Not built into the site. | none |

Verified on a production build: `npm test` 27/27, `npx tsc --noEmit` clean, build clean, all pages render; hover, star count, numeral, hint, cursor and Health colours checked in the browser.

## 18. Follow-up round (applied)

| Request | What changed | Patch |
|---|---|---|
| Star buttons were not visible | They only existed as a static file. Now real components (`StarButton.tsx`, five variants) with a preview page at **`/dev-preview/star-buttons`** (not linked from the site, `noindex`) showing all five plus the existing truck, with a "Show hover state" box. Not yet placed on the project pages. The static mockup is still in `docs/ux-audit/mockups/`. | 29 |
| Hover on "Get in touch" | Only the underline bar grows (2px to 4px). The text no longer turns blue and the arrow no longer moves. | 29 |
| Natural language in the copy | Re-read all rewritten pages as spoken language and fixed the clipped or command-like lines (for example "The prompt: find something…" became "The prompt was to find something…", "Treat users like adults…" became "I designed it to treat users like adults…"). | 30 |
| Favicon | Simpler: a single petrol "A" built from three plain bars on a transparent background (no tile, no block). The Apple icon keeps a solid graphite square because iOS requires one. | 31 |
| Now section element | Researched ledger and editorial list patterns, mocked four options, and had a second reviewer look at a screenshot. Chosen: dotted leaders between each role and its organisation (the same device as Projects and Health) plus a small petrol dot beside "Now". Square markers were rejected as bullets, and a left label column read as a table. | 32 |

Sources for the favicon and button research are linked in the chat reply. `npm test` 27/27, build clean.

## 19. Star buttons rebuilt as objects, favicon redone, hover reverted

| Request | What changed | Patch |
|---|---|---|
| "These look cheap, remodel the entire button like the truck" | Rebuilt from scratch. Each button is now the object itself with the label printed on its main face, built the way the truck is (gradient face with inset highlights, drawn parts, soft glow): a **bed** (Pre-Sleep), a **phone held sideways** (MindSet), an **insulin pen** (InsuSense), a **garment price tag on a string** (AnyWear), a **paper envelope** (Mindset Matters). Motion is physical and finite or slow (snoring z's, breathing rings behind the text, plunger and drop, one decaying swing, flap and letter), only on hover, focus and press, and off under reduced motion. A second reviewer critiqued the first version; I fixed what held up (the tag's string now loops through its eyelet, the phone's rings sit behind the label and its bezel is lighter, the bed has a blanket fold and bigger legs and z's) and gave the envelope a bone-paper body so the five are not one blue slab. Preview: `/dev-preview/star-buttons`. Not yet on the project pages. | 33 |
| Hover on "Get in touch" | Reverted to text turns blue only. No bar growth, no arrow movement. | 33 |
| Favicon | Three candidates compared on light and dark at 16 to 128px. Chosen: the portrait's motif, an open petrol frame with a solid petrol block offset behind it (cut away around the frame so the gap shows through), on a transparent background. The Apple icon keeps a graphite square. | 34 |

`scripts/starharness.mjs` renders the buttons at rest and in the forced-hover state without a build, for quick visual checks. `npm test` 27/27, build clean.

## 20. Star button colours, favicon directions

- **Colours (patch 35):** each star button now has its own colour and matching glow, deliberately outside the site palette like the truck, since only one appears per page: Pre-Sleep indigo with a cream sheet, MindSet mint, InsuSense coral, AnyWear rose, Mindset Matters a cream envelope with an amber flap. Label contrast checked per button (white on indigo, dark ink on the rest).
- **Favicon:** the frame-and-block version was rejected. Eight different directions are in `docs/ux-audit/mockups/favicon/concepts.mjs` (run it to regenerate the sheet): lightbulb, truck, single-storey "a", pen nib, portrait frame, star, ledger rows, two cards. None is installed yet; the current files in `src/app/` are still the frame-and-block set until you choose.

## 21. Star buttons: researched colours and redesigns (patch 36)

Dropped the indigo, mint, coral and rose set (the usual AI-generated palette). Colours researched per product, one anchor plus a small accent each:

| Button | Colours | Why |
|---|---|---|
| Pre-Sleep | midnight navy bedding, cream sheets, brass bed frame | navy, warm cream and a metallic accent is the pairing sleep brands use |
| MindSet | sage screen on a warm cream phone, terracotta cheeks | sage plus warm neutral, with terracotta used sparingly, avoids the default wellness look |
| InsuSense | clinical white pen, graphite collars, crimson insulin window | medical devices pair a neutral body with one accent |
| AnyWear | champagne-gold tag, burgundy eyelet, cream string | the luxury pairing of gold with a deep wine accent |
| Mindset Matters | black-ink envelope, cream type, emerald lining and stamp | the darker look you asked for |

Other changes: the bed is now a real brass bed (barred headboard and footboard, rail, legs, gold-piped navy duvet, creased pillow) so nothing is hidden behind the mattress; MindSet is a phone whose screen shows a mood face that goes from a frown to a smile with blushing cheeks on hover (the app tracks mood, so a viewer gets it); InsuSense drips twice and stops; the AnyWear shine is a gradient sliding inside the tag's own shape (its box equals the tag's box and it never moves, so it cannot appear outside the tag). Sources are linked in the chat reply. Favicon is a separate item and unchanged.

## 22. MindSet button redesigned around the app's own imagery; pillows (patch 39)

**Research.** The product itself (`public/home/mindset.jpg`): a dark navy app with white cards, a *Breathing* card with a purple petal flower, an *Affirmations* card with an orange rising sun, a head-with-gears brain logo, and a daily timeline with a green check. Project facts (`mindset-app.mdx`): mood tracking, CBT journaling prompts, breathing exercises, a resource library, modular, built for a stressed 16-year-old at 2 a.m., with a "treat teens like adults" tone. Outside research: weather is an established mood metaphor, growth stages and breathing circles are common, metaphoric icons that need explaining do not read on their own (a Stanford usability finding), teens respond to visual warmth over text, and storm clouds clearing is the classic CBT image for stepping back from a thought. Rejected: the breathing circle and the mood-face phone (neither is recognised on sight without explanation), a sprout (generic wellness), a journal (generic).

**Concept.** A heavy slate cloud with rain falling from it at rest. On hover the cloud lightens to near-white, the rain stops, and the app's own orange sun rises from behind it with its rays. It reads without explanation, ties to the CBT image and the Affirmations sunrise in the app, and the label colour flips from cream to navy as the mood lifts. Warm glow on hover only.

**Pillows.** Two pillows, same size, level, evenly spaced, resting on the mattress (they previously floated across the sheet edge and one was tilted).

Sources are linked in the chat reply. `npm test` 27/27, build clean.

## 23. Pre-Sleep button: a minimal bed (patch 40)

First attempt (mattress, sleeper hump, sheet fold, two pillow-like shapes) was too busy. Reduced to three things:
- One cream pillow at the head (top left), 52x21px.
- The blanket line was tried and then removed at the user's request; the blue face itself is the blanket.
- No mattress, no hump, no sheet; the brass hem is 1px at 55% opacity.
- Hover (hover-capable pointers, keyboard focus, press): pillow squashes slightly, z's float. Reduced motion turns it off.
- Top padding on the face reduced 25px to 18px. A second reviewer's notes (smaller pillow, dimmer hem) were applied. Gallery captions refreshed.

## 24. Star buttons on project pages; favicon "A with a dot" (patches 43, 44)

- The five star projects now show their button under the Outcome block (`src/lib/starButtons.ts` maps slug to variant, label and which `links` entry it opens). A plain PDF or button link that the star button replaces is removed from the list; embeds stay.
- Truck button road lines: the dash tile is now exactly one 20px period, so the scroll loop is seamless (patch 42).
- Favicon: letters and tiles were rejected, so the final mark is a pencil (the writer), as large as the square allows, on a transparent background with a bone outline. Round sheets are in `docs/ux-audit/mockups/favicon/`.

## 25. Code review fixes and SEO pass (patch 45)

- Removed the now-unused `pre-sleep-screen-restriction-cover.png`; `npm run lint` runs `tsc --noEmit` (`next lint` was removed in Next 16); `dev-preview/` returns 404 on Vercel.
- SEO: share image per project and discipline page (file-based, so the generic image no longer overrides them); CreativeWork and BreadcrumbList JSON-LD on project pages, WebSite JSON-LD on every page; discipline pages get a descriptive meta description; `seoTitle` for the one title over 60 characters; `robots.txt` blocks `/api/` and `/dev-preview/`; the "here" link on the carbon capture page now reads "the original Grade 9 version on Medium".

## 26. Deep-dive pass (patch 47)

Measured on the production build: crawl of 77 page and viewport combinations, link check (62 links), SEO script, Lighthouse mobile (home 100 / 100 / 100 / 96; books 95 / 100 / 100 / 96; the 96 is the Vercel analytics script 404ing locally). No page errors, no broken images, no missing alt text, one `<h1>` per page.

Fixed:
- Portrait: petrol block closer (8-10px instead of 12-16px) and 70% opacity.
- /books, /projects, /health shared the home page's `og:title` and had no `og:url`; they now use `pageMetadata()` (`src/lib/seo.ts`).
- Added `theme-color` and `color-scheme` (`viewport` in `layout.tsx`), `manifest.ts`, a themed `error.tsx`, and a print stylesheet (light, no sidebar, link URLs shown).
- Home "Now" rows wrap instead of overflowing when text is zoomed.

Left, with reasons:
- 200% text zoom still overflows on fixed chrome (sidebar, top bar) on some pages: earlier fixes changed layout, so it needs a design decision.
- Security headers: `vercel.json` has four; no CSP or HSTS. Off limits for this audit; Vercel adds HSTS on custom domains, CSP needs a decision about analytics and the Figma/Drive embeds.
- Nice-to-have, not built: RSS feed for the newsletter, a CV download, `security.txt`, a social-share test on real LinkedIn/iMessage links.
- External links returning 403 (Medium, two Canva links) block bots; they work in a browser.

## 27. New 404, 200% text zoom, nice-to-haves (patches 48-50)

- **404:** replaced the old rocket page with a full-screen "lights out" game (`LostInTheDark.tsx`). Your cursor or finger is the flashlight over the whole screen; five things are hiding (sock, paperclip, cone, coffee, a rival page), each with its own click trick; finding all five turns the lights on. Two hidden things are exits: a door (swings open, floods the screen with light, goes Home) and a boomerang (spins away, goes Back). The lit text at the bottom always has real links, plus Back. Works with touch, on iPad and in landscape (text moves to a side column). Reduced motion: the light sits still and clicks act at once. Inspired by LEGO (a joke from the page's own situation), Android (something to poke), Distilled (comic voice) and Dribbble (a useful way out).
- **Cursor:** the custom cursor now has a thin dark halo so it reads on any surface (it was invisible on the earlier bone-coloured poster).
- **Unknown project URLs** now get the "Page not found" title and noindex instead of "Project".
- **200% text zoom:** 23 page and screen combinations overflowed; now 0 of 77. A small effect in `SiteWrapper.tsx` adds `big-text` to `<html>` at 150% text or more, and only then do the title / leader / label rows wrap (`.row-wrap`). A first attempt that wrapped rows at all sizes changed the normal layout, so it was reverted; the final version was checked by pixel-diffing 8 pages at 3 widths at normal size (identical).
- **Nice-to-haves:** RSS feed of projects at `/feed.xml` (linked in every page's head); `/.well-known/security.txt`. Not built: a CV download (needs your PDF: drop it in `public/` and I will link it).

## 28. Copy-email streak easter egg (patch 51)

On the Get in touch card, the first copy is plain ("Copied"). Copy again and again and a quiet line under the email keeps count, in normal sentence case at body size: Double copy, Triple copy, Dominating, Rampage, Mega copy, Unstoppable, Wicked sick, Monster copy, Godlike (the card edge turns blue with a soft glow and the row shakes), Beyond godlike, then a few dry jokes. The button reads "Copied x N". The streak resets after 5 seconds or when the card closes. Screen-reader friendly, keeps keyboard focus, and the motion is off under reduced motion.

## 29. Next-project order, row sound, Now filler, 3s streak (patches 52-53)

- **Next project:** it used a same-discipline pool with wrap-around, so two projects (Robotics and Truck Exhaust) sent you back and forth. It now walks the whole published list once, in the exact order /projects shows (`src/lib/projectOrder.ts`: newest, then `order`, then slug so ties cannot flip), and stops at the last project, where the page shows Contact and "All projects" instead. A unit test (`projectOrder.test.ts`) checks that the chain visits every project once with no repeats or loops, and I walked the live HTML: 23 of 23 published projects, same order as the list, no loop.
- **Sound:** moving the pointer over project rows plays the original site's scroll-wheel tick (`playHover` restored in `src/lib/sound.ts`; it varies slightly by row). Mouse only.
- **Now section:** the empty space under "Updated November 2026" now shows the book being read (status `reading` in `content/books`), with a small cover, "Reading", title and author, linking to /books. Desktop and tablet only; it updates when the books file changes.
- **Copy streak:** resets after 3 seconds.

## 30. Health rewrite, archive, favicon, Next wrap (patches 54-56)

- **Health** now follows the October 2026 Notion notes: the Frankl quote, then Morning, Training, Evening, Nutrition, Learning, Mental health (`src/app/health/data.tsx`). Training says plainly that it is mostly gym right now (upper x anterior x posterior), that running, cycling and swimming are on pause because of school (and the treadmill), and keeps the bike, run and swim plans under "On pause". Nutrition shows each meal with its macros.
- **Archive:** the previous page is kept as it was at `/health/archive` ("Health, until October 2026", linked from the bottom of /health, in the sitemap). Both pages share `HealthSections.tsx`.
- **Next project:** after the last project the link goes back to the first and is labelled "Back to the top". Walking Next visits every project once in list order, then returns to the top; the test checks no back-and-forth.
- **Favicon:** the pencil body is now solid white with a thin dark outline (the earlier version had a dark body that looked hollow on dark tabs).
- **Home "Now":** the book cover is larger with its text underneath. **Books:** less space above "Now reading".

## 31. Final check (patch 57)

Run after the Health, 404, Next and favicon changes, against the production build:
- Static: `tsc` with unused-code checks clean; 31 tests pass; build passes; no unused modules, CSS classes, keyframes or console statements.
- Crawl (77 page and screen combinations): no broken images, no missing alt text, one `<h1>` per page (the one miss was a timing flake, confirmed in a browser), no horizontal overflow at 100% or at 200% text.
- Links: 63 checked; the only failures are the known ones (hidden `/fitness`, and Medium and two Canva links that return 403 to bots).
- SEO script: only the known hidden `/fitness` items; sitemap has 35 URLs including `/health/archive`.
- Lighthouse mobile: home 100/100/100/96, projects 99/100/100/96, health 100/100/100/96, project pages 100/100/100/96, books 95/100/100/96 (the books cover images are the heaviest; the 96 is the analytics script that cannot load locally).
- Found and fixed: a React hydration error on the 404 (the address is now shown after mount); the faint line on the 404 failed contrast, so it is now the site's dim grey at full strength (still the quietest text on the page); write-up images now load lazily, which stopped `/projects` from preloading two photos it never showed.
- Features checked by hand: copy streak (plain first copy, line from the second, resets at 3 seconds), row hover sound (no errors), Next chain (23 of 23 in list order, then back to the top), Health and archive pages, feed, manifest, security.txt.

## 32. Home book lift, centred; Books list uses the full row (patch 58)

- The home "Now" column is centred (heading, updated line, cover and text). The cover lifts 8px, its offset shadow growing, only when the cover image itself is hovered (or the link is keyboard-focused); the text under it does not trigger it. Mouse only; off under reduced motion.
- Books list: from large screens (1024px up) each row puts the notes beside the title block instead of under it, so the right-hand blank space is used. Phones and tablets are unchanged.
