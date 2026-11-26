# Animation audit

**Update:** every finding in the table below and the filter-swap missed opportunity are now built and applied in the working tree (patches 17 to 24, listed at the end). Nothing from this audit is left open except items marked in the last table.

Scope: `src/app/globals.css`, `src/components/*.tsx` (not carbon-capture or fitness), the home, projects, books and health pages. Commit `dfb4e66` plus the uncommitted redesign. Rules from the improve-animations playbook. Locked: dark only, bone and petrol, no pills, **no view transitions**, cursor and click sounds stay, editorial and restrained.

## Recon

- **Stack:** plain CSS keyframes and transitions plus a few inline `style` animations. No motion library. Tailwind `transition-*` utilities in a few places.
- **Personality:** quiet and editorial. Most motion is a 3 to 5px nudge or a fade. That is right for the site; nothing here needs to be louder.
- **House curve:** `cubic-bezier(0.22, 1, 0.36, 1)` (a strong ease-out). It is hand-typed 9 times with no token.
- **Frequency:** page entrance (every navigation), row and nav hover (tens of times per visit), mobile menu (several times per visit on phones), contact dialog (occasional), ledger preview (rare, 5s dwell).

## Findings, ranked by leverage

| # | Sev | Category | Where | Finding | Fix (exact values) |
|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `MobileNav.tsx` 71/113/135, `globals.css` 234 to 244, `ContactModal.tsx` 173 to 190, `ProjectLedger.tsx` 249 to 251, `ProfilePhoto.tsx` 12 to 27, `page.tsx` 191 | Neither `prefers-reduced-motion` nor the in-app "Reduce motion" switch affects the mobile sheet, its item stagger, the contact dialog's 14px rise, the ledger preview's scale, the portrait tilt or the trio image zoom. The switch only covers `.rise`, rail links, covers and the a11y menu. | Keep opacity, drop movement. CSS: under `@media (prefers-reduced-motion: reduce)` and `html.reduce-motion`, set `#mobile-menu-panel{animation-name:fade-only}`, `#mobile-menu-panel a, #mobile-menu-panel button{animation:none!important;opacity:1!important}` and `.contact-modal-overlay [role=dialog]{transform:none!important}`. JS: in `ProfilePhoto`, return early from `handleMove` when `matchMedia('(prefers-reduced-motion: reduce)').matches` or `document.documentElement.classList.contains('reduce-motion')`. Trio image: `motion-reduce:transform-none`. |
| 2 | HIGH | Easing | `MobileNav.tsx` 72 | Menu exit is `sheet-out 0.18s ease-in`. `ease-in` starts slow, so the close feels laggy at the exact moment you are watching. | `animation: sheet-out 0.16s cubic-bezier(0.22, 1, 0.36, 1) forwards` (same 6px translate and fade). |
| 3 | HIGH | Frequency | `globals.css` 559 to 568, `page.tsx` delays 0/90/150/230/290/320ms | The page entrance replays on **every client-side navigation**. Home takes 320ms delay + 750ms to fully show About (about 1.07s), and Projects, Books and Health do the same. Navigating is the most frequent thing a visitor does. | `.rise { transform: translateY(8px); animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }` and halve the `--d` values (cap at 160ms). Keeps the feel, finishes in about 650ms. Optional: skip the entrance on in-site navigation (set a `sessionStorage` flag after the first load). |
| 4 | MED | Physicality / touch | `ProfilePhoto.tsx` 12 to 27 | The 7 degree tilt runs on `onMouseMove`. Touch devices emit an emulated mouse event on tap and never fire `mouseleave`, so the portrait can stay tilted after a tap (likely; I could not confirm on a real device). | Switch to `onPointerMove` and return when `e.pointerType !== 'mouse'`; add `onPointerLeave`. |
| 5 | MED | Performance | `MobileNav.tsx` 157; `projects/[slug]/page.tsx` 130 and 199; `not-found.tsx` | `transition-all` animates properties nobody intended (and layout-affecting ones). | Name them: menu button `transition: transform 160ms cubic-bezier(0.22,1,0.36,1), color 160ms ease`; project cards `transition: border-color 200ms ease, background-color 200ms ease` and `transition: transform 200ms cubic-bezier(0.22,1,0.36,1)` on the thumbnail. |
| 6 | MED | Accessibility / touch | `globals.css` 41, 92, 111, 578; `page.tsx` 191 | Hover motion is ungated: nav nudge (3px), ledger row nudge (4px), cover lift (5px), LinkedIn lift, trio zoom. On touch a tap leaves the row shifted until you tap elsewhere ("sticky hover"). | Wrap each `:hover` rule in `@media (hover: hover) and (pointer: fine) { ... }` and keep `:focus-visible` outside it so keyboard behaviour is unchanged. |
| 7 | MED | Easing / duration | `page.tsx` 191 | Trio image zoom is `duration-700`, over twice the UI budget. A 700ms zoom reads as lag on a hover that happens a lot. | `duration-[400ms]` and the house ease-out; keep `scale-[1.035]`. |
| 8 | MED | Performance | `ContactModal.tsx` 170 to 175 | The overlay animates `backdrop-filter: blur(0 to 6px)` over the full viewport; blur radius changes repaint every frame (worst in Safari and on phones). | Keep `blur(6px)` constant on a layer and fade only its `opacity` (`transition: opacity 0.22s cubic-bezier(0.22,1,0.36,1)`). Same look, composited. |
| 9 | MED | Performance / physicality | `BookCoverScroll.tsx` 31 to 36, 48, 52 | Edge auto-scroll adds a fixed 2.2px per frame, so it is 132px/s at 60Hz and 264px/s on a 120Hz display. Also the `rAF` loop rewrites state every frame. | Time-based: store `last = performance.now()` and add `speed * (dt / 16.667)` per frame. |
| 10 | LOW | Cohesion | 9 copies of `cubic-bezier(0.22, 1, 0.36, 1)`; durations 0.14, 0.16, 0.18, 0.2, 0.25, 0.26, 0.28, 0.3, 0.35, 0.5, 0.75s | No tokens, so it drifts. | `:root { --ease-out: cubic-bezier(0.22, 1, 0.36, 1); --dur-feedback: 140ms; --dur-hover: 200ms; --dur-open: 260ms; --dur-enter: 500ms; }` and reference them. Extend the house curve; do not swap in a new one. |
| 11 | LOW | Cohesion | `globals.css` 255 | `body { transition: background-color .25s, color .25s }` is left over from the theme toggle. Dark only now, so it can only cause a stray fade. | Delete the `transition` line. |
| 12 | LOW | Performance | `globals.css` 59 | Skip link animates `top`. | `transform: translateY(-76px)` to `translateY(0)`, `0.18s cubic-bezier(0.22,1,0.36,1)`. |
| 13 | LOW | Physicality | `MobileNav.tsx` 157 to 166 | The hamburger rotates 90 degrees while its icon swaps instantly from bars to cross, so you see a pop mid-rotation. | Stack both icons and crossfade: `opacity` 160ms plus `rotate(-90deg to 0)` on the incoming one. If that feels fussy, drop the rotation and crossfade only. |
| 14 | LOW | Stagger | `MobileNav.tsx` 113, 135 | Item stagger is 35ms (inside the 30 to 80ms band, fine) but each item takes 280ms on plain `ease`, so the last link finishes at about 515ms. | `item-in 0.22s cubic-bezier(0.22,1,0.36,1)`, 25ms stagger, last item done by about 370ms. |

Checked and fine: modal enter (opacity 0.25s and 14px rise on the house ease-out, exit symmetrical), accessibility menu open (0.14s, `transform-origin` set to the corner), cursor (physics-based, now sleeps when idle), `.proud-link` underline, the ledger preview fade, `scroll-behavior: smooth` (turned off by the in-app switch), embed skeleton (stopped under reduced motion).

## Missed opportunities (additive, grounded in a real seam)

1. **Filter and sort changes teleport.** Choosing a discipline on Projects swaps 23 rows for 7 instantly (`ProjectLedger.tsx` filter, `BooksList.tsx` sort and genre toggles). A 180ms `opacity 0 to 1` plus `translateY(6px to 0)` on the list, keyed on the active filter, explains that the list changed without slowing anything. Under reduced motion: opacity only. This is the only place the site's content swaps without a cue.
2. **Hero actions (just added):** they inherit `.rise` at 290ms, so they land with the tagline. Fine as is; do not add more.

Not recommended: a page transition or shared-element morph (view transitions froze this site before), or scroll-triggered reveals (the site is already a calm reading experience; the 23-row ledger would turn into 23 animations).

## Feel-checks the code cannot settle

- The 500ms entrance versus the current 750ms: judge on a real navigation, not a reload.
- The blur-to-opacity change on the dialog: compare side by side in Safari at 1x speed and 0.25x (Safari devtools, Timelines).
- Hamburger crossfade versus rotate: only visible on a device.

## Built (applied; patches in `docs/ux-audit/patches/`, apply in order, each reverts with `patch -R -p1`)

| Patch | Findings | What changed | Files |
|---|---|---|---|
| `17-page-entrance-shorter` | 3 | `.rise` is 0.5s (was 0.75s) with an 8px rise (was 12px); every page's `--d` stagger is halved in CSS (`calc(var(--d) * 0.5)`), so the longest delay is 160ms (was 320ms). Measured: 0.5s, max delay 160ms. | `src/app/globals.css` |
| `18-menu-close-easing-and-stagger` | 2, 14 | Menu exit is `0.16s cubic-bezier(0.22, 1, 0.36, 1)` (was `0.18s ease-in`); items `0.22s` on the same curve with a 25ms stagger starting at 40ms (was 0.28s `ease`, 35ms from 60ms). | `src/components/MobileNav.tsx` |
| `19-reduced-motion-coverage-and-portrait-tilt` | 1, 4, 7 | Under the OS setting and the in-app switch: the mobile sheet and its items fade only (no slide, no stagger), the contact dialog fades in place, the ledger preview does not scale, trio images do not zoom, and the portrait tilt is off. The tilt also now follows pointer events and ignores touch, so a tap cannot leave it tilted. Trio hover zoom is 400ms (was 700ms). | `src/app/globals.css`, `src/components/MobileNav.tsx` (`data-state` hook), `src/components/ProjectLedger.tsx` (`.ledger-preview` class), `src/components/ProfilePhoto.tsx`, `src/app/page.tsx` |

Verified in Chromium against a production build (`scripts/motioncheck.mjs`), normal mode, OS reduced motion and the in-app switch: entrance 0.5s; menu `sheet-in 0.26s` / `sheet-out 0.16s` normally and `fade-in` / `fade-out` with 0 delay when reduced; dialog transform `none` when reduced; trio hover `scale(1.035)` over 0.4s normally and `none` when reduced; ledger preview stays centred (`translate(-160px, -200px)` for its 320x400 box); portrait tilts on mouse movement only in normal mode, and not after a touch tap. Open-state checks unchanged (0 focus leaks, Escape works, focus returns). Lighthouse home and projects 100/100/100/96, CLS 0.

### Second batch (patches 20 to 24)

| Patch | Findings | What changed | Files |
|---|---|---|---|
| `20-hover-motion-mouse-only` | 6, 7 | Hover nudges (nav links, ledger rows and leaders, cover lift, LinkedIn lift, trio zoom) apply only under `(hover: hover) and (pointer: fine)`; `:focus-visible` is unchanged. The trio zoom moved from Tailwind's ungated `group-hover` to a gated `.proud-zoom` class. | `src/app/globals.css`, `src/app/page.tsx` |
| `21-transitions-named-static-blur-skiplink` | 5, 8, 11, 12 | `transition-all` replaced by named properties (menu button, project cards and link buttons, 404). The contact dialog keeps a constant `blur(6px)` and fades only opacity (`0.22s var(--ease-out)`). Skip link parks with `translateY(-76px)` instead of animating `top`. Leftover `body` colour transition removed. | `globals.css`, `not-found.tsx`, `projects/[slug]/page.tsx`, `MobileNav.tsx`, `ContactModal.tsx` |
| `22-cover-strip-scroll-time-based` | 9 | Edge auto-scroll is scaled by real frame time with a sub-pixel carry, so it moves the same distance on 60, 90 and 120Hz screens and with dropped frames. | `BookCoverScroll.tsx` |
| `23-icon-crossfade-and-list-swap-fade` | 13, missed opportunity 1 | Hamburger and cross icons crossfade (150ms) instead of swapping mid-turn; the hamburger turn is off under reduced motion. Filtering or sorting Projects and Books plays an 0.18s fade and 6px settle on the list (opacity only under reduced motion; nothing animates on first load). | `MobileNav.tsx`, `ProjectLedger.tsx`, `BooksList.tsx`, `globals.css` |
| `24-ease-out-token` | 10 | `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` in `:root`, replacing 16 hand-typed copies in CSS and inline styles (the 3D demo's copies were left alone). Durations are documented in a comment, not tokenised. | `globals.css`, `ContactModal.tsx`, `MobileNav.tsx`, `ProfilePhoto.tsx`, `ProjectLedger.tsx` |

Verified on a production build in Chromium (`scripts/motioncheck2.mjs`): row nudge `translateX(4px)` with a mouse and `none` on a touch device; strip 132px in 1s at maximum speed both normally and with the CPU throttled 6x; filter and sort play `swap-in 0.18s` (`fade-in` under OS reduced motion) and nothing plays on load; hamburger icon opacities swap `[1,0]` to `[0,1]`; skip link at top -60 unfocused, 16 focused, back to -60 after focus moves on; dialog overlay `blur(6px)` constant from the first frame with opacity 0 to 1; `--ease-out` resolves and `.rise` uses it. Regression: 0 focus leaks, Escape and backdrop work, focus returns, no overflow at 390 or 1280, CLS 0, Lighthouse home 100/100/100/96 and books 96/100/100/96 (one run showed 94 with TBT 148ms while the machine was under load; two reruns gave 96 and TBT 26 to 32ms).

Not verifiable here: whether the static-blur dialog is smoother in real Safari or on a phone (headless Chromium does not show GPU cost), and the hamburger crossfade versus rotation "feel". Both are the feel-checks listed above.
