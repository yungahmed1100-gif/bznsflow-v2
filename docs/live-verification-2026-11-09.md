# Green live verification — 9 November 2026

## Outcome

The deployed MCP endpoint is available and its real OAuth/PKCE, authenticated reads, refresh rotation and revocation passed. The overall website does **not** have unconditional end-to-end acceptance: one live MCP re-verification bug, mobile privacy-table accessibility failures and a displayed Meta billing blocker remain. Messaging, financial/customer writes and actual ChatGPT acceptance were not exercised.

Target: `https://www.bznsflowai.com`, Vercel `bznsflow-main`, deployment `dpl_HENxf5PXasHe8Eudb2AVDoMpEUm6`, runtime source `63fb0dab8c86f5ac6f8799cf60e986948c5773bb`. Convex remains `rare-fish-465` at the MCP-only release's restored baseline. See [the production release record](green-release-2026-11-08-mcp-only.md). This verification did not deploy, migrate, send customer messages or modify business records.

Times in machine evidence use UTC on 8 November; this report uses the owner's Muscat date, 9 November.

## Live evidence

| Surface | Observation | Limit |
| --- | --- | --- |
| Public MCP health | 13/13 checks passed: routing, discovery, identity/logo, admission and headers | No authenticated calls in this probe |
| Anonymous/API boundaries and OAuth starts | 29/29 checks passed, including unauthenticated access, CSRF/origin refusal and configured Google/LinkedIn redirect starts | Social-provider callbacks were not completed; disabled providers correctly return to sign-in |
| Anonymous browser audit | 56 routes at 1440 and 390 pixels: 112 checks, 110 clean and 2 privacy accessibility findings; no broken checked asset links, asset HTTP failures or API 5xx | Public pages, private signed-out shells and preview routes; preview data is not real sector acceptance |
| Real email sign-in | Email-code login succeeded; a second fresh verification succeeded | One owner account; no employee or second-tenant live session |
| Signed-in APIs | 7/7 returned HTTP 200 and `ok: true`: dashboard, Hasib, MCP management, knowledge, product setup, website brief and access administration | Owner/manager, Ascend, retail workspace; reads only |
| Signed-in dashboard | All 9 main sections loaded in English desktop and Arabic mobile without observed JavaScript errors, API 5xx or horizontal overflow | Navigation/read smoke checks, not successful write workflows |
| Settings and operations | 6 settings views and 4 work views checked in both languages/viewports; rendered controls or explicit follow-up empty state confirmed | Empty-state follow-ups have no button; verified by their actual heading after the generic button readiness check timed out |
| Owner/onboarding | Owner landing, access grants, website queue, Apex queue and existing-account Catalyst setup loaded | No new account onboarding, provider registration/disconnection, grant edits or brief submission |
| Real MCP SDK journey | 10/10 assertions passed: PKCE exchange, identity/icon, paginated discovery, 4 reads, unknown-tool refusal, refresh and revoked-token refusal | SDK integration, not actual ChatGPT model/client acceptance |

The temporary connection was explicitly authorized with `workspace:read`. Discovery returned **62 available tools on 2 pages**, all with the BznsFlow icon. The four executed tools were `bznsflow_business_state`, `bznsflow_dashboard_overview`, `bznsflow_messaging_state` and `bznsflow_hasib_overview`; each returned `completed`. Discovery is not proof that all 62 tools were executed. Some available tools describe website handoffs rather than direct business operations.

Cleanup: the temporary connection displayed **Disconnected**; its access token returned HTTP 401 and its rotated refresh token returned `invalid_grant`. The pre-existing Claude connection remained verified. The local callback process was stopped, and tokens were retained only in process memory. The isolated website test session was signed out: HTTP 200, account cleared, and a subsequent protected management read returned 401. No additional production grant was left active by this test. The test's public dynamic client registration may remain as inert registration metadata.

## Findings and local repair

1. **MCP consent disappears after fresh sign-in.** With an older session, consent correctly returns `fresh_sign_in_required`. After email re-verification, `/mcp` loses the pending consent screen. Reopening the original authorization interaction restored it, allowing the live SDK verification to finish. Root cause: `completeInteraction` cleared `bf_mcp_resume` before checking fresh identity. The local fix clears it only after an allow/deny decision completes. A real local HTTP OAuth regression failed for all three scope combinations before the fix, then passed, including same-interaction recovery and no connection creation by stale consent. All **40 MCP unit/integration tests** passed afterward. Code and JavaScript reviews reported no substantive findings. **This follow-up repair is local, not deployed.**
2. **Mobile privacy tables lack keyboard access.** `/privacy` and `/en/privacy` at 390 pixels trigger serious axe `scrollable-region-focusable` findings on `.legal-table-wrap`. Existing local legal-table changes are outside the MCP-only production release; this finding remains live.
3. **Meta billing warning.** Broadcasts and onboarding display that Meta needs a working payment method. This is evidence of the account's displayed provider state, not a fresh send attempt or an independently verified Meta billing diagnosis. No payment settings were changed and no message was sent.

## Remaining acceptance

The [follow-up logic audit](mcp/logic-audit-2026-11-09.md) found and locally repaired an additional MCP campaign-outcome reporting defect. That repair is also not deployed.

- The actual ChatGPT connection/refresh/icon rendering still needs the owner's client run. Server and tool icon metadata were verified; that does not guarantee a particular ChatGPT rendering.
- Live writes, approval-required operations, customer imports/exports, order/payment flows, team invitations, website submission and external message/email delivery were not run. Existing local synthetic tests are separate evidence.
- Social-login completion, new customer provider onboarding, employee/foreign-tenant live sessions, other sectors' real datasets, sustained load and long-running expiry/cleanup remain outside this run.
- The consent repair needs its own isolated MCP-only release and live re-verification before it can be reported as fixed in production.

## Reproduction and artifacts

Reusable anonymous audit: `node tests/live-deployment-browser.mjs`. It uses fresh unsigned browser contexts, blocks writes, analytics/external requests and the two legacy draft-creating GET surfaces, checks real deployed pages/APIs and saves findings/screenshots. It deliberately exits nonzero for the live privacy findings.

Local MCP regression: `node --test tests/mcp*.test.mjs`.

Sanitized local evidence is in ignored `work/live-verification-2026-11-09/`: `deployment.json`, `mcp-health.json`, `api-boundaries-verified.json`, `browser-final-reviewed/report.json`, `authenticated-api.json`, `authenticated-subviews-verified.json`, `followups-empty-state.json`, `admin-views.json`, `mcp-sdk-report.json`, and before/after regression logs. Earlier browser runs in that directory are superseded test-harness iterations, not acceptance evidence. Business payloads, cookies, OTPs and bearer tokens are excluded from the reports.
