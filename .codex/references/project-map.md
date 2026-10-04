# Project map

Paths below are relative to the repository. Use `rg` to find the actual entry and callers; this is a routing index, not a complete architecture dump.

| Concern | Start here |
| --- | --- |
| Runtime dependencies / commands | `package.json`, `package-lock.json` |
| Static routing / HTML / hydration | `src/root.jsx`, `src/route-modules/`, `react-router.config.ts` |
| Main dashboard | `src/pages/LaylaDashboard.jsx`, `src/components/dashboard/`, `src/lib/dashboard/` |
| Sector operations | `src/components/hasib/`, `convex/hasib/`, `config/hasib-packs.js` |
| Owner / product access | `src/pages/OwnerHome.jsx`, `api/access-admin.js`, `convex/blueAccess.ts`, `convex/blueAccessState.js` |
| Dashboard API boundary | `api/_lib/layla/dashboard-api.js`, `convex/blueDashboard.ts`, `convex/blueDashboardState.js` |
| Auth / grants | `api/_lib/blue-auth.js`, `convex/blueAuthState.js`, `convex/hasib/plans.js` |
| Layla routing and retrieval | `api/_lib/layla/domain.js`, `api/_lib/layla/rag-engine.js` |
| AI evaluation | `config/eval-questions.js`, `scripts/eval-intents.mjs`, `tests/eval-harness.test.mjs`, `tests/blue-rag.test.mjs`, `tests/blue-qualification.test.mjs` |
| Consolidated verification | `scripts/verify-release.mjs`, `scripts/run-browser-tests.mjs`, `tests/dashboard-entry.test.mjs` |
| Deployment evidence | `docs/green-release-2026-10-05.md`, `.vercelignore` |

Despite historical `blue*` filenames, this checkout's active backend is Green (`rare-fish-465`). Blue is a separate project. Verify the selected project before CLI operations. Imported sessions/OTPs/Blue credentials are not part of the migration contract.

Canonical policy entrypoint: `/Users/ramsis21/Desktop/obsidian/business/Operating-System.md`. Read it once per task and follow its routing table. For application changes use Engineering; for new architecture use Project-Standard; for retrieval select SME or large-corpus procedure. Do not load every policy for a minor UI edit.

Private operational artifacts belong in ignored `work/` or another explicit ignored destination. Do not add cookies, source snapshots, message bodies, credentials, production log dumps or client datasets to skills or examples.
