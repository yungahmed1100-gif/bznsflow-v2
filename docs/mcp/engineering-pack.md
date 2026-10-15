# BznsFlow MCP — engineering pack

Owner: Ahmed. Implementation profile: standard business workflow with customer data and consequential external effects. Standard: BznsFlow Project Standard v1.0. Source: isolated `feat/bznsflow-mcp` worktree, based on verified release source `9f3a6a4` (runtime `68e9352`). Production remains unchanged.

## Outcome and boundary

An authenticated business owner connects Claude, Claude Code or Codex to their existing workspace. Existing account IDs, plan entitlements, selected live sector, provider checks and domain rules remain authoritative. Employees cannot create owner connections. Platform administration, preview sectors, Rasil and new provider onboarding are excluded. Provider credential entry/consent and document/spreadsheet selection remain explicit website handoffs.

Arabic/English `/mcp` and `/en/mcp` provide consent, permission areas, read/write access, direct-execution categories, approvals, activity and revocation. Private pages are noindex, no-store and excluded from Meta and Speed Insights. Customer data loads only after authenticated requests; prerendered HTML contains a neutral shell.

## Request and data path

```mermaid
flowchart LR
  AI[Claude / Claude Code / Codex] --> MCP[/api/mcp — Streamable HTTP]
  Owner[Signed-in owner] --> Page[AI Connections and consent]
  Page --> Manage[Cookie + CSRF management API]
  AI --> OAuth[OAuth / PKCE]
  OAuth --> Adapter[Encrypted Convex OAuth adapter]
  MCP --> Auth[Bearer audience + grant + connection]
  Auth --> Guard[Current owner / plan / sector / permissions]
  Guard --> Registry[Named capability registry]
  Registry --> Approval[Immutable proposal / 15-minute approval]
  Registry --> Mutation[Shared domain executor + receipt transaction]
  Approval --> Mutation
  Mutation --> Effects[Existing message / campaign workers and receipts]
  Mutation --> Invite[Durable invitation intent]
```

`api/_lib/mcp/handler.js` is routed through the existing `api/layla-meta.js` function. Public endpoint remains `/api/mcp`; Vercel stays at 12 functions on Hobby and `dub1`. OAuth issuer is `${PUBLIC_SITE_ORIGIN}/oauth`. Durable state remains Convex; server memory caches only SDK/provider objects, never sessions, permissions, approvals or idempotency decisions.

The application reuses `executeHasib`, shared dashboard authorization, `executeMessaging`, `executeCatalog`, `executeBrain`, `executeReview` and account-authorized knowledge operations. Browser session/CSRF protection remains independent. Provider preparation performs bounded reads outside the mutation. Authorization and version checks repeat in the mutation that commits the result and durable effect.

## Contracts and capability disposition

- `config/mcp/contracts.js`: named schemas, plan capability, sector restrictions, permission area, execution category and handler mapping.
- `config/mcp/hasib-policy.js`: explicit disposition/policy for each existing Hasib operation, including unavailable clinic preview operations.
- `config/mcp/hasib-contracts.js`: generated from existing API shapers and Convex validators; `npm run gen:mcp` regenerates, prebuild checks drift.
- `tests/mcp-coverage.test.mjs`: inspects accepted actions in current HTTP controllers. A new accepted action without a mapped tool/handoff fails.
- No arbitrary SQL, database table reader, code execution, unrestricted URL fetch or operation dispatcher is exposed as a tool.
- Existing product rules may be narrower than the legacy plan matrix: Hasib currently admits `ascend` only. MCP preserves that rule; it does not silently enable Hasib for a legacy Apex grant.
- File support: validated UTF-8 CSV contacts (100 rows / 100,000 characters), immutable transfer handles, approval-required imports, paginated exports, protected downloads. Existing document/image/spreadsheet flows use the website. No storage credentials or bearer tokens in download URLs.
- `requestId` identifies mutations. Knowledge tools additionally use `idempotencyKey`, because their existing `requestId` identifies a draft across save/publish operations. Repeating a request key with different arguments is refused.
- `bznsflow_requests_status` returns durable outcomes and actual external-effect states. Queued/submitted work is not proof of delivery. An unconfirmed commit returns `outcome_unknown`; retrying the same key recovers its receipt.

## Authorization and state

OAuth uses `oidc-provider`, authorization code + S256 PKCE, exact registered redirects, opaque audience-bound access tokens, issuer metadata, protected-resource metadata, refresh rotation and revocation. Authorization-code lifetime: 5 minutes; access/ID tokens: 15 minutes; refresh/connection lifetime: at most 30 days from the initial grant. Sensitive OAuth payloads use AES-256-GCM with model/key AAD; lookup identifiers are SHA-256 hashes. Stable signing, encryption and cookie keys are deployment secrets, never checked into Git.

Client ID metadata fetching is limited to the approved Claude/ChatGPT origins and the provider's protected fetch implementation (HTTPS, private-address and redirect protection). Dynamic registration supports native clients, with exact HTTPS or loopback redirects, at most 10 redirects, a 16 KB metadata cap, 10 registrations/IP/hour and 100 globally/hour. Native refresh/client compatibility still requires candidate acceptance.

Connections belong to one owner/workspace. Owners choose conversations, customers, business knowledge/catalog, marketing, operations, team and file access. Reads/routine edits execute directly; messages, commercial/financial actions, bulk/deletion, exports, team access and publishing/automation/channel changes require approval by default. Composite operations can require multiple categories. Permission changes and initial consent require a BznsFlow session verified within five minutes; MCP tools cannot change these policies.

Approvals store exact arguments, relevant record versions and connection policy version; they expire in 15 minutes. Catalog publication fingerprints the catalog drafts. Exports compare the exact prepared export payload before executing. New edits require a new request. Owners approve on the website, then the assistant retries the same request. Final execution remains transactional and deduplicated.

Revocation invalidates the connection and OAuth grant. Queued message/campaign/invitation work checks current access before submission; submitted work retains its actual provider status. Turning MCP off in both runtimes stops admission and unstarted MCP effects without adopting or cancelling unrelated website/automation work.

## Budgets, retention and recovery

| Resource | Bound |
| --- | --- |
| Calls | 120/minute/connection; 300/minute/workspace |
| Concurrency | 5/connection, durable 65-second leases |
| Active connections | 10/owner |
| Pending approvals | 50/workspace |
| Tool discovery | 60/page, stable sorted names |
| Inputs / outputs | 450 KB argument/transfer payloads; 500 KB result cap; domain limits may be stricter |
| Transfers | 20 active/connection; 15-minute expiry |
| Convex bridge / effect worker | 20-second request deadline; Vercel function stays at existing 60-second limit |
| Receipts / sanitized audit | 30 days; errors/latency omit prompts, tokens and customer payloads |
| Connection history | Removed 30 days after grant expiry |
| Cleanup | Indexed batches of 100/table; continuation drains backlog |

No application response cache is added. Authorization is always checked against current durable state. Existing provider limits remain authoritative. Only the optional Test Layla tool invokes the existing model adapter; it shares its current model configuration and fallback. No real model/provider spend was incurred by synthetic acceptance tests.

Operational latency/load targets and a monetary rollout ceiling require measurements on the candidate. No new paid hosting or monitoring plan is purchased. Ahmed owns release and operational response. A missing deployment key fails closed; it must never fall back to development signing keys in production.

## Control register

| Controls | Status / evidence |
| --- | --- |
| APP-01/02; DATA-01/02 | Locally verified by shared domain/entry tests, typed schemas, foreign-record and stale/duplicate/permission tests. Real Convex transaction races remain a candidate gate. |
| DATA-03/04; NET-01/02/03 | Implemented, candidate capacity/latency and real routing evidence pending. Bounded queries, no public session cache, Dublin preserved. |
| ASYNC-01/02/03 | Locally verified queued-effect origin tags and revocation gates. Existing workers retain delivery receipts. Real provider sends excluded from acceptance. |
| CACHE-01/02/03 | No new application data cache; provider objects contain no authoritative permission state. |
| AI-01/02 | Existing Test Layla adapter reused; no model/prompt change. Client tool results explicitly identify business content as data, not instructions. |
| SEC-01–05 | Local OAuth HTTP, cookie/CSRF, scope, employee, tenant, replay, expiry and revocation checks. Candidate credential setup, real-client interoperability and independent deployment review pending. |
| REL-01–03; OPS-01–03 | Release record/runbook prepared. Production promotion, recovery drill and operational acceptance not yet authorized or verified. |

This is engineering evidence, not a certification. See [release and acceptance record](release.md) for actual results and unresolved gates.
