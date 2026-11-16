# Handoff — Carbon Capture 3D Demo

*(Transient, session-specific. Repo-wide agent conventions live in `CLAUDE.md`, not here.)*

## Goal

Polish the truck-exhaust carbon-capture interactive 3D demo (`src/components/carbon-capture/Scene3D.tsx`, previewed at `/dev-preview/carbon-capture-3d`) for a portfolio/internship use case. Currently in an iterative fix-and-verify loop driven by direct user feedback, not a first build — see the long project history in Claude's own memory file `carbon_capture_project.md` for prior rounds' rationale (not part of this repo).

## Current State (verified live in the browser pane + `tsc --noEmit`, this session)

Just finished a round of 5 user-reported fixes, all confirmed working via screenshots and in-scene clicks (not just code review):

1. **TEG housing clickable.** `TEGUnit`'s outer housing mesh (`Scene3D.tsx`) had `raycast={() => null}` so clicks could reach the modules/fins/controller inside it — but that also meant clicking the bare housing did nothing. Re-enabled raycasting on it with its own `onClick`/`onPointerOver` handlers, but *without* unconditional `stopPropagation()`: fiber calls the nearer (housing) handler first, then the farther (module/fin/controller) handler still fires after and overwrites the selection, so precise clicks on a sub-part still win. `e.intersections` + a `userData.partId` tag on the 3 child parts decides whether to stop propagation at all. New `PART_FACTS.tegUnit` entry added.
2. **Hover/select glow clipping to flat white.** Added `EMISSIVE_CLAMP = 0.95` and wrapped every `emissiveIntensity` write that stacks a hover boost on an existing pulse glow (module-interior chambers, `BulkBin` fill, `TEGSleeve`, `TEGUnit` modules) in `Math.min(EMISSIVE_CLAMP, ...)`. Cut every hover boost to a flat 0.12 (was 0.16–0.22).
3. **Items disappearing inside the translucent cab on `module-exterior`.** Root cause found (not just worked around, unlike an earlier round's attempt): `useFadeGroup`'s `depthWrite` was keyed to the truck's overall opacity, never the cab-specific tint, so a visually-translucent cab panel kept writing depth and corrupted sort order against the other overlapping cab panels at their seams. Fixed by basing `depthWrite` on the real rendered opacity (`opacity * tint`) and giving tinted meshes a high `renderOrder` (50) so they always draw last.
4. **TEG heat-exchanger fins blending into the housing color.** Gave the fins their own cool-blue emissive glow (`#6fc3e0`, tied to `open * glowPulse() * 0.5`) plus a lighter base color (`#e3ecf2`, was `#c7ccd1`) — the cold-side complement to the hot side's existing orange glow.
5. **Labels staying visible on the "back" of a part.** Added optional `facingDir` prop to the `Label` component — a world-space direction (derived per-step from that step's own `cameraPos - cameraTarget` via `stepFacingDir()`) that each frame is dotted against the label-to-camera direction, fading opacity via `THREE.MathUtils.smoothstep`. Wired to all 13 `<Label>` calls in `Rig` via 5 shared constants (`MODULE_EXTERIOR_FACING`, `MODULE_INTERIOR_FACING`, `TANKS_FACING`, `BULK_BIN_FACING`, `TEG_FACING`).

**Not yet done:** nothing committed or pushed — user's standing preference is to stay local/uncommitted until they explicitly review and approve.

## Modified Files

- `src/components/carbon-capture/Scene3D.tsx` — primary file, all 5 fixes above.
- `src/app/globals.css` — `cc-rotate-hint` keyframe (from an earlier round's mobile-rotate-gate feature, unrelated to this round).
- `findings.md`, `fixes.md` — untracked scratch files from an earlier QA-audit round (two-subagent findings/fix-plan exchange). Reference only, not meant to be committed as-is.
- *(Unconfirmed/assumption: `package.json`, `package-lock.json`, `src/components/CustomCursor.tsx`, `src/components/SiteWrapper.tsx` show as modified in `git status` from before this session's work — not touched this round, origin not verified here.)*

## Failed Attempts

- Three different camera-distance values for the `tanks` step all rendered pixel-identical in an earlier round — turned out to be `HologramAutoRotate` silently overriding `camera.position` every frame from a stale "home" position captured mid-transition. Not this round's bug, but the same `transitioningRef` guard this round's code still depends on.
- This round: several screenshot-coordinate clicks aimed at "bare TEG housing" instead landed on the Capture Module's overlapping chimney or empty space (camera-angle/perspective made the two look adjacent on screen). Resolved by zooming in, orbiting to isolate the housing, and reading the resulting `FactsCard` text back as ground truth rather than trusting pixel position alone.
- A stale dev-server build (`ChunkLoadError`, Fast-Refresh full-reload loop) and a stale-closure HMR error (`finsGlowRef is not defined` after renaming it to `finsMatRefs`) both required a full `preview_stop` + `rm -rf .next` + fresh tab (not a soft reload) to clear.

## Immediate Next Steps

- Still open from earlier phases (not this round): rework the assembled (non-exploded) layout into a cleaner rectangle; reconsider `enableZoom={false}` on `OrbitControls`; richer/less-flat background environment; hover tooltips on the inter-component pipes; review a user-provided Spline reference for color/material ideas.
- Waiting on the user for either more fix requests or explicit go-ahead to commit — nothing should be committed without that.
