# MCP and onboarding logic audit — 9 November 2026

## Result

Traced HTTP admission, OAuth, tool discovery, preparation, approval, domain execution, receipts and queued-effect checks, plus account-owned setup progress and website-brief retry logic. Found and repaired one additional MCP reporting defect locally: campaign worker completion was treated as successful delivery. Production remains unchanged.

The preceding [live verification](../live-verification-2026-11-09.md) remains the source for actual production observations. This audit's behavioral tests use local synthetic persistence/provider responses. They do not establish live writes, real transaction races, provider delivery or actual ChatGPT acceptance.

## Logic checked

| Rule | Evidence |
| --- | --- |
| Identity comes from the session/grant, not a supplied account ID | Entry-wrapper and domain tests reject foreign identities/records, expired sessions, employees and revoked access |
| Tool discovery and execution follow current scope, areas, plan and sector | Read/write, area restrictions, plan downgrade and explicit capability-disposition tests |
| Connection consent is separate from permission to execute consequential actions | Protocol-to-domain test proposes pause, proves no change before approval, then executes the exact approved request |
| Changed records or permissions invalidate approval | Snapshot, catalog, policy change and expiry regressions |
| Duplicate requests do not repeat a business operation | Exact retries replay stored outcomes; changed arguments with the same key fail; knowledge draft identity remains separate |
| Provider inspection does not activate paused messaging | Synthetic provider failure/recovery test verifies durable claims, refresh throttling and preserved owner pause |
| Revocation blocks admission and unstarted effects | Local queued-message checks plus the prior live read-only token/refresh revocation evidence |
| Onboarding progress is account-owned and versioned | Duplicate save, changed payload, stale writer, invalid state, independent product progress and sector-preservation tests |
| Website retries use the submitted version | Existing local regressions preserve submitted fields/files, account display context and original due date while a new draft exists; these earlier local fixes are not deployed |

Read-only Convex metadata inspection identified Green `rare-fish-465` and confirmed `mcp.execute`, `mcp.dispatchEffect`, `mcp.cleanup`, `productSetup.execute`, `websiteBrief.execute` and `websiteBrief.admin` are internal functions. Metadata visibility is not proof that every authorization path is correct; the local entry-wrapper tests are separate evidence.

## Defect and repair

`blueCampaignState.finishIfDone` marks a campaign `completed` when no recipient remains pending, queued or attempting. Recipients can still be submitted, failed or ambiguous. Previously `mcp.requestStatus` used that campaign status alone, incorrectly returning `completed` to the assistant.

The MCP receipt reader now checks the campaign's bounded recipient set, returns recipient counts and the original `processingStatus`, and derives the overall result from delivery receipts:

| Evidence | MCP result |
| --- | --- |
| Queued, submitted or sent without a delivery receipt | `pending` |
| All recipients delivered/read | `completed` |
| Failure with no work still pending | `failed` (counts expose partial success) |
| Ambiguous, unknown, missing or incomplete receipt evidence | `outcome_unknown` |

The query reads at most 101 rows against the existing 100-recipient campaign limit. Missing, oversized or truncated evidence cannot imply success. Single-message `sent` states also remain pending until delivered/read; unfamiliar effect states no longer default to success. Queuing, sending, scheduling and approval policies are unchanged.

The new campaign regression failed before the fix (`completed` instead of `pending`) and passes afterward. It also covers partial failure, ambiguous outcomes, full delivery, unknown states, missing receipts and oversized counts. The manual-reply journey now checks submitted/sent/delivered/read/failed/ambiguous/unknown receipts before revocation.

## Validation and release boundary

- Broad MCP, onboarding and dashboard-entry logic suite: **95/95 passing**.
- Final receipt/campaign regression run after the extra message assertions: **50/50 passing**; overlaps the broader suite and is not an additional 50 unique tests.
- `npm run typecheck:convex`: passed.
- Code and JavaScript reviews: no substantive findings.
- No production deployment, schema migration, live send, payment or customer-record write.

Files changed in this follow-up: `convex/mcp/state.js` and `tests/mcp-state.test.mjs`, plus this evidence record. The earlier local OAuth consent-return repair remains pending release too. A future MCP-only deployment must isolate these reviewed changes from the unrelated dirty onboarding/UI/provider work. This receipt repair requires a Convex runtime deployment but no schema change.

Local ignored evidence: `work/logic-audit-2026-11-09/{campaign-before.log,campaign-after.log,logic-suite.log,final-receipts-and-campaigns.log,typecheck.log}`.
