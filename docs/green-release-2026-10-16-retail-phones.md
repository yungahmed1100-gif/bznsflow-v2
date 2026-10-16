# Green release 2026-10-16: Retail and Phones & electronics on the six-tab kit (Release B)

**What shipped:** `e2e6eea` on `master`. That is `1383ac9` (the feature) plus `e2e6eea` (the end-to-end suite and a construction fix), rebased onto `7756bad`. The feature is described in `docs/retail-phones-workspace-2026-10-16.md`.

**All eight live sectors are now on the six Ascend tabs:** Real Estate, Media, Fitness, Dental, Automotive, Construction, Retail, and Phones & electronics.

## Verification before deploy
- `scripts/verify-release.mjs` ran on `ea9434d` alone and gave **EXIT 0**.
  - `ea9434d` is the same code as `e2e6eea`. The rebase added only the Release A record (`git diff --stat`: one doc file).
- **Unit tests:** all pass, including `ascend-retail-growth` (8). Two of its guards were mutation-checked: removing the stock-price guard or the quote-changed guard makes a test fail.
- **Browser suites, all passing:**
  - the 10 shared suites;
  - Catalyst (297), Retail (582) and Phones (603);
  - Real Estate, Media, Fitness and Dental;
  - `hasib-industries-browser` construction/automotive (12/12).
- **New `tests/ascend-e2e-browser.mjs` (83 checks).** On the real-logic demo, as manager and employee, it checks:
  - a customer writes in, the records move and Hasib runs;
  - Adiba's offer is approved beside the chat, and the customer's YES comes back through Layla;
  - the result shows where the owner sees it, for Retail, Phones, Automotive and Construction.
- **Found by the end-to-end run and fixed:** construction Follow-ups rows now name the variation or claim a task is about, not only the project.

## Deploy
Ahmed ran the push and both deploys; the auto-mode check blocks them for Claude.
1. `git push origin e2e6eea:master`, a fast-forward from `7756bad`.
2. `npx convex deploy` to `rare-fish-465`.
   - No index was deleted.
   - Four were added: `retailDrafts.by_account_created`, `retailDrafts.by_account_request`, `retailTasks.by_account_status` and `retailTasks.by_entity`.
3. `npx vercel deploy --prod --skip-domain` gave `dpl_G7Yhchk1vpk3scx1GHCzFfgPyqyG`.
   - It served `assets/LaylaDashboard-LwFQvEzu.js`, the same file as the local build.
   - Claude then promoted it.

## Production checks (2026-10-16)
- **Pages:** `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard` and `/en/catalyst/setup` return 200. `/en/ascend/setup` returns 307 (signed out, as before).
- **Live dashboard file:** `LaylaDashboard-LwFQvEzu.js`. It contains the store, workshop and projects workspaces, `store_followups` and "Store & repairs".
- **API guards:**
  - a cross-origin `POST /api/layla-meta?surface=hasib` returns 403;
  - a signed-out `GET` returns 401.
- **`home-browser`** against www.bznsflowai.com: 36 checks passed.

## Not checked yet
- **Convex logs after the deploy.** Hasib's 5-minute run now visits store accounts too. This is for Ahmed to read.
- **A signed-in production walk-through** of the new sectors. It needs Ahmed's sign-in or his approval of synthetic accounts.

## Rollback
- **Website:** promote `dpl_YZ86h29sSmKcKuQdgo5QxCNL5jV2` (Release A).
- **Automation:**
  - the Convex env `HASIB_AUTOMATION=off` stops the scheduled run;
  - `blueHasib:setEnabled false` turns Hasib off;
  - each store can also set its rules to Draft or Off in Settings.
- **Schema:** additive only; older code ignores the new tables and fields.
