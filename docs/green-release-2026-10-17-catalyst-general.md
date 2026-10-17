# Green release 2026-10-17: general Catalyst, clear next steps, no double reloads

**Authorization:** Ahmed, 2026-10-17: "test functions, smoke test it locally then proceed for production deployment".
**Decision:** vault `Decisions/2026-10-17-Catalyst-General-Ascend-Industry` (BF-2026-10-17-CATALYST-GENERAL).

## Release

| | |
|:---|:---|
| Source | `64b2e76` on `origin/master`; it contains `22e298f`, the commit behind the previous production deployment |
| Convex | `rare-fish-465` (Green). Ahmed ran `npx convex deploy` from an isolated worktree of `64b2e76`. No schema changes, functions only |
| Website | `dpl_JC7Lhi88FADpUxzrGGJaqzhMZPba`. Ahmed ran `npx vercel deploy --prod --skip-domain`; Claude checked it and promoted it |
| Previous production | `dpl_CRd1zPaRt9XMWsQXqi2oTX8En2E2` (source `22e298f`) |

## What changed

**Catalyst is general for every business.**
- The industry is asked once, at sign-up, and is only recorded on the bzns.md `sector:` line.
- Layla's sector is resolved by plan in `laylaSectorFor` (`convex/blueContacts.js`):
  - **Catalyst:** the general pack. No sector questions, no medical/legal/finance prompt rules, no 24-hour clinical text retention, and no industry named in the prompt.
  - **Ascend and Apex:** unchanged.
- Catalog changes write Hasib service items only on the industry plans.
- BznsBrain's dental reception flow is retired.

**Next steps.**
- Every step change in sign-in, setup and the BznsBrain wizard scrolls into view.
- Finished cards offer "Next: …".
- Forward buttons have an arrow that flips in RTL.
- Republishing unchanged text moves on to Channels.

**Double reloads.**
- The setup wizard mounts once.
- Sign-in applies the page state once, after the browser draft is claimed.
- Social sign-in lands on its destination in one hop.
- A dashboard destination without a workspace opens setup.
- Catalyst setup is excluded from the Meta pixel.

## Evidence (observed 2026-10-17)

**Before deploy (local, and the isolated `64b2e76` worktree):**
- `npm test` passes.
- `typecheck:convex` is clean.
- 1,041 unit tests pass, 0 fail.
- Build OK.
- All 11 shared browser suites pass. New checks:
  - signing in from the channels step neither rebuilds the setup nor loads the page again (this check fails on the previous code);
  - the OAuth return shows "Signing you in…";
  - a dashboard destination without a workspace opens setup;
  - Catalyst setup has no industry step, at 320/768/1440 in EN and AR.
- Retail, retail-tech, real-estate, media and fitness sector browser suites pass.
- The construction/automotive industries suite and the Ascend end-to-end suite pass.

**Local smoke:** 12 routes render in Chromium without page errors. These include `/services`, `/support` and `/contact`.

**Deployment URL (before promotion):**
- The same 12 routes return 200.
- `/api/auth-session` returns `ok`.
- `/api/auth-oauth?next=/en/catalyst/setup` returns a 302 to Google, and the stash carries `x=/en/catalyst/setup`.
- The `SignIn-BSlLherU.js` chunk is identical to the local build.

**Public domain after promotion:**
- `vercel inspect www.bznsflowai.com` shows `dpl_JC7Lhi88…`.
- Routes return 200.
- `/api/product-setup` signed out returns `sign_in_required` (401).
- `/api/auth-session` returns `ok`.

## Known issues

- ~~`tests/dental-browser.mjs` timed out waiting for the `attendance_unrecorded` follow-up.~~ **Fixed in `8adaf3e`.** The dental demo placed its only unrecorded visit "yesterday", which was skipped whenever yesterday was a Friday (the clinic's closed day), so the test failed on Saturdays. The fix is test data only (`scripts/hasib-demo-dental.mjs`), with no runtime change and nothing to deploy. The full `test:release` passed afterwards, and the dental suite passed on all seven weekdays with the clocks shifted.
- No authenticated production walk-through yet: sign-in with a real account, setup, and publishing on a granted Catalyst account.
- Notion mirror of the decision is pending.

## Rollback

- **Website:** promote `dpl_CRd1zPaRt9XMWsQXqi2oTX8En2E2`.
- **Convex:** redeploy `4a6d80a` to `rare-fish-465`. There are no schema changes, so this is safe either way.

## Follow-up: "Set up Ascend" (same day)

The Ascend plan card's button for accounts granted Ascend changed:
- **Before:** "Open my workspace" (افتح مساحة عملي), opening the dashboard.
- **After:** "Set up Ascend" (إعداد أسيند), opening Ascend's setup in Settings › Business.

Signed-out and Catalyst visitors still get the WhatsApp contact.

| | |
|:---|:---|
| Source | `48a90b5`, website only (no Convex change) |
| Deployment | `dpl_3EwqiSUZuU6RVpsZPUfGECvKXBzt`. Ahmed deployed it; Claude checked it with `vercel curl` (routes 200, `auth-session` ok, new label in the home chunks) and promoted it |
| Live check | `www.bznsflowai.com` serves `dpl_3EwqiSUZ…`; key routes return 200 |
| Rollback | promote `dpl_JC7Lhi88FADpUxzrGGJaqzhMZPba` |
