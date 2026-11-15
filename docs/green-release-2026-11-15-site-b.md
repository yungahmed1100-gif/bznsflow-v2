# Green release, site B: loading dots, Privacy tables, website-brief fixes (15 November 2026)

**Authorization:** Ahmed, 14 to 15 November 2026. He approved the three-release plan, reviewed this release on a local server, asked for the home page sculpture to be removed, and said "then deploy live".

| | |
|---|---|
| Source | `606d917` (verified, deployed), tag `green-site-b` |
| Convex | `rare-fish-465`, deployed 05:43:08Z. One additive field: `websiteBriefs.emailContext`. The website tables moved to `convex/websiteSchema.ts`; the dry run showed no index deletions and no other change. |
| Website | `dpl_AZMnr8rVcyZ3SwEg6cshnpRH8Lco`, promoted to www.bznsflowai.com at 05:45:20Z |
| Rollback | Promote `dpl_AXdrCPFgGEcD4cKh8fmgL9pfb8XW` (`green-layla-a`). The Convex field is optional, so the previous site works with it. |

## What changed for people

- **Loading states** on the dashboard, the broadcast steps and BznsBrain show three dots and what is loading, after a 160 ms delay so a fast answer never flashes them. They stand still for people who turn motion off.
- **Privacy page:** the two tables can be scrolled with the keyboard and are named for screen readers. No wording changed.
- **Website brief and Paymob documents, four fixes found on 8 November that had never shipped:**
  1. Retrying a failed brief email sends the brief as submitted, with its attachments, even if the owner has since started a new draft.
  2. The retry shows the same name and due date as the original email.
  3. An answer accepted in another tab while publishing is no longer retired early.
  4. A domain with a missing, blank or negative price is never shown as available.

## Not in this release

- **The home page sculpture.** It was built (WebGL blocks above the five steps, in each step's colour), reviewed by Ahmed locally, and removed at his request in `606d917` together with the `motion` library. The home page is unchanged. The work is in the branch history (`0c2546e`) if it is wanted later.
- The setup page keeps its plain "Loading…" text; see below.

## Found while checking, and fixed

- **Every dashboard screen moved, and on phones the tab bar jumped to the top.** Importing the loading component from both the setup page and the dashboard moved it into the chunk that carries `layla-dashboard.css`; the bundler then loaded that stylesheet after `dashboard-polish.css`, and rules of equal weight flipped. The four browser suites that click phone dashboards failed, and the visual diff showed 44 dashboard screens. Fixed by keeping the setup page off the shared component and putting the dots' styles in the global stylesheet. Guards: `tests/dashboard-css-order.test.mjs` (the phone grid rule outweighs the base rule) and a check in `tests/layla-dashboard-browser.mjs` that the base stylesheet loads before the overrides.
- **`convex/schema.ts` was at its size cap**, so the website tables moved to their own file instead of raising the cap (now 1,628).

## Evidence

- **Release check on a clean archive of `606d917`:** format, lint (339 findings, none new), 1,259 unit tests passed with 0 failed and 1 to-do, Convex typecheck, build, `npm audit` 0 vulnerabilities, and every browser suite. The navigation crawl timed out on one page load in the first run, on a different page in a second run, while a dev server and a demo were running on the same machine; with those stopped the pages reached network idle in 0.6 s and the crawl passed (4,716 checks, 0 known problems). The steps after it were then run and passed: catalyst, retail, retail-tech, real estate, media, fitness, dental, HVAC, industries, latest-response (8), action links (21), Ascend end-to-end (107).
- **Visual diff against `green-layla-a`:** 172 screens, 4 differences, all expected (`tests/fixtures/visual-site-b.json`): the Privacy pages' accessibility tree gains two named regions per page.
- **Staged:** nine key pages returned 200 and the Privacy page carried the new region.
- **Production:** all 55 prerendered pages returned 200 (two needed a retry after a connection failure from this machine). Health 16 of 16 on the second run; the first run failed six checks at the same moment as those connection failures. No runtime errors in the 15 minutes after promotion.

## Open

- The live English home page measured a layout shift of 0.57 at 1440 px on 14 November (target under 0.1), and so did one local run of the same build; other local runs, made with the since-removed sculpture, measured 0.03. The cause is not established and this release does not change the home page. Worth measuring with real-user data.
- Firefox and Safari were not tested: their Playwright browsers are not installed on this machine.
