# Handoff — Website Overhaul (home, Projects, Books, Health built; awaiting review)

*(Transient. Repo-wide rules live in `CLAUDE.md`. Decisions also saved in Claude's memory files `website_overhaul_decisions.md` and `feedback_design_research_process.md`.)*

## Goal

Overhaul arnavchandra.com so it looks professionally designed, not templated. Everything is tested on localhost (`npm run dev`, port 3000), reviewed by the user, and **nothing is committed or pushed until they say so**. Every page follows the same process: research real portfolio sites in the Browser pane, work out why each works, combine the best parts (see memory). Home, Projects, Books and Health are built; next up is review, then the remaining pages.

## Current State

**Verified** (Browser pane at 1360 and 375 wide; `tsc --noEmit` clean; `npm test` 31/31):

- **Dark only (user removed light mode):** no toggle, `html.light` rules, theme hooks or `lightColor` props; `:root` sets `color-scheme: dark`. Don't reintroduce theme branches.
- **Palette "bone and petrol":** one accent. Dark `#121211` / bone `#EEE9DF` / petrol `#5BA3C2`. Tokens in `src/app/globals.css` (`--accent`, `--bg`, `--fg`). `src/lib/categoryMeta.ts` is now just `{label, slug, order}` per discipline. Tailwind `white` is remapped to bone in `tailwind.config.ts`.
- **One typeface** (no pill shapes anywhere): Instrument Sans via `next/font` in `layout.tsx`.
- **Home (`src/app/page.tsx`):** portrait with petrol offset block, big name, bio, `NowSection`, equal-weight trio of proudest projects (images in `public/home/`), dotted index, closing statement. Entrance animation is `.rise` with `--d`. Trio links are "View report/model/app" (`cta` in `PROUDEST`); carbon capture image is `public/home/carbon-capture-unit.jpg` (renamed to bust next/image's cache). `NowSection.tsx` is ruled rows.
- **Highlights:** inline `**phrase**` in descriptions (`src/lib/highlight.ts`); `getAllProjects()` returns `description` and `descriptionRich`; only `ProjectLedger.tsx` renders it.
- **Projects ("the ledger"):** `ProjectLedger.tsx`: discipline filter, year-grouped dotted rows, 5 s hover preview from the `ART` map, `featured: true` stars. `/projects/[category]` reuses it.
- **Books:** cover strip (`BookCoverScroll.tsx`) kept, ruled rows, genre toggles, no book counts. **Health:** sticky section rail, dotted-leader quick facts.
- **Newsletter-derived projects:** `tiny-hearts.mdx`, `school-livestream.mdx`, `thawless-poem.mdx`. Photos only on the project page (`public/projects/`).
- **Content:** new About copy, sleep-study PDF, `gym-tiktok.mdx` (account is live).
- **Navigation** (`TopNav.tsx`, `MobileNav.tsx`, `navItems.ts`): hairline sidebar, numbered text links; `ContactModal.tsx` is an editorial sheet.

## Newer work (this session, all uncommitted)

- **UX audit** in `docs/ux-audit/` (`AUDIT_REPORT.md`, `QUESTIONS_FOR_ARNAV.md`, numbered `patches/`, `scripts/`). Measure on a production build (`npm run build && npm start -p 3002`), not dev.
- **Star project buttons:** `src/components/StarButton.tsx` (bed, cloud+sun, insulin pen, price tag, envelope), styles in `globals.css` (`.star-cta`), mapping in `src/lib/starButtons.ts`, preview at `/dev-preview/star-buttons` (noindex). The truck stays on carbon capture.
- **Favicon:** `src/app/icon.svg` is a large pencil on a transparent background with a bone outline (so it reads on dark and light tabs). The Apple icon puts it on solid dark. `icon.png`, `apple-icon.png`, `favicon.ico` come from `docs/ux-audit/scripts/favicon.mjs`.

## SEO

Done: per-page titles, descriptions and canonicals; a unique share image per project and discipline page (`src/app/projects/[slug]/opengraph-image.tsx`, `twitter-image.tsx`); Person, WebSite, CreativeWork and BreadcrumbList JSON-LD; complete sitemap; `robots.txt` blocks `/api/` and `/dev-preview/`; `seoTitle` frontmatter for long titles (`src/lib/projects.ts`); descriptive link text on the carbon capture page; `dev-preview/` 404s on Vercel.

Also done: `/feed.xml` RSS and `/.well-known/security.txt`. Still to do: submit the sitemap in Search Console after deploying; re-run `docs/ux-audit/scripts/seo.mjs` and `lighthouse.mjs` after content changes; `gmo-bananas` and `tiny-hearts` descriptions are a little short (about 62 and 65 characters); unhide `/fitness` only with a real canonical and an `<h1>`.

## Unconfirmed (not yet checked)

- No `npm run build` since the latest edits; check the `ProjectLedger.tsx` preview fade after a 5 s dwell.
- iPhone Safari untested (no Xcode).

## Modified Files

Run `git status`. Untracked scratch to ignore: `findings.md`, `fixes.md`, `src/app/dev-preview/`.

## Failed Attempts and Gotchas

- Mutate gray-matter's cached `data` and highlights vanish on the second call; copy it.
- Tailwind config changes need a dev-server restart plus `rm -rf .next`.
- Browser pane is throttled; use headless Chrome (`--use-angle=swiftshader`) for WebGL. Wide layouts need `resize_window` 1360.
- `/opengraph-image` returned 500 in dev (pre-existing); it builds fine in production.

## Immediate Next Steps

1. Next ideas from the deep dive (`docs/ux-audit/AUDIT_REPORT.md` section 27): CSP/HSTS in `vercel.json`, and a CV download (needs the user's PDF in `public/`).
2. Don't build a page transition (view transitions froze the site). Truck button, demo pulses and fitness colours stay as they are.
3. Health content is in `src/app/health/data.tsx` (current, from the user's Notion notes, October 2026) and `src/app/health/archive/data.tsx` (the old page, at `/health/archive`). The 404 is a full-screen flashlight game (`src/components/LostInTheDark.tsx`, styles under "404" in `globals.css`). `SiteWrapper.tsx` also adds `big-text` to `<html>` for large text; keep `.row-wrap` rows for any new title-plus-label rows.
4. Project order lives in `src/lib/projectOrder.ts` (list and Next project share it; tested). The home "Now" column shows the book with `status: reading`. Before any commit: leave out `docs/ux-audit/` (untracked; screenshots are gitignored). `npm run lint` runs `tsc --noEmit`.
5. Commit only on the user's go-ahead.
