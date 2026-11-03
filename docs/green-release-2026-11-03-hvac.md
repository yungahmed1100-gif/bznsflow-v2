# Green release 2026-11-03: Air conditioning workspace live

## Asked
Ahmed: "prepare hvac dashboard … test it end to end based on best practices and kpis tracked by best performing hvac companies". He chose to build, test and **go live**, with maintenance contracts as a first-class view.

Decision record: `BF-2026-11-03-HVAC-LIVE`.
- vault: `Decisions/2026-11-03-HVAC-Six-Tab-Live.md`;
- [Notion](https://app.notion.com/p/40d415cb8dec818095a7e5f3fbe9944b).

## Shipped
- **`d4ce91f`: the HVAC six-tab workspace.** What it does is described in `docs/hvac-workspace-2026-11-03.md`, and requirement → code → test is in `ascend/implementation/evidence/B08-hvac.md`. Shared changes:
  - Layla's intake now also receives the conversation;
  - the clinic Today is limited to dental;
  - the count on a selected Follow-ups filter is readable (contrast fix in `workspace.css`).
- **`77fa988`: `hvac` added to `HASIB_LIVE_PACKS`.** The demo runs HVAC as a live pack, and the live-list tests include it.
- **`29b6799`, carried along:** templates judged by older rules are re-synced once (`TEMPLATE_RULES`, `blueTemplates.rules`).

## Checks
- **`npm run test:release`** (port 5199 cleared first) passed twice: on the feature, then on the go-live commit.
  - 1,206 unit tests;
  - `typecheck:convex` and the build;
  - `npm audit`: 0 vulnerabilities;
  - all 15 shared browser suites;
  - the sector suites, including **hvac browser 340/340**: manager and technician, EN/AR, 1440/768/320, axe, no overflow, nine journeys;
  - **Ascend end to end 107/107**, of which HVAC's manager and technician journey is 24.
- **Mutation checks:** 4 of 4 caught.
  - no "customer's yes" guard on repair;
  - no technician overlap guard;
  - renewal set to Auto;
  - first-time fix ignoring repeat visits.
  The first one survived at first, and a test was added for it.

## Release
- **Lineage:** live was `dpl_BA8L25BHS9jcZV3xXamyqpTUgSx7` from `42d3071`, which master contains.
- **Convex Green `prod:rare-fish-465` first,** from a clean `git archive` of `77fa988`:
  - new tables `hvacUnits`, `hvacContracts`, `hvacJobs`, `hvacVisits`, `hvacEstimates`, `hvacTasks` and `hvacDrafts`;
  - optional fields `hasibSettings.hvac`, `hvacDraftId` and `blueTemplates.rules`;
  - `convex deploy --dry-run` confirmed no index is deleted.
- **Vercel:** `dpl_9JvKHJ1FiEQPXX1gTrcW4jxYCDV6` (`--meta sourceCommit=77fa988`), aliased to `www.bznsflowai.com`.
- **Rollback:**
  - redeploy `dpl_BA8L25BHS9jcZV3xXamyqpTUgSx7`, and remove `hvac` from `HASIB_LIVE_PACKS` in the next build;
  - the Convex additions stay; the old site ignores them.
- **Live check (2026-11-03):**
  - `/`, `/en`, `/apex`, `/audit`, `/privacy`, `/layla/dashboard`, `/en/layla/dashboard`, `/owner/preview/hvac`, `/en/owner/preview/hvac` and `/owner/preview/dental` return 200;
  - an anonymous `hvac_overview` gets 401 `sign_in_required`; a cross-origin call gets 403;
  - the sign-up industry list includes Air conditioning;
  - `vercel inspect` shows production on `dpl_9JvKHJ1F…`.

## Not done
- **No signed-in production session** on an AC workspace, and no real tenant history, so KPI accuracy on real data is unproven.
- **Messages outside the 24-hour window:** automatic sends need approved utility templates; until then they become `template_required` tasks.
- **No client yet:** there is no named HVAC client. Selling it is a commercial step for Ahmed; Pricing is unchanged.
