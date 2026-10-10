# Green release 2026-10-11: Real Estate six-tab workspace

Ahmed authorised the release on 2026-10-11 ("verify real-estate build then push for production"). What shipped is described in [real-estate-workspace-2026-10-10.md](real-estate-workspace-2026-10-10.md).

## Release

| Step | Result |
|---|---|
| Commit | `b2f82fa` on `master`, pushed (`d472572..b2f82fa`). Contains only the real-estate workspace; the other session's Ascend draft (`ascend/`, `src/components/ascend-draft/`, `src/routes.ts`, `docs/ascend-*`) was left out |
| Verified on the commit alone (`work/release/b2f82fa`) | build; 892/892 unit tests; `npm test` chain; Convex type-check; all 10 browser suites; `tests/real-estate-browser.mjs` 328/328 |
| Convex (Green, `rare-fish-465`) | `npx convex deploy` run by Ahmed from the release folder, before the website. Live function spec lists `real_estate_followups`, `real_estate_context`, `real_estate_metric_records` and `real_estate_task_snooze` |
| Vercel | `vercel deploy --prod --skip-domain` → `dpl_6NToNs8xEv6KDAVrosBBbqJVcnYn`, then promoted to www.bznsflowai.com |

## Production checks (00:4x Muscat, Sunday 11 October)

- **Status codes:** 200 for `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`, `/catalyst/setup`, `/privacy` and `/llms.txt`; 307 for `/layla/setup`, all as before.
- **Live bundle:** the dashboard bundle (`LaylaDashboard-BlLbWVV7.js`) contains the new workspace (`real_estate_followups`, `real_estate_metric_records`, the attention strip).
- **API:** the Hasib API refuses a cross-origin call with 403 `origin`, as designed.
- **Home page:** `node tests/home-browser.mjs https://www.bznsflowai.com` passed 36/36.

## Not verified in production

- **Signed-in use:** no signed-in Ascend real-estate session was exercised. Ascend is still "in preparation, do not quote", so no paying customer sees these screens; they appear only for Ascend workspaces on the real-estate pack.
- **Real data:** KPI accuracy on a real agency's history is unverified.
- **Sending:** no message was sent. Rule drafts still go through `draft_approve` and its window, template and opt-out checks.

## Rollback

- **Website:** `vercel promote dpl_DUbLDWGnB158y4gVS9tpENT4LA72 --yes`, the colour release.
- **Convex:** the schema additions are all optional fields, so the previous website runs unchanged against the new Convex functions. No Convex rollback is needed for a website rollback.
