# End-to-end and MCP verification — 8 November 2026

Source baseline: `aecd3f2`, uncommitted local candidate. This pass adds a regression journey and records verification; it makes no further UI or runtime changes. It does not deploy the earlier backend/onboarding fixes.

## MCP protocol-to-domain acceptance

New repeatable entry point: `node --test tests/mcp-flow-e2e.test.mjs`. The normal release command discovers this file automatically.

The journey uses the official MCP SDK, two real local OAuth/provider instances, the real public HTTP handler, `runTool`, `mcpStore`, a bundled `convex/mcp.ts` entry handler, and existing domain executors. Convex HTTP transport and persistence are substituted by the synthetic bridge/memory fixture. This establishes local integration, not real Convex transaction/race acceptance.

Verified outcomes:

- OAuth dynamic registration, S256 PKCE, one owner consent, callback state, code exchange and durable owner/connection/grant binding.
- SDK initialization and all discovery pages: at most 60 tools per page, no duplicate names, applicable sector tools present and unrelated sector tools absent.
- A business read, Hasib overview and a timezone edit that actually persists in the tenant's business settings.
- Exact duplicate recovery and changed-argument idempotency refusal.
- Owner consent does not execute a consequential action. Pause first requires website approval, then changes the real messaging control; retries recover its receipt.
- Request-status lookup, invalid/foreign identity argument refusal and arbitrary-tool denial.
- Provider connection inspection uses only the three expected GET requests. Immediate repeats are throttled without additional provider requests.
- A synthetic provider 401 leaves `reconciliation_required` and releases the durable operation claim. A later successful check makes three fresh requests and persists changed evidence, restoring `connected` while retaining the owner's pause. No subscription, registration, activation or send is performed by these checks.
- Refresh-token rotation resolves to the same persisted connection. Website revocation invalidates subsequent calls with the protected-resource challenge, and the rotated refresh token returns `400 invalid_grant` rather than reviving the connection.
- Durable request leases are released and no messages are created.

The current registry contains 407 dispositions: 361 tool adapters, 22 website handoffs and 24 unavailable operations. Coverage tests check explicit action/operation policy and closed schemas. This is not a claim that every adapter has been invoked through every real client.

## Read-only production boundary checks

Observed on `https://www.bznsflowai.com` on 8 November 2026. No cookies, bearer tokens or customer records were used. No OAuth client was registered in production.

| Boundary | Observed result |
| --- | --- |
| DNS | Two IPv4 answers returned from this machine's resolver. This is one vantage point, not a global reachability measurement. |
| Protected-resource discovery | 200, correct `/api/mcp` resource, `/oauth` authorization server, supported read/write scopes, `no-store`. |
| All four authorization-server discovery aliases | 200, issuer `https://www.bznsflowai.com/oauth`, S256, expected HTTPS authorization/token/registration endpoints. |
| Public JWKS | 200, RSA/RS256 signing key metadata; no private key fields present. |
| Unauthenticated `/api/mcp` | 401, correct `WWW-Authenticate` metadata URL and scopes, `no-store`. |
| CORS preflight | ChatGPT, Claude.ai and Claude.com origins return 204 with the expected origin/headers/methods; an untrusted origin returns 403 without an allow-origin header. |
| Anonymous account endpoint | 200, anonymous account response. |
| English connection page | 200, `private, no-store`. |

## Verification results

- Full unit inventory: **1,238 passed, 0 failed**.
- The five MCP test files passed 38 tests. The final strengthened recovery assertions also passed in the targeted protocol-to-domain test.
- `npm run test:release` exited 0: existing unit inventory, Convex typecheck, production build, dependency audit (zero vulnerabilities), all 17 shared browser suites, Catalyst and every configured sector suite passed. This includes 12 construction/automotive scenarios and 107 final Ascend cross-feature checks. The release process started before the new protocol-to-domain file was added; the separate full unit run includes that file (1,238 passing), and its final strengthened assertions passed again afterward.
- The shared browser run includes 236 MCP checks and all 112 route/viewport audits across 56 paths, with zero route findings, failed local assets or broken internal links.
- `git diff --check`: passed.
- Independent JavaScript/code reviews found no runtime issues in this pass. Review corrections removed a weak encryption assertion, clarified the synthetic bridge boundary, bounded failure teardown and proved fresh provider evidence on recovery.

Ignored evidence: `work/mcp-flow-audit/release.log`, `units-final.log`, `mcp-tests.log`, `integrated.log`, `public-health.json` and `public-cors-jwks.json`.

## Remaining acceptance

The owner selected **ChatGPT** for real-client acceptance. A signed-in connection and tool call remains unverified: no BznsFlow tools are exposed to this chat, plugin discovery returned no BznsFlow result, and computer-use inventory reported the browser access host unavailable. The native Chrome fallback returned `noWindowsAvailable`. These observations establish a test-access blocker, not a defect in the MCP server or proof that the owner's connector is disconnected. No production connection/grant was created or revoked. SDK acceptance does not substitute for that client run.

Resume by making the existing BznsFlow connector available to the checking conversation, or providing an accessible signed-in ChatGPT browser session. Start with a read-only business-state call and compare the workspace identity, tool response and server activity. Do not use customer records or consequential writes merely to prove connectivity. Creating a new grant or expanding existing scopes remains a separate action from inspecting the current connection.

Actual provider token validity, customer Meta eligibility, real messages/emails/payments, production Convex transactions and field latency are outside these synthetic checks. Firefox/WebKit execution remains a separate browser gap from the earlier site audit. Historical client/deployment observations in `release.md` retain their original dates.

No new deployment or external-effect authorization is implied. Earlier backend changes still require their documented additive-schema-first release sequence and explicit deployment authorization.

## Connection repair and identity follow-up

The owner's follow-up authorized connection-flow improvements and recognizable BznsFlow branding. Scope: existing MCP handlers, public identity, connection guide and refresh error recovery. No new grants, tools, provider effects or database schema are added by this increment. Acceptance uses public read-only probes, protocol/domain tests and bilingual production-build browser checks. Rollback can revert these identity/guide/recovery files independently of earlier backend/schema fixes.

- Reproduced a quiet-refresh defect: after a manager/access refusal while the page remained open, stale controls stayed visible. The new browser regression failed before the fix. Quiet 401/403 responses now clear connection/consent state and show the refusal; transient background failures continue preserving the current view.
- Shared identity metadata supplies the original BznsFlow logo, server description and instructions. Tools also advertise the same standard PNG icon. OAuth error pages display BznsFlow's logo/help link without exposing error details. Existing consent and logo-download UI remain available. A client controls whether it renders icon metadata; automatic ChatGPT rendering is not claimed.
- Updated bilingual ChatGPT instructions against the current [OpenAI connection guide](https://help.openai.com/en/articles/12584461) and [plugin test/refresh guidance](https://developers.openai.com/plugins/deploy/connect-chatgpt): Plugins → + → Add custom MCP server, OAuth and tool discovery; retain the legacy Apps fallback and explain Refresh after metadata changes. This does not publish or install a ChatGPT plugin.
- Repeatable public probe: `npm run mcp:health` or `node scripts/check-mcp-health.mjs https://www.bznsflowai.com`. It uses bounded, read-only requests and outputs no session/bearer credentials. **13/13 live public checks passed**, including DNS, four issuer discovery aliases, protected-resource metadata, 401 challenge, importable public RSA signing keys, the 256×256 PNG and trusted/untrusted CORS. It does not check an authenticated account or provider delivery.
- The diagnostic recognizes `application/jwk-set+json`. Independent review closed a false-positive gap: empty/malformed/private/non-signing/weak JWKS keys cannot produce a healthy result. Regression tests cover unusable key material.
- Current [function inventory](capabilities-2026-11-08.md) records all 407 dispositions and conditional discovery counts. It does not claim that an anonymous probe can enumerate a customer's allowed tools.

Final follow-up verification: **1,240 unit tests passed**, production build passed, and **248 MCP browser checks passed** in Arabic/English at 320/768/1440px, including in-place access refusal. Independent code/JavaScript reviews found no remaining confirmed issues. `git diff --check` passed. The broader full release run above predates this narrow increment; no unrelated sector reruns were required.

Ignored follow-up evidence: `health-current.json`, `health-tests.log`, `identity-tests.log`, `identity-oauth.log`, `identity-units.log`, `identity-build.log`, `connection-browser-production.log` and failing-before `quiet-denial-before.log`, all under `work/mcp-flow-audit/`. Changes are local and need an authorized deployment before production clients receive the new metadata/flow. Signed-in ChatGPT acceptance remains blocked by the tool/browser access issue recorded above.
