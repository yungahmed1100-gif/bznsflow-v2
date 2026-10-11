# Green release 2026-10-11: Fitness and Dental six-tab workspaces

Ahmed authorised the release on 2026-10-11. For Dental he chose "Replace live after checks" and "Draft, manager approves". What shipped is described in [fitness-workspace-2026-10-11.md](fitness-workspace-2026-10-11.md) and [dental-workspace-2026-10-11.md](dental-workspace-2026-10-11.md).

## Release

| Step | Result |
|---|---|
| Commits | `f562d9e` (Fitness six-tab Memberships, live; Media workspace on the shared sector kit, still a preview), `4c03916` (Dental six-tab Visits, replacing the old dental screens), `92b49a2` (clash-free browser times; a refused save shows its reason). All on `master` and pushed. The other session's Ascend draft (`ascend/`, `src/components/ascend-draft/`, `src/routes.ts`, `src/route-modules/*ascend-draft*`, `docs/ascend-*`) was left out |
| Verified on the commit alone (`work/release/92b49a2`) | build; 939/939 unit tests; `npm test` chain; Convex type-check; all 10 browser suites; `tests/fitness-browser.mjs` 312/312; `tests/dental-browser.mjs` 315/315 |
| Convex (Green, `rare-fish-465`) | `npx convex deploy` run by Ahmed from the release folder, before the website. The live function spec lists `fitness_followups`, `fitness_context`, `fitness_metric_records`, `fitness_task_snooze`, `dental_followups`, `dental_context`, `dental_metric_records`, `dental_task_snooze` and `dental_visits`, alongside the existing `real_estate_*` operations |
| Vercel | Ahmed ran `vercel deploy --prod --skip-domain` from the release folder → `dpl_9hH6fwPK233PVSvypEgrVEnHcu8b` (22:01 Muscat). Its `LaylaDashboard-BLx0kXg2.js` is byte-identical to the local `92b49a2` build. Then promoted to www.bznsflowai.com |

**Release folder setup.** A release worktree has no gitignored env files. Copy `.env.green-convex.local` into it as `.env.local` before `npx convex deploy`, as the earlier release folders had. Without it, the CLI stops with "No CONVEX_DEPLOYMENT set". The file holds only the deployment name and URL.

**Vercel "Not authorized".** A stale `VERCEL_TOKEN` in the shell overrides the saved CLI login. The one in `.env` expired on 2026-08-10. Run `unset VERCEL_TOKEN VERCEL_OIDC_TOKEN` before deploying.

## Production checks (22:0x Muscat, Sunday 11 October)

- **Status codes:** all as before.
  - 200: `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`, `/catalyst/setup`, `/privacy`, `/llms.txt`.
  - 307: `/layla/setup`.
- **Live deployment:** `vercel inspect www.bznsflowai.com` reports `dpl_9hH6fwPK233PVSvypEgrVEnHcu8b`.
- **Live bundle:** the live `LaylaDashboard-BLx0kXg2.js` contains `fitness_followups`, `dental_followups`, `dental_visits` and `real_estate_followups`.
- **API:** the Hasib surface (`/api/layla-meta?surface=hasib`) refuses a cross-origin call with 403 `{"ok":false,"reason":"origin"}`, as designed.
- **Home page:** `node tests/home-browser.mjs https://www.bznsflowai.com` passed 36/36.

## Not verified in production

- **Signed-in use:** no signed-in Fitness or Dental session was exercised. Both are Ascend packs, and Ascend is still "in preparation, do not quote". No paying customer sees these screens. They appear only for workspaces on the fitness or dental pack.
- **Dental replacement:** the old dental screens are gone. Any existing dental workspace now opens the six-tab Visits workspace. Its old records were not migrated or inspected in production.
- **Real data:** KPI accuracy on a real gym's or clinic's history is unverified.
- **Sending:** no message was sent. Rule drafts are created as drafts. They go out only through `draft_approve`, with its window, template and opt-out checks.
- **Media:** not live. It remains a preview pack (not in `HASIB_LIVE_PACKS`).

## Rollback

- **Website:** `vercel promote dpl_6NToNs8xEv6KDAVrosBBbqJVcnYn --yes`, the Real Estate release.
- **Convex:** the schema additions are all optional fields, so the previous website runs unchanged against the new Convex functions. A website rollback needs no Convex rollback.

## Next

The shared-kit refactor (`c1cbaad`, `23364f6`; local, not pushed) ships separately. It needs its own release check first. The background run of the remaining browser suites on `c1cbaad` printed only `Node.js v25.9.0` for each suite, a crash signature, so it proves nothing. Re-run those suites one at a time, plus sign-in and product-setup, which timed out on Google Fonts.
