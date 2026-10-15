# MCP release and acceptance record

Status: **local implementation; not deployed or enabled**. Branch `feat/bznsflow-mcp`, isolated worktree `/Users/ramsis21/Desktop/bznsflow-mcp`. Base: `9f3a6a4`, including the prior global-reliability release. The dirty main checkout is untouched.

## Implemented surface

- `/api/mcp` — official TypeScript MCP SDK, stateless Streamable HTTP and paginated named tools.
- `/oauth/*` and standards discovery rewrites — `oidc-provider` with encrypted durable Convex records.
- `/api/mcp/manage`, `/api/mcp/transfer`, `/api/mcp/worker` — protected management/download/worker paths routed through the existing function; total stays within Hobby's 12-function limit.
- `/mcp` and `/en/mcp` — bilingual private consent and connection-management pages.
- 361 explicit registry entries: 317 tool adapters, 20 website/provider handoffs, 24 unavailable operations. Discovery further filters the current plan, live sector, permissions and Hasib availability.
- Dublin (`dub1`) remains the single Vercel function region. No DNS/CDN change.

Pinned server dependencies: MCP SDK 1.32.1, oidc-provider 9.12.2, Zod 3.25.76, AJV 8.20.0. The installed SDK negotiates `2025-11-25` and its supported earlier protocol versions; it does not claim a newer transport version. Authorization follows the referenced MCP OAuth requirements, separately from transport-version negotiation. Verify negotiation with the actual clients before enablement.

## Local evidence

Results and source revision are recorded at the end of this file after final verification. Synthetic runs do not contact production Convex, Meta, Resend or customer accounts.

- `tests/mcp-coverage.test.mjs`: accepted HTTP actions and Hasib operation inventory have explicit dispositions.
- `tests/mcp-state.test.mjs`: owner/employee/foreign-record boundaries, changing plans/permissions, stale and expired approvals, idempotency, eight live-sector read/approved-write workflows, private file transfers, knowledge draft identity, catalog fencing, queued replies and revocation.
- `tests/mcp-oauth.test.mjs`: real local HTTP OAuth against two provider instances sharing durable-adapter stand-ins; PKCE, OAuth-only and OIDC clients, actual SDK initialize/discovery/tool call, refresh rotation/replay, wrong audience, client-metadata restrictions and revoked access.
- `tests/mcp-browser.mjs`: Arabic/English at 320/768/1440, signed-out and owner states, consent, permissions, approval, fresh verification, disconnection, employee denial, keyboard interaction, Axe accessibility and private prerendered HTML. Artifacts: ignored `work/mcp-browser/`.
- `npm run test:release`: existing unit, typecheck, production build, dependency audit and full browser inventory, including MCP.

## Candidate acceptance still required

The user authorized implementation and preparation; this record does **not** authorize production promotion, production database migration or real messages.

1. Provision an isolated synthetic Convex candidate and unaliased Vercel candidate with a fixed HTTPS origin. Never point synthetic writes at Green customer data. Supply secrets outside Git, enable only the test owner, and verify regional deployment.
2. Apply additive schema/functions to that isolated target. Run real restricted-boundary tests against Convex: expired/revoked/employee/foreign IDs; simultaneous duplicates; simultaneous approval/execution; revocation during queued work; permission/plan/integration changes; refresh-token replay. Local memory fixtures are not evidence of Convex OCC or deployed HTTP routing.
3. Connect **Claude remote**, **Claude Code** and **Codex** through their real login flows. For each, record client/version, registration method, negotiated protocol, permitted discovery, allowed read, approved write, refresh and disconnect. Public Claude cannot connect to a localhost-only test server. No such client acceptance is claimed here.
4. Run email-code and configured social sign-in returns against the candidate's real account endpoints, including account switching, expired transactions and reloads. Exercise live provider health checks using approved synthetic assets; external sends remain mocked.
5. Measure latency/capacity and errors under the configured rate/concurrency limits, provider slowdown and cleanup backlog. Verify no secrets/customer data enter telemetry. Record the configuration and rollout spending ceiling.
6. Verify deployment rewrites, OAuth redirect/issuer URLs, private page cache/referrer headers, no-index metadata, function size/cold starts and Dublin function placement. Verify normal website/authentication/API behavior with MCP disabled.
7. Obtain explicit Green release authorization only after the candidate evidence is complete. Prepare a clean source archive excluding secrets, caches and ignored artifacts. Keep the prior production deployment recorded for rollback.

## Configuration

`.env.example` names the new variables. Generate values directly into the credential vault; never commit or print them in reports.

| Variable | Runtime | Purpose |
| --- | --- | --- |
| `MCP_ENABLED` | Vercel + Convex | Fail-closed admission/effect kill switch; initially false |
| `MCP_PILOT_EMAIL` | Convex (mirror in deployment config) | Initially Ahmed's verified owner email; remove only after acceptance |
| `MCP_OAUTH_ENCRYPTION_KEY` | Vercel | Independent 32-byte AES key, hex |
| `MCP_OAUTH_JWKS` | Vercel | Stable private RS256 JWKS with unique key ID |
| `MCP_COOKIE_KEYS` | Vercel | Strong signing keys, newest first |
| `MCP_WORKER_SECRET` | Vercel + Convex | Independent invitation-worker secret |
| `PUBLIC_SITE_ORIGIN` | Vercel + Convex | Fixed candidate/production HTTPS origin, no trailing path |

Existing Convex service credentials, sign-in provider configuration, model/provider credentials and Green gates remain required; this feature does not create substitutes. Use a supported Node LTS runtime for the candidate. Local tools currently run Node 25.9.0; oidc-provider warns about that non-LTS runtime.

## Rollout and recovery

Deploy additive Convex tables/optional message/campaign origin fields and guarded workers first, only after explicit authorization for the target. Deploy the committed website/API candidate with MCP disabled, verify ordinary flows, then enable the pilot in both runtimes. OAuth clients must re-register for a changed issuer origin. Record source SHA, Vercel deployment ID/URL, Convex target, configuration version and acceptance evidence.

Rollback: disable `MCP_ENABLED` in Vercel **and Convex**, revoke pilot connections, and restore the previous Vercel deployment if necessary. **Keep the additive Convex schema and MCP-aware worker guards** while tagged jobs exist. An older worker that ignores origin tags is not a safe rollback for queued MCP effects. Never undo already submitted external effects or delete receipt/audit evidence to make a rollback appear clean.

Invitations have a durable intent and Resend idempotency key. A submitted receipt is not inbox delivery. An interrupted/uncertain attempt is reported as unknown and is not automatically resent; inspect the provider receipt first. Campaigns and messages retain their existing cancellation, opt-out, window and delivery-receipt rules.

Stop rollout for any foreign-record access, unauthorized consequential action, replayed effect, failed refresh/disconnect, missing audit evidence or normal website/auth regression. Ahmed owns the release decision and recovery response. Hobby/commercial-use and IPv6 limitations from the reliability release remain unchanged.

## References

- [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
- [Claude custom connector setup](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [oidc-provider](https://github.com/panva/node-oidc-provider)
- Codex/Claude Code command syntax was checked locally with each installed CLI's help. The page's commands do not claim a verified remote connection.
