# Green release, refactor Phase 2: navigation (12 November 2026)

**Authorization:** Ahmed, 12 November 2026: "refactor the whole code base and test out where each button is leading". This is Phase 2 of the approved five-phase plan (`~/.claude/plans/improve-mcp-connection-functions-keen-lightning.md`), started on his "proceed". His decision for this phase: every audit button leads to `/audit`, and WhatsApp stays only as support.

| | |
|---|---|
| Source | `aa32f8d` on `refactor/p2-navigation`, fast-forwarded to `master`, tag `green-p2` |
| Website | `dpl_AWH1iBRYfqeDnxw8Xqb7MBYqgxbc`, promoted to www.bznsflowai.com |
| Convex | Not deployed. No Convex code changed since `green-p1`. |
| Rollback | Promote `dpl_CKdWLWweQZHL9REFbqjLXHEZDvk3` (`green-p1`) |

## What changed for people

- **Audit.** "Get my free audit" in the hero and About sections now opens the `/audit` booking page instead of WhatsApp. The button beside it is now the WhatsApp support line, "Chat on WhatsApp". The "Book it as a call" button is gone.
- **Admin sign-in.** Signing in from an admin page now comes back to that page: the admin home, the sector previews, Access, Apex requests and Websites.
- **Dashboard logo.** The logo now opens the dashboard home instead of Catalyst setup. In an owner preview it opens that preview's home.
- **Plans.** These links now open the plans section in the page's language instead of the top of the home page:
  - "Choose a plan", on the dashboard and on setup
  - "See plans", on AI Connections
- **Employees.** The account menu now shows "My workspace". It used to link to Settings, a tab employees don't have.
- **Section views.** Cmd/Ctrl-click opens a view in a new tab, and the link keeps the page's other settings.
- **HVAC.** The Work tabs read Jobs, Contracts and Units. They showed the raw keys `view_jobs`, `view_contracts` and `view_units`.
- **Settings › Business.** When the information list fails to load, the page now explains the problem in a sentence instead of showing an internal code.
- **Admin home.** It counts its sector previews (it said "six" above nine cards) and describes fitness and media.

## Engineering

### One list of pages, one way to build links

- `src/lib/route-table.js` lists every page once.
  - The routes, the prerender list and the sitemap are derived from it.
  - `tests/route-parity.test.mjs` checks the owner preview packs against the live sector packs.
- `src/lib/paths.js` builds every link within the site.
  - About 85 hand-built language prefixes in 25 files moved to it, mostly via `scripts/codemods/locale-paths.mjs`.
  - `tests/paths.test.mjs` fails on a new one, and checks that sign-in accepts every way back the site builds.
- `config/signin-destination.js` accepts exactly the admin pages as places to return to. Tests cover look-alike paths.

### Shared helpers

- `src/lib/plain-click.js` (`isPlainClick`, `inPlace`) replaces seven copies of the modifier-key check.
- `src/lib/dashboard/view-strings.js` holds the section view names and `viewLabel`.
  - `strings.js` shrank from 1,270 to 1,218 lines, and its cap was lowered to match.
  - `tests/dashboard-view-labels.test.mjs` checks every view of every workspace in both languages.

### Code that Node can load

Plain `.js` modules in `src/` now import with file extensions, so Node can load them as well as the bundler. The release check found the gap: `geo-browser` failed to load `business-pages.js`. `tests/paths.test.mjs` now guards it.

### Removed

The retired `/layla/review` mode was removed from the setup page. Its server side and `scripts/issue-blue-review-access.mjs` go with the Convex `review_access` operation in Phase 5.

### New and strengthened guards

- **The crawl** now fails if a dashboard tab or view shows a raw string key. That check found the HVAC tab names and the Settings › Business error above.
- **The crawl and the visual diff** now wait for a dashboard to show its tab (`tests/helpers/settle.mjs`), not for a quiet network. A first clean-archive run timed out on the automotive Chats tab, which polls for new messages.

### `scripts/visual-diff.mjs`

It compares screenshots and accessibility trees, which include link targets, against a baseline build. It covers 172 screens:

- every public page;
- the Ascend, Catalyst and employee demo dashboards, with every tab;
- both languages, at 1440 and 375 px.

Captures are deterministic:

- a frozen browser clock, reduced motion, loaded fonts and decoded lazy images;
- both builds served in turn on the same ports;
- demo servers that start on the same instant (`scripts/lib/fixed-clock.mjs`).

Calibration, `green-p1` against itself, gave 0 differences.

## Evidence

- **`npm run test:release` on a clean archive of `aa32f8d`** passed:
  - Formatting passes. The lint ratchet shows 352 findings, none new.
  - 1,229 unit tests ran: 1,228 passed, 0 failed, and 1 is the known to-do for byte-counted limits.
  - The Convex typecheck, the build and `npm audit` (0 vulnerabilities) pass.
  - All browser suites pass. The navigation crawl ran 4,716 checks with **0 known problems**; the three listed after Phase 1 are fixed and the list is empty.
  - All sector suites pass. Ascend end-to-end passed 107 checks.
- **Visual diff against `green-p1`:** 172 screens, 92 differences, all expected. Each is listed with its reason in `tests/fixtures/visual-p2.json`:
  - **Home, 8:** the audit and WhatsApp buttons changed places.
  - **Admin pages, 56:** the sign-in link gained `?next=`.
  - **Dashboards, 28:** the logo opens the dashboard.
- **HVAC job link:** "Update status in Jobs" now links to Work › Jobs by its canonical address. The old link also reached the job, through an old-link alias.
- **Staged deployment:** 12 key pages returned 200. The prerendered Arabic hero links its primary button to `/audit`, and the English secondary button is the WhatsApp support link.
- **Production after promotion:**
  - Health passed 16 of 16.
  - All 56 prerendered pages returned 200.
  - The live hero links to `/audit`.
  - No runtime errors in the 30 minutes after promotion.

The first production checks failed with `ENOTFOUND` from this machine. Public resolvers (1.1.1.1 and 8.8.8.8) answered correctly throughout; it was a stale entry in the local system resolver. The checks passed once it cleared, and one `/contact` connection timeout passed on retry.

## Not done in Phase 2

- **Plan buttons for holders are unchanged.** They open setup, the workspace, or Settings › Business for Ascend, which is where Ahmed placed advanced setup. Each was checked to open a real view.
- **`scripts/issue-blue-review-access.mjs`** stays until Phase 5. It calls the Convex `review_access` operation, which Phase 5 removes.
