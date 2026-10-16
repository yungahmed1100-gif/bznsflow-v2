# Green release 2026-10-16: Automotive and Construction on the six-tab kit (Release A)

**What shipped:** commit `8b0ee5d` on `master` (`9476b17` plus the check fix below). The feature itself is in `docs/automotive-construction-workspace-2026-10-12.md`.

## Verification before deploy
- `scripts/verify-release.mjs` on the commit alone (`work/release/8b0ee5d`, port 5199 free) gave **EXIT 0**.
- **Unit tests:** 979/979.
- **Every browser suite passed:**
  - the shared suites, including `layla-dashboard-browser` (323);
  - Retail, Phones, Real Estate, Media, Fitness and Dental;
  - `hasib-industries-browser construction automotive`, 12/12.
- **The first run (`9476b17`) failed** in `layla-dashboard-browser`, because it still expected the old Today cards for these two sectors.
  - `8b0ee5d` checks their six-tab Work instead (views, RTL, overflow, axe).
  - The same commit adds seven icon outlines (wrench, users, receipt, box, car, home, alert-triangle) that sector screens asked for and that drew blank.

## Deploy (Ahmed ran push, Convex and Vercel himself; the auto-mode check blocked them for Claude)
1. `git push origin 8b0ee5d:master` (from `fadd276`, a fast-forward).
2. `npx convex deploy`, to `rare-fish-465`. No index was deleted. Six were added: `automotiveDrafts` and `constructionDrafts`, `by_account_created`, `by_account_request`, and `by_work_order` / `by_project`.
3. `npx vercel deploy --prod --skip-domain` gave `dpl_YZ86h29sSmKcKuQdgo5QxCNL5jV2`.
   - The deployment served `assets/LaylaDashboard-d4SA-WiG.js`, the same file as the local build, with the new Workshop code.
   - It was then promoted.

## Production checks (2026-10-16)
- `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard` and `/en/catalyst/setup` returned 200.
- The live dashboard file is `LaylaDashboard-d4SA-WiG.js`.
- A cross-origin `POST /api/layla-meta?surface=hasib` returned 403.
- `home-browser` against www.bznsflowai.com: 36 checks passed.

## Not checked yet
- **Convex logs after the deploy.** Hasib's 5-minute run now visits automotive and construction accounts. This is for Ahmed to read.
- **A signed-in production walk-through** of either sector. It still needs Ahmed's sign-in or his approval of synthetic accounts.

## Rollback
- **Website:** promote the previous production deployment (Release 3, `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta`).
- **Automation:** the Convex env `HASIB_AUTOMATION=off` stops the scheduled run; `blueHasib:setEnabled false` turns Hasib off.
- **Schema:** the schema changes are additive; the older code ignores the new tables and fields.
