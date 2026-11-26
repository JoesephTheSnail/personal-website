# Questions for Arnav

Nothing below was changed in your copy. Each item says what the code says today, the options, what I did in the meantime (if anything), and what to change if you choose differently. Paths are relative to the repo root.

---

## 1. Should sounds be on by default for a first-time visitor? (Your open question)

**What I saw.** `src/lib/sound.ts` makes short synthesized tones (peak gain 0.05) on: a sidebar link click (`playTick`), opening or closing the contact modal, mobile menu and accessibility menu (`playPop`), and the newsletter subscribe (`playSuccess`). **There are no hover sounds any more.** Measured: hovering a project row creates no AudioContext; the first click creates one. There is **no mute control anywhere** (no UI, nothing in `localStorage`); "Reduce motion" does not mute either.

**Recommendation: default off, with a small Sound toggle in the accessibility menu.** A recruiter or admissions reader opening the site in an office or library gets a beep on the first click, and the site gives no way to stop it. The tones are quiet, so this is a polish and trust issue, not a bug, but the missing mute is the real gap.

**Default I chose.** Left as is (you said not to change the default or remove sounds).
**To change:** add a `sound-enabled` key to `src/lib/useAccessibilityPrefs.ts`, a third button in `src/components/AccessibilityMenu.tsx`, and an early `return` in `tone()` in `sound.ts` when it is off. About 20 lines. Say the word and I will write it.

---

## 2. "I've shipped over a dozen projects"

**Where:** `src/app/page.tsx` line 131 (second About paragraph): "I've shipped over a dozen projects along the way."
**Real count:** 24 files in `content/projects` (excluding `_template`): **23 published, 1 upcoming** (Triathlon Training). The Projects page itself says "23 projects across 6 disciplines".
**Options:** (a) keep, "over a dozen" is true but undersells 23; (b) "I've shipped 23 projects along the way."; (c) "...nearly two dozen projects...".
**Default:** unchanged. **To change:** edit that one line; keep it in step with `/projects`, which counts automatically.

## 3. MindSet called an "app" when its page says it is a Figma prototype

**Where it says "app":** `src/app/page.tsx` line 126 (hero bio: "MindSet, a mental wellness app for teenagers"), line 30 (trio title "MindSet Wellness App"), the trio CTA "View app", and `content/projects/mindset-app.mdx` (title "MindSet Mental Wellness App", description "A mental wellness app designed to... built in Figma").
**What the project page says:** "Built a full high-fidelity Figma prototype ... for a modular teen mental wellness app".
**Options:** (a) keep, it is described honestly one click deeper; (b) "a mental wellness app prototype for teenagers" in the bio and "View prototype" on the trio card; (c) leave the bio, change only the CTA.
**Default:** unchanged. A reader who clicks "View app" and lands on a Figma prototype may feel it was oversold; "prototype" costs one word.

## 4. Toronto

Everywhere the code says it: page title and meta description (`src/app/layout.tsx`: "Writer, Student & Builder in Toronto", "Toronto-based"), JSON-LD address (Toronto, Ontario, CA) and description, hero eyebrow "TORONTO, ONTARIO" (`page.tsx`), sidebar eyebrow (`TopNav.tsx`), bio ("a high school student from Toronto"). Consistent. Flagging only because you asked: confirm you are comfortable with city-level location for a minor appearing in structured data. Default: unchanged.

## 5. "Lifting 4-5x a week", TuffTek and NewGen Health wording: RESOLVED

You confirmed you removed TuffTek and NewGen on purpose because you no longer work there. Nothing to do; the redesign has no job lines and none were added. (For the record, the Health page says "Push/Pull/Legs split 3 times a week ... In winter ... 5 days of weights plus one run", and `main` still carries the old TuffTek/NewGen line if that branch ever ships.)

## 6. Lines that read weak, generic or self-undercutting (not edited)

| # | Where | Exact line | Why | Suggested alternative |
|---|---|---|---|---|
| a | `page.tsx` About, para 1 | "Got into health and technology early, and it really hooked me." | Generic hook phrase ("really hooked me") | "Health and technology got me early, and I've been building ever since." |
| b | `page.tsx` About, para 1 | "built before I really knew what I was doing." | Charming, but an admissions reader may take it as a caveat on the first project you name | "built while I was still learning how." (or keep: it is honest and human) |
| c | `page.tsx` closing | "If any of this sounds interesting, or you just want to talk health, technology, or ideas, I'd love to hear from you." | Stock closing line, two clauses doing one job | "Want to talk health, technology, or ideas? Get in touch." |
| d | `content/projects/carbon-capture-model.mdx` Outcome | "Turned a Grade 9 idea into a worked-out system for capturing CO₂ from truck exhaust, plus a 3D model that shows how each part works." | "worked-out system" is vague; a sponsor will ask what was verified | "Designed a CO₂ capture unit for diesel trucks and built a 3D model that shows how each part works." (the page's own "Current limitations" section already says it is unverified) |
| e | `carbon-capture-model.mdx` line 15 | "Click here to read the original Grade 9 version." | Link text is just "here" (Lighthouse SEO 92 on that page) | Link the phrase instead: "Read the original Grade 9 version." I gave the link an `aria-label` ("here, to read the original Grade 9 version (opens Medium)") so screen readers get a real name without touching the wording (patch 06), but Lighthouse still scores the visible text, so the SEO 92 on that page stays until the wording changes. |

## 7. First screen has no proof line, and phones had no visible action until the bottom

**Hero actions: APPLIED at your request.** "Get in touch →" and "Read my newsletter ↗" now sit under the tagline (same links and wording as the closing section). Checked at 390 and 1280 wide: both on the first screen, "Get in touch" opens the dialog with focus on Close and returns focus to the button on close, newsletter link correct, no console errors. Screenshots: `screenshots/hero-applied-home-*` (vs `current-dev-home-*`). Revert: `patch -R -p1 < docs/ux-audit/patches/applied/PROPOSAL-hero-actions.APPLIED.patch`.

**Still a proposal, not applied:** `PROPOSAL-proof-before-coming-up.patch` swaps two sections so "Three projects I'm proudest of" comes before "Coming up" (which lists an upcoming project before three shipped ones). Apply: `patch -p1 < docs/ux-audit/patches/PROPOSAL-proof-before-coming-up.patch`.

## 8. Trio cards show no outcome

Only Pre-Sleep Screen Restriction has a bold outcome phrase in its description ("A self-run study of 8 people across 85 nights."). The other two (carbon capture, MindSet) have none, so I could not give all three cards an equal proof line from existing text and did not invent one. If you want a proof line on every card, write one per project (a number, a placement, a result). Default: unchanged.

## 9. TikTok (@arnav.gym)

Link returns 200. Still in: contact dialog ("TikTok / Fitness", `ContactModal.tsx` line 13), JSON-LD `sameAs`, and the Gym TikTok project. Nothing removed. Odd only in that the contact dialog puts a fitness account beside LinkedIn, Substack and Medium for a recruiter audience; the reviewer suggested keeping it on the Health page only. Your call; default unchanged.

## 10. Links to open by hand (bots are blocked)

| Link | Result | Where |
|---|---|---|
| https://www.linkedin.com/in/arnav-chandra-b33660293/ | 999 | home, contact dialog, JSON-LD |
| https://medium.com/@arnav0 | 403 | contact dialog, JSON-LD |
| https://medium.com/@arnav0/eco-trucks-3c9d5dc10f63 | 403 | carbon-capture-model page |
| https://canva.link/2pe0tqkzv9oospj | 403 | 24-hour-hackathon |
| https://canva.link/wxcbpkt78bqdhrt | 403 | meta-challenge |

Everything else (60 links checked, incl. Calendly, Substack, TikTok, Google Docs/Slides/Drive, Figma) returned 200. `/fitness` is a 404 on purpose.

## 11. "No pill shapes anywhere", but a few remain

`border-radius: 999px` is used on: the accessibility corner button (a circle) and the on/off switch inside its menu (a pill, `globals.css` `.a11y-switch`), the little status dots (`ProjectLedger.tsx`, `books/page.tsx`: `rounded-full` 6px dots), the back button on the full-screen 3D demo (`SiteWrapper.tsx`), and the embed loading spinner. The switch is the one that reads as a pill. **Options:** (a) keep, they are controls and dots, not the decorative pills you removed; (b) make the switch and corner button lightly rounded squares. Default: unchanged.

## 12. Contrast fixes changed three greys slightly

To pass WCAG AA I raised `--fg-45` from 45% to 52% bone, `--fg-dim` from 40% to 52%, `--fg-dimmer` from 25% to 50% (only the 404 page), and made the year numerals on Projects use `--fg-45` instead of `--fg-30` (they are real headings, 2.4:1 before, 4.9:1 now). Same bone hue, so the palette is intact, but the quiet numerals are a touch louder. **If you want them quieter:** mark the year headings `aria-hidden` and add a visually hidden heading, or accept 3:1 only on the numerals (`--fg-30` is 2.4:1, so it would need about 37% to pass).

## 13. 65% of text is under 16px

Eyebrow labels are 10 to 11px, notes 10.5px, descriptions 14px, secondary paragraphs 15px. This is the design, and legible on a phone, so I did not touch it. It is the biggest remaining accessibility cost (small caps at 10.5px with wide tracking are hard for many readers). **Recommendation:** raise every 10 to 11px label to 12px. Default: unchanged.

## 14. One share image for every page

All project and category pages now carry an og:image and twitter:image (patch 06), but it is the same generic `/opengraph-image` as the home page. A shared link to the carbon capture project shows a generic card. **Option:** per-project share images from `public/home/` (sleep study, carbon capture unit, MindSet already exist). Default: generic image.

## 15. Navigation breakpoint moved from 768px to 1024px (patch 01)

The 270px sidebar at 768px left a 358px column and a horizontal scroll on the home page. It now switches at 1024px; below that, every phone and tablet gets the full-width top bar and menu. If you would rather keep a sidebar on iPad portrait, the alternative is a 220px sidebar between 768 and 1023px with `lg:` values above. Default: 1024px.

## 16. Smaller notes

- **Preview on Projects:** the artwork preview needs a 5 second hover or keyboard focus (`DWELL_MS` in `ProjectLedger.tsx`) and has no touch route. Nothing important is hidden behind it. 5s is long; 1.5 to 2s would be noticed more often.
- **404 page:** still the old look (rocket button, "This page took a gap year."). I only fixed the missing `<h1>`, contrast and tap target.
- **/fitness:** `HIDDEN = true`, returns 404. Not flipped. Its canonical points at the home page and it has no `<h1>`; fix when you unhide it.
- **"Updated November 2026"** and the big "07" next to Now (aria-hidden, unlabeled): a reader sees a bare number. Options: label it ("07 roles") or remove the numeral.
- **Mindset Matters cadence:** earlier notes said "bi-weekly" somewhere; I searched `src` and `content` and found only "monthly" now.
- **Lighthouse "errors in console"** on the local build is the Vercel Insights and Speed Insights scripts returning 404 on localhost. They exist on Vercel; ignore.

---

## 17. Decisions from the latest round

1. **"Put a star on Mindset Matters":** I starred the **project** in the Projects list. If you meant the "Mindset Matters" row in the Now list on the home page, say so (I would add a ★ there instead or as well).
2. **The space left by the "23":** I left it empty. Editorial whitespace beside a title is fine, and nothing I could add would earn its place yet. One purposeful option: a short row of the six standout projects as links on the right, so the stars are findable without scanning 23 rows. Category pages (Creative, Research, ...) still show their own big outlined count; say if they should go too.
3. **Project copy:** please skim the rewrites for anything that no longer sounds like you. Easy revert for any page: `cp ~/ux-audit-tools/copy-backup/<name>.mdx content/projects/`. Robotics now shows the same idea twice (description and Outcome both open with "Building and programming autonomous robots"); a one-line fix is to shorten the Outcome.
4. **Which star buttons to place on the project pages:** see the live preview at `/dev-preview/star-buttons` (tick "Show hover state"; the static copy is `docs/ux-audit/mockups/star-buttons.html`). Pick any of: Pre-Sleep (phone dims, moon rises), MindSet (breathing circle), InsuSense (glucose trace and a drop), AnyWear (swinging hanger), Mindset Matters (envelope opens). They are simpler than the truck by design (about 1.5KB each, pure CSS and SVG); if you want them richer, say which.
5. **Heavy rule above the Now list:** the second reviewer suggested adding the 2px bone rule used above "Three projects I'm proudest of" to anchor the list. I left it out to keep the section calm; say if you want it.
