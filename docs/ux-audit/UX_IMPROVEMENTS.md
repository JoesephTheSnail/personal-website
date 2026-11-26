# UX design improvements

**Update:** items 1, 2 and 3 below were built and are applied in the working tree, each as its own revertible patch (see "Built" at the end). Everything else is still a suggestion.

Reviewed from the production screenshots (390, 768, 1280 wide) and the code, as an admissions reader, recruiter or sponsor contact. Everything below respects the locked decisions (dark only, bone and petrol, one typeface, no pills, equal-weight trio, the ledger). Each item reuses content that already exists. You removed TuffTek and NewGen on purpose, so no job lines are suggested.

## What already works (keep)

Name, location, role and photo in the first screen; the two actions now visible without opening the menu; the equal trio; the ledger's discipline filter and year groups; the "Explore the 3D model" button as the single primary action on a project page; plain-text nav with the active page in petrol.

## Ranked improvements

| # | Impact | Where | What I saw | Proposed fix (existing content only) |
|---|---|---|---|---|
| 1 | High | Project pages (`projects/[slug]/page.tsx`, ends at the MDX body) | Every project page is a dead end. After the last paragraph there is no next step: no next project, no way to get in touch, no link to the newsletter. A reader who is convinced has to scroll back up or open the menu. | Add a closing block under the body: "Get in touch →" (same `ContactTrigger`), "Read my newsletter ↗", and a link to the next project in the same discipline (or the next in date order). Same markup as the home page's closing section. |
| 2 | High | Project pages, every MDX | **Outcome** is the last line of the body ("**Outcome:** Turned a Grade 9 idea into ..."). It is the sentence a reviewer most wants and it sits below 4 screens of explanation on a phone. | Show the existing Outcome line under the one-line description in the header (pulled out of the MDX by the same `**Outcome:**` marker). No new words; it also fixes the home trio having no proof line when people click through. Highest-value structural change on the site. |
| 3 | High | Accessibility corner button, all pages on phones | The 30px circle floats over the right edge of the body text on every page (visible in every phone screenshot, level with the first paragraphs). It covers words and competes with content. | Below 1024px put "Accessibility" at the bottom of the mobile menu (under "Get in touch") and hide the floating button; keep the corner icon on desktop where there is margin. Or shift it into the bottom-right gutter only once the page is scrolled to the end. |
| 4 | Medium | Projects page, top | The list opens with "In progress: Triathlon Training" ahead of anything shipped, and the "Standout projects" legend sits above a list where the stars are scattered through the years. A first-time reader sees an unfinished item first and has to hunt for the starred ones. | Move "In progress" below the last year group. Give the 5 starred projects their own "Standout" group at the top (same row design); the year groups then list the rest. Or keep the layout and sort starred rows first inside each year. |
| 5 | Medium | Home: order of sections | The first proof (the trio) comes after About and after "Coming up", which lists an upcoming project first. | Already prepared: `PROPOSAL-proof-before-coming-up.patch` (swap two sections). |
| 6 | Medium | Home, "Now" list | A bare large "07" next to "Now" and "Updated November 2026" read as a stat with no label. | Label it ("07 roles") or drop the numeral; keep "Updated". |
| 7 | Medium | Project pages that have a PDF or demo | Links and embeds sit between the header and the body; on the Sleep study the PDF card is the real evidence but looks like any other link. | Give the report card the same weight as the truck button's slot (one primary action per page): label it "Read the report (PDF)" with the page count if the PDF has it. Wording from the existing "PDF Report · Opens in a new tab" text. |
| 8 | Medium | Contact dialog | Order is Book a call, LinkedIn, Substack, Medium, TikTok. The email at the top is the primary action, but "Book a call" is the first row and a booking link is a heavier ask than a message for a first contact. TikTok ("Fitness") sits among professional links for a recruiter audience. | Order: LinkedIn, Substack, Medium, Book a call, TikTok last. (TikTok stays; you asked for it to remain.) |
| 9 | Medium | Books | Covers appear twice per book: in "The shelf" strip and again as a thumbnail in every row. On a phone the only hint that the strip scrolls is a faint right arrow (20% opacity, and the left one appears only after you scroll); the edge-hover scrolling is mouse only. | Keep the strip (you love it). Raise the touch hint slightly (arrow at 40%, or let the last visible cover peek out, which it already does at 390px) and nothing else; no counts, as you asked. |
| 10 | Low | Projects ledger | The artwork preview only appears after a 5 second hover and only for 4 projects, so most visitors never see it and mobile never can. | Shorten `DWELL_MS` to 1500; or show the artwork as a small thumbnail beside the title on rows that have it, at 56px (touch gets it too). |
| 11 | Low | Health | Audit-only page. The sticky section rail is desktop only; on a phone the five sections are a long scroll with no index. | A one-line anchor row under the header ("Training / Nutrition / Sleep / Mental health / Supplements") on narrow screens, using the same `rail-link` style. |
| 12 | Low | Sidebar newsletter | The email field exists only in the desktop sidebar. Phone and tablet visitors can only reach it through the closing link out to Substack. | Reuse the same field in the mobile sheet under "Get in touch". |
| 13 | Low | 404 | Still the old look (rocket emoji, joke checklist). It is the one page that does not look like the rest. | Rebuild with the ledger header pattern (eyebrow, big title, one line, "Back home →"). |
| 14 | Low | Project pages | "Back to Projects" at the top is the only way back; on a long page you scroll up to leave. | Fixed by #1 (closing block) and a "Back to Projects" repeat there. |

## If you only do three

1. **Outcome in the header** (#2): turns every project page into a 5-second proof.
2. **Closing block on project pages** (#1): ends the dead end and gives every project page a next action.
3. **Move the accessibility button into the mobile menu** (#3): the only thing on the phone layout that actually covers content.

## Not recommended

More sections on the home page, testimonials or counters (nothing to back them), a carousel for the trio (locked as equal and visible), or hiding the project filter behind a menu.

I can build #1, #2 and #3 as separate PROPOSAL patches if you want them.

## Built (applied; each patch is independent and reverts on its own)

| # | Patch | Files | Verified |
|---|---|---|---|
| 2 | `patches/PROPOSAL-outcome-in-header.patch` | `src/app/projects/[slug]/page.tsx` | "Outcome" shown under the description on the 12 projects that have an `**Outcome:**` line (moved out of the body, wording untouched; the other 12 are unchanged). Checked on carbon-capture-model, screens-and-sleep, robotics, tiny-hearts, triathlon. |
| 1 | `patches/PROPOSAL-project-closing-block.patch` | `src/app/projects/[slug]/page.tsx` | End of every project page: next project (same discipline, wrapping; overall next when the discipline has one project), "Get in touch", "Read my newsletter", "All projects". |
| 3 | `patches/PROPOSAL-accessibility-in-mobile-menu.patch` | `src/components/MobileNav.tsx`, `src/lib/useAccessibilityPrefs.ts`, `src/app/globals.css` | Floating button hidden below 1024px (was covering text); "Reduce motion" and "Reduce transparency" are plain text toggles (`aria-pressed`, petrol underline when on, no pills) in the mobile menu; settings stay in sync with the desktop button; reachable in phone landscape. |

Apply order does not matter (1 and 2 both apply to the same base file and together equal the working tree). Revert: `patch -R -p1 < docs/ux-audit/patches/<name>.patch`.

Measured after (production build): Lighthouse mobile 100/100/100 on home and the Sleep project page, carbon-capture-model 100/100/92 (the 92 is the "here" link wording), CLS 0, no overflow at 390, 768 or 1280, effective tap-target failures on phones 19 to 1, no heading skips, no console errors.
