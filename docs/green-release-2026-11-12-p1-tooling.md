# Green release, refactor Phase 1: tooling and guards (12 November 2026)

**Authorization:** Ahmed, 12 November 2026: "refactor the whole code base and test out where each button is leading", as a senior engineer. He approved a five-phase plan: phased releases, ESLint and Prettier repo-wide, deleting dead code, and every audit button leading to `/audit`. This is Phase 1, which changes no behaviour. Plan: `~/.claude/plans/improve-mcp-connection-functions-keen-lightning.md`.

| | |
|---|---|
| Source | `3281359` on `refactor/p1-tooling`, fast-forwarded to `master`, tag `green-p1` |
| Website | `dpl_CKdWLWweQZHL9REFbqjLXHEZDvk3`, promoted to www.bznsflowai.com |
| Convex | Not deployed. See below. |
| Rollback | Promote `dpl_AanjrNr6XPdNBkYAbTq79KJf4vCS` (`25dec02`) |

## What changed

### Dead code
- The retired WhatsApp pilot is removed: 11 modules in `api/_lib/layla`, the test copies of its entry points, and the tests that only drove them. These surfaces had answered 410 since the Green migration.
- A reachability scan from every function, the app, Convex, config and scripts finds no other unreachable API module.
- One live check was moved rather than lost: the receipt test now calls the live functions directly.
- Four unused exports are removed.

### Tests that read source code are format-proof
- `tests/helpers/source.mjs` compares code with its layout removed.
- Route tests import the real route config.
- `OAUTH_ERRORS` moved to `src/lib/auth/oauth-errors.js`, so its test checks the real table.

### Prettier and ESLint, enforced in `npm run test:release`
- **Prettier 3.9.10**, at width 120 with single quotes.
- **ESLint 9**, which flags defects, not style.
  - The 352 existing findings are recorded per file and rule in `tests/lint-baseline.json`.
  - `npm run lint` fails on a new finding. It also fails when a count drops, until `npm run lint:update` records the lower count.
  - 28 comments that silenced missing hook dependencies are gone. Those findings are now counted in the baseline.
- **Pinned versions:** tool versions are pinned and at least two weeks old.
- **One formatting commit:** `b6723a6` contains formatting only and is listed in `.git-blame-ignore-revs`. The built site is byte-identical, apart from two things:
  - Adjacent JSX text compiles as two strings instead of one. The same characters reach the page.
  - CSS custom properties get a space after the colon, and hex colours are lowercased. Browsers treat these as identical.

### File-size limit
- Formatting showed the real size of densely packed files. 23 files over 800 lines are now capped at their current size and may only shrink. Phases 3 and 4 split them.
- `config/mcp/hasib-policy.js` now has one row per operation and dropped from 1,311 lines to 338. A golden test proves the policy data is identical, including order.

### New guards
- **`tests/convex-http.test.mjs`** characterises all 24 Convex HTTP routes. These had no behaviour test before.
  - Each route is checked for: token, JSON, session, success, failure, its special branches and every size limit. Results are compared with a golden file.
  - It was mutation-checked: three deliberate breaks were all caught.
- **`tests/route-parity.test.mjs`** checks that routes, the prerender list and the sitemap agree, in Arabic and English. It was mutation-checked.
- **`tests/nav-crawl-browser.mjs`** checks where every link and button leads. It makes 4,716 checks in about 7 minutes:
  - every public page in both languages, on desktop and phone;
  - the real-logic dashboards for all nine sector packs, Catalyst and an employee;
  - intent rules: audit buttons open `/audit`, plan links open the plans, the logo opens the dashboard, and owner sign-in keeps the way back.
- **Browser suites:**
  - `geo-browser` and `knowledge-worker-browser` were wired into the runner (the second now takes the base URL).
  - Four suites that tested the screens replaced on 11 October were deleted.

## Known navigation problems (fixed in Phase 2)

The crawl lists these in `tests/helpers/nav-crawl/known-broken.mjs` and fails if one disappears without being removed from that list:

1. On the Arabic home page, "احصل على التدقيق المجاني" (Get my free audit) opens WhatsApp instead of `/audit`.
2. Owner and admin sign-in links lose the way back. They have no `?next=`, and `/owner` is not an allowed destination.
3. The dashboard logo opens Catalyst setup instead of the dashboard. This happens in every pack, plan and role.

## Evidence

- **`npm run test:release` on a clean archive of `3281359`**:
  - Formatting and the lint ratchet pass.
  - 1,212 unit tests ran: 1,211 passed, 0 failed, and 1 is a known `todo` for byte-counted size limits, which comes in Phase 4.
  - The Convex typecheck, the build and `npm audit` pass, with 0 vulnerabilities.
  - All 18 browser suites pass, including the navigation crawl.
  - Every sector suite passes, and Ascend end-to-end passes with 107 checks.
- **Staged deployment:** pages return 200, and Rasil status reports `open` and `ready`.
- **Production:**
  - Health passes 16 of 16.
  - All 56 prerendered pages return 200.
  - No runtime errors.

## Convex: not deployed

The dry run on `prod:rare-fish-465` shows no change to any function, schema or index. The Convex code changes are formatting plus one renamed local variable in four sector Insights queries, so production behaves identically.

The dry run would also change the Convex Node.js version used for actions. Phase 1 does not intend that change, so the Convex deploy waits for Phase 4, which changes Convex code. At that point the Node version will be pinned and checked.

## Not done in Phase 1

- `scripts/visual-diff.mjs`, the screenshot and accessibility-tree comparison, is not built yet. Phase 1 changed nothing visible, and the stronger byte comparison above covers the reformat. The script is built at the start of Phase 2, which has the first intended visible changes.
- Lint findings (352) and the file-size caps (23) are recorded but not yet fixed. They come down in Phases 3–5.
