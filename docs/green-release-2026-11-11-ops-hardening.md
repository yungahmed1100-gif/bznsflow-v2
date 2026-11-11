# Green release: function deadlines, quiet logs, file-size limit, Rasil for every Ascend account (11 November 2026)

**Authorization:** Ahmed, 11 November 2026: fix the open items after the MCP verification and "seek the best solution". He chose to open Rasil to every Ascend account now, without the real-domain deliverability test.

| | |
|---|---|
| Source | `3a0567c` on `release/ops-hardening-2026-11-11`, fast-forwarded to `master` |
| Website | `dpl_3cDKiCnD4yVUv69DZRxREwWFCVtS`, promoted to www.bznsflowai.com |
| Convex | No change: the dry run on `rare-fish-465` showed no function, index or schema difference |
| Production env added | `RASIL_ENABLED=true`, `NODE_OPTIONS=--disable-warning=DEP0169` |
| Rollback | Promote `dpl_8nDdNzkBMf9noVhoUoAUGQzwtv1y`, whose environment has neither new variable. Then remove `RASIL_ENABLED` from Production so a later deploy does not reopen it. |

## What was wrong and what changed

**The 60-second timeouts.**
- What happened: 10 `Task timed out after 60 seconds` errors between 8 November 22:14 UTC and 10 November 11:20 UTC.
- Where: `/api/layla-meta`, the shared function behind MCP, OAuth, setup, knowledge and Rasil's public links. The WhatsApp webhook was not affected.
- Cause: assistants opened the MCP GET stream, which ran until the platform stopped the function. `2a13e88` fixed this for MCP only, and the logs never said which surface was slow.

The fix now covers every function, not just MCP:
- `api/_lib/deadline.js` adds `withDeadline`. Every `api/*.js` function races its handler against a deadline 10 s under its `maxDuration`. When the deadline expires, the function answers 504 `request_timeout` and logs `request_deadline` with the function and surface name. MCP keeps its 45 s budget through the same helper.
- Customer photos and voice notes (`inbound-media.js`) get one 40 s budget covering fetch, storage and reading. The result is always recorded, so Layla always answers. Before, a slow Meta download, a slow Convex upload and a slow Qwen read could together run past 60 s and lose the message.
- `api/access-admin.js` now declares a `maxDuration` of 30 s in `vercel.json`.
- Guard test: `tests/function-deadlines.test.mjs` fails if any function lacks a `maxDuration` or a `DEADLINE_MS` below it. It also checks a slow surface, a slow photo and a stalled download.

**Log noise.**
- What happened: 232 "errors" were Node's DEP0169 `url.parse` deprecation warning. It is raised by the runtime and by koa's `parseurl`, not by our code.
- Fix: `NODE_OPTIONS=--disable-warning=DEP0169` hides that one warning code. Every other warning and error still logs.
- After release: the runtime-error view and the runtime logs are empty for the new deployment.

**File size.**
- `src/styles/mcp.css` was 804 lines. It is now split at its Approvals section into `mcp-approvals.css`, imported straight after it.
- The built page has the same 310 MCP rules in the same order.
- Guard test: `tests/file-size.test.mjs` fails any source file over 800 lines. The older `config/mcp/hasib-policy.js` is capped at its current 1,311 lines until it is split.

**Rasil open to every Ascend and Apex account.**
- `RASIL_ENABLED=true` is set in Production.
- English and Arabic copy on the plan card, the business page, the structured data and `llms.txt` now describes Rasil as included: owner-approved campaigns from the business's own domain. Follow-up sequences are not built, so they are no longer claimed.
- New endpoint: `GET /api/layla-meta?surface=rasil-status` reports `{ open, domains }`. It asks Resend at most every five minutes.
- The production health check, now 16 checks, fails if Rasil is open but the key cannot manage customer domains.
- Production answers `{"open":true,"domains":"ready"}`: the Resend key can manage customer domains.

## Evidence

- **Release check:** `npm run test:release` on a clean `git archive` of `3a0567c` passed.
  - 1,254 unit tests: the earlier 1,241 plus 13 new.
  - Convex typecheck, build and 0 vulnerabilities.
  - All 15 shared browser suites, including MCP 272 and home 364.
  - Every sector suite, and Ascend end-to-end 107.
  - The first run caught a plain apostrophe in "business's" inside a quoted string in `src/lib/schemas.js`. The build failed and nothing was deployed. It was fixed with the typographic apostrophe and the full check was rerun.
- **Staged deployment (before promotion):**
  - Pages return 200.
  - Rasil status is ready.
  - No "coming soon" in either language.
  - MCP and OAuth refuse the temporary host (403), as designed.
- **Production after promotion:**
  - Health passes 16 of 16.
  - All 38 public pages return 200.
  - No runtime errors and no log noise.

## Not proven

- **Rasil deliverability on a real customer domain:** SPF, DKIM and DMARC passing, inbox placement in Gmail, Outlook and iCloud, one-click unsubscribe and bounce suppression. The first real campaign is that test.
- The `request_deadline` and `media_deadline` paths are proven by tests only; neither has fired in production.
- `config/mcp/hasib-policy.js` is capped at its current size but not yet split.
- The in-place code confirmation on the MCP consent card still awaits its first real use (see `docs/green-release-2026-11-10-mcp-control.md`).
