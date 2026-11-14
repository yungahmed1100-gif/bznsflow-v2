# Green release, refactor Phase 3a: shared guards and bug fixes (14 November 2026)

**Authorization:** Ahmed, 14 November 2026. "go" for Phase 3 of the approved plan, then "after everything, run different scenario tests then fix, then deploy for live production".

| | |
|---|---|
| Source | `2d05989` (verified, deployed), `master` at the release record, tag `green-p3a` |
| Website | `dpl_GbjmSgapY1S5qQoMWqa5j8HQsG6u`, promoted to www.bznsflowai.com at 11:07:59Z |
| Convex | Not deployed. No Convex, API or config file changed since `green-mcp-direct`. |
| Rollback | Promote `dpl_5FG9Eb6ELb4vVPhKQ638w8F5bkN1` (`green-mcp-direct`) |

## What changed for people

- **Automotive and construction dashboards no longer crash when you switch views quickly.** Opening Team and then Workshop (or Site) before the team list arrived used to replace the screen with an error page, because the late team list landed in the settings view.
- **Those dashboards, and the clinic preview, word their errors.** A failed load used to print a code such as `automotive_unavailable`. It now reads "That didn't work. Please try again." (Arabic: "تعذّر إكمال الخطوة. حاول مجدداً."), and Retry works.
- **The Apex requests admin page cannot crash on an incomplete answer.** The Access and Websites admin pages are protected the same way.
- **Fitness:** a link that opens the new-membership or new-class form now also works if the manager role arrives after the page loads.
- Nothing else looks different: the visual diff against the live site found 0 differences on 172 screens.

## Engineering

| Change | Why | How it helps |
|---|---|---|
| `src/lib/latest-request.js`, `useLatestRequest`, `useViewData(view, fetchView, fallback)` | A view that reloads when its mode changes applied whichever answer came last, and showed the previous view's data until the new one arrived. | One place decides which answer is current; a view never renders data loaded for another view. Automotive, construction and clinic use it, and any new dashboard gets it for free. |
| Each of those dashboards' fetching moved into a plain `loadXView(mode)` | The loaders were long callbacks mixing fetching with state. | Fetching is now plain, testable functions; the component only renders. |
| Errors worded through `h.reason() \|\| s.reason()` (Construction now receives `h`) | Raw codes reached the screen. | The same wording rule as the shared workspace kit. |
| `src/lib/admin-api.js` `loadAdminList(op, lists)` | Three admin pages repeated the session and list requests and read lists unchecked. | One loader that always returns lists and a clear state (signed out, no access, failed, ready). |
| The `?action=` effect moved into `useWorkspaceShell` (`initialAction`, `formFor`, `place`, `onPlaceChange`) | Five workspaces copied it, each leaving out what it read. | One effect with honest dependencies; each workspace names its forms in a small `formFor` function. Lint findings went from 349 to 341. |

### New guards, all failing on the old code first

- `tests/latest-response-browser.mjs` holds back the team list and switches views. It failed with the crash before the fix and is now in the release check.
- `tests/latest-request.test.mjs` covers the helper, and checks that the three dashboards load through `useViewData`.
- `tests/error-wording.test.mjs` fails any component that keeps a raw reason code and renders it as is. It found exactly the three dashboards.
- `tests/admin-api.test.mjs` covers the loader's cases: a missing list, a malformed list, signed out, denied, failed and offline. `owner-browser` opens /owner/apex with a list-less answer in both languages.
- `tests/action-links-browser.mjs` pins every `?action=` link in the five six-tab workspaces on their real-logic demos. It passed before and after the move, and it is in the release check.

### Test fixes found by the scenario runs

- **`tests/hasib-industries-browser.mjs`:**
  - With no arguments it stopped at logistics, a pack without a synthetic journey.
  - Its generic Today scenarios failed for packs that moved to the six-tab workspace (dental, retail, electronics, media) or have their own Today screen (clinic). The same failures reproduce on `green-p2`, so they were stale scenarios, not regressions.
  - The default run now covers every pack with a generic journey: 56/56.
- **`tests/helpers/browser-mocks.mjs`:** the signed-out session answer lacked `ok: true`, which the live server sends (checked). The new admin loader checks `ok`, so the visual diff showed signed-out admin pages as "could not load". With the faithful mock it shows 0 differences.
- **Behaviour note:** if the session service itself fails, the admin pages now say the list could not be loaded instead of asking you to sign in.

### Looked at and left

- **Index-keyed lists:** 38 lists use index keys. All are fixed lists or controlled inputs, so none can show the wrong data, and changing them would be churn.
- **The setup page's reasons:** these were already checked. `explain()` uses an allowlist, and Meta references must be numeric.

## Evidence

- **`npm run test:release` on a clean archive of `2d05989`:** passed.
  - Lint: 341 findings, none new.
  - 1,240 unit tests passed, 0 failed, 1 to-do.
  - The Convex typecheck and the build pass, and `npm audit` found 0 vulnerabilities.
  - All 18 browser suites passed, including the navigation crawl (4,716 checks, 0 known problems).
  - The latest-response guard passed 8 checks and the action-link guard 21.
  - Sector suites passed, and Ascend end-to-end passed 107 checks.
- **Scenario runs beyond the release check:**
  - Industry journeys for every pack with one: 56/56.
  - Failure scenarios, automotive and construction, English at 1280 and Arabic at 375: worded errors and Retry recovers, 20 checks.
  - The navigation crawl again with the corrected mock: 4,716 checks.
- **Visual diff against `green-mcp-direct`:** 172 screens, 0 differences.
- **Staged:** 13 key pages returned 200.
- **Production:**
  - All 56 prerendered pages returned 200. `/contact` needed retries; it was the same intermittent local connection stall seen in the last two releases, and the next attempts answered in 1 to 4 seconds.
  - Health passed 16 of 16 on its third run. The first two runs each had one timeout on a different check (OAuth metadata, then unauthenticated admission).
  - No runtime errors after promotion.
- **Observation for Phase 4:** the OAuth metadata route of the AI Connections function answers in 1 to 3 seconds; this release did not change it.

## Still to do in Phase 3 (3b)

- **Shared building blocks:**
  - one session request per page (`useSession`);
  - `postWithCsrf`, and a lint rule against raw `fetch`;
  - one email-code sign-in (`useEmailCodeSignIn`) for SignIn and LaylaOnboarding;
  - `makeTr`;
  - the format locale.
- **Component splits:** the large screens.
