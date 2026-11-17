# Handoff — Carbon Capture 3D Demo

*(Transient, session-specific. Repo-wide agent conventions live in `CLAUDE.md`, not here.)*

## Goal

Polish the truck-exhaust carbon-capture project: the 3D demo (`src/components/carbon-capture/Scene3D.tsx`) and its project page. Iterative fix-and-verify loop driven by user feedback, not a first build. Rationale for earlier rounds is in Claude's memory file `carbon_capture_project.md` (not in this repo).

## Current State (verified in browser pane, headless Chrome and `tsc --noEmit`)

**URLs (renamed this round).** Project page `/projects/carbon-capture-model` (`content/projects/carbon-capture-model.mdx`); demo `/projects/carbon-capture-model/demo`. The old `/projects/truck-exhaust-carbon-capture[/demo]` URLs 308-redirect via `redirects()` in `next.config.mjs` (checked with curl). `/projects/carbon-capture` is a different, existing page (direct-air-capture research) and was not touched, so don't reuse that slug. `src/app/dev-preview/` is an untracked scratch copy of the demo.

**This round (items 1-4 merged in PR #4; the dual-tailpipe change in item 3 is uncommitted):**
1. **Forced dark mode vs. the truck button.** Chrome's force dark recoloured `TruckButton` (reproduced with CDP `Emulation.setAutoDarkModeOverride`). Rule found by testing: it inverts SVG fills, text and borders darker than ~150 brightness and darkens CSS backgrounds lighter than ~205, including SVG gradients. `color-scheme` opt-outs do not work when the OS is light. The truck now keeps dark/mid colours as CSS backgrounds and light colours as SVG fills (comment above `.truck-cta` in `globals.css`). On/off screenshots match pixel for pixel.
2. **Same rule applied to the demo UI.** Tutorial knob/track/dots, legend swatch outlines, accent edges on the Guide chip and tutorial card, and tour-nav dots were recoloured or moved from borders to backgrounds. The tutorial's "Skip tutorial" is now a solid pill. I could not reproduce the reported "Skip hidden" in five force-dark variants, so that report is not confirmed fixed.
3. **Tail pipes (3D model).** `ExhaustStackParts` in `Scene3D.tsx`: dual stacks at ±`TAILPIPE_Z` (34in), each with a short dark pipe, perforated chrome heat shield (canvas texture) on the cab roof, and a bent pipe with angled mouth. The original stack (`stackX`/`stackZ`) is now the middle collector, with a crossover pipe (`STACK_CROSS_Y`) joining it to both tailpipes; the TEG sleeve and duct tap still attach to it. `TRUCK.stackHeight` is 168. Fixed two z-fights (mouth disc over collar cap, shield caps against collars) by using open-ended cylinders. The button truck's stack is back to its original small shape.
4. **Page text** rewritten in plainer language: what amine is, what it does to CO₂ when cool, what heating to 90-100°C does, matching the model's steps.

**Earlier rounds (merged in PR #3):** TEG housing clickable; `EMISSIVE_CLAMP = 0.95` with hover boost 0.12; `useFadeGroup` `depthWrite` from real opacity (cab items no longer vanish); fins glow `#6fc3e0`; `Label` `facingDir` fading.

## Modified Files

- `src/components/carbon-capture/Scene3D.tsx` — stack, legend, guide chip, nav dots.
- `src/components/carbon-capture/Tutorial.tsx`, `captureUnitParts.ts` — force-dark colours; stack height.
- `src/components/TruckButton.tsx`, `src/app/globals.css` — force-dark-safe truck.
- `content/projects/carbon-capture-model.mdx`, `src/app/projects/carbon-capture-model/`, `next.config.mjs` — rename, redirects, text.
- `findings.md`, `fixes.md`, `CLAUDE.md` — untracked scratch from earlier QA rounds, reference only.

## Failed Attempts

- `color-scheme: dark` on the truck (and `light dark` on `html`) did not stop force dark when the OS preference is light.
- An SVG gradient for the trailer was still darkened; it had to be a CSS gradient capped near brightness 205.
- Borders cannot be protected by colour (even `#a3a8ae` was inverted); use a 1px background frame instead.
- Earlier: three `tanks` camera distances rendered identically because `HologramAutoRotate` overwrote `camera.position` (`transitioningRef` guard); screenshot-coordinate clicks on the bare TEG housing hit the chimney instead (read the `FactsCard` text as ground truth); stale dev builds (`ChunkLoadError`) needed `preview_stop` + `rm -rf .next`.

## Immediate Next Steps

- **Code review must check force dark:** any new light CSS background (above ~205 brightness), dark SVG fill, dark or translucent-white border, or coloured border is likely to break under Chrome force dark. Recheck the truck button, tutorial card, legend, Guide chip and nav. The WebGL scene itself is not recoloured.
- **Unconfirmed:** the reported hidden "Skip tutorial" under force dark; get a screenshot and Chrome flag variant from the user.
- **Known limit:** iPhone Safari has no Fullscreen API, so there is no full-screen button there. Landscape shows a one-time "Add to Home Screen" tip instead (`A2HS_DISMISS_KEY`), hidden once dismissed. Android Chrome and iPad get the button. Not tested on a real iPhone.
- Still open from earlier: tidier assembled layout; reconsider `enableZoom={false}`; richer background; hover tooltips on pipes; Spline reference.
- Nothing from this round is committed; wait for the user's go-ahead.
