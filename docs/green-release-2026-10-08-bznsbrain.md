# Green release 2026-10-08: Catalyst BznsBrain

**Source:** `ed164e5` on `master`, released at Ahmed's request ("deploy").

## What changed
- **Catalyst Settings › BznsBrain** replaces the old onboarding and business-knowledge screens. The four main tabs are unchanged.
  - Two data-entry tabs: bzns.md and the Catalog, with one Publish for both.
  - A review queue for Qwen extraction suggestions, old Q&A answers and uncovered customer questions.
  - Layla's behaviour as validated settings.
  - A Test Layla side panel that works on either the draft or the published version.
- **New `/catalyst/setup` journey:** industry → information → review → behaviour → test and publish → account → channel.
  - `/layla/setup` redirects to `/catalyst/setup`.
  - The Instagram connection returns to where it started.
  - The dashboard no longer sends a Catalyst account with no channel back to setup.
- **Dental reception flow** for Catalyst accounts. Appointment requests appear in Customers.
- **Ascend:** prompt, qualification and screens unchanged. `/ascend/setup` redirects to the dashboard, and pricing offers no Ascend entry.
- **Details:** `docs/product-design.md` (Catalyst BznsBrain).

## Evidence

| Item | Value |
|---|---|
| Verification | 814/814 unit tests; Convex typecheck; build (12 api functions); 9/9 browser suites (177 new BznsBrain checks, EN/AR, 320–1440); `npm audit` 0 vulnerabilities. |
| Convex | `rare-fish-465`. The dry run passed: schema validation complete, no index deletions, additive only (new table `brainProposals`, optional fields). Ahmed ran the deploy (the agent's attempt was blocked by the safety check). Confirmed live: `POST /blue-brain` returns 401, an unknown route returns 404. |
| Vercel | `dpl_8PsaFZQhxYH85jC9LUc1iEfgNnsE`, promoted 2026-10-08 after Convex was confirmed live. |
| Smoke | 200 for `/`, `/en`, `/catalyst/setup`, `/en/catalyst/setup`, `/layla/dashboard`, `/en/layla/dashboard`, `/privacy`, `/en/owner/access`. 307 redirects for `/layla/setup` and `/en/layla/setup` (query string kept) and for `/ascend/setup`. Customer surface GET returns 200; an unauthenticated BznsBrain write is refused (401); an unsigned webhook returns 403. The live bundle contains BznsBrain (`assets/brain-*.js`). |
| Rollback | `npx vercel promote dpl_2hFcZ4aFGuMoopghupWhS43qCKpY --yes`. The Convex change is additive, so the previous website runs on it unchanged. |

## Not yet proven in production
- **Live model behaviour:** Qwen extraction and the BznsBrain prompt (source labels, reason, dental reception) were tested with scripted models only. A paid live eval and a real owner walkthrough are next.
- **Real data paths:**
  - An existing customer opening BznsBrain for the first time, which runs the lazy Q&A-to-proposal migration.
  - A real dental conversation on WhatsApp.
- **WhatsApp connection:** still runs on `/catalyst/setup` (Settings › Channels links there).
- **Known pre-existing issues:**
  - The Facebook pixel still runs on `/catalyst/setup`.
  - `tests/hasib-dashboard-browser.mjs` fails the same way on the previous commit.
