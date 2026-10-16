# MCP release and acceptance record

Status: **implemented and deployed to an isolated synthetic candidate; Green is unchanged**. Branch `feat/bznsflow-mcp`, isolated worktree `/Users/ramsis21/Desktop/bznsflow-mcp`. Base: `9f3a6a4`, including the prior global-reliability release. The dirty main checkout is untouched. Customer enablement and production promotion remain gated below.

## Implemented surface

- `/api/mcp` — official TypeScript MCP SDK, stateless Streamable HTTP and paginated named tools.
- `/oauth/*` and standards discovery rewrites — `oidc-provider` with encrypted durable Convex records.
- `/api/mcp/manage`, `/api/mcp/transfer`, `/api/mcp/worker` — protected management/download/worker paths routed through the existing function; total stays within Hobby's 12-function limit.
- `/mcp` and `/en/mcp` — bilingual private consent and connection-management pages.
- 361 explicit registry entries: 317 tool adapters, 20 website/provider handoffs, 24 unavailable operations. Discovery further filters the current plan, live sector, permissions and Hasib availability.
- Dublin (`dub1`) remains the single Vercel function region. No DNS/CDN change.

Pinned server dependencies: MCP SDK 1.32.1, oidc-provider 9.12.2, Zod 3.25.76, AJV 8.20.0. The installed SDK negotiates `2025-11-25` and its supported earlier protocol versions; it does not claim a newer transport version. Authorization follows the referenced MCP OAuth requirements, separately from transport-version negotiation. Verify negotiation with the actual clients before enablement.

## Local evidence

Verified on 16 October 2026 Muscat time (15 October UTC). Synthetic runs do not contact production Convex, Meta, Resend or customer accounts.

- `tests/mcp-coverage.test.mjs`: accepted HTTP actions and Hasib operation inventory have explicit dispositions.
- `tests/mcp-state.test.mjs`: owner/employee/foreign-record boundaries, changing plans/permissions, stale and expired approvals, idempotency, eight live-sector read/approved-write workflows, private file transfers, knowledge draft identity, catalog fencing, queued replies and revocation.
- `tests/mcp-oauth.test.mjs`: real local HTTP OAuth against two provider instances sharing durable-adapter stand-ins; PKCE, OAuth-only and OIDC clients, actual SDK initialize/discovery/tool call, refresh rotation/replay, wrong audience, client-metadata restrictions and revoked access.
- `tests/mcp-browser.mjs`: Arabic/English at 320/768/1440, signed-out and owner states, consent, permissions, approval, fresh verification, disconnection, employee denial, keyboard interaction, Axe accessibility and private prerendered HTML. Artifacts: ignored `work/mcp-browser/`.
- `npm run test:release`: existing unit, typecheck, production build, dependency audit and full browser inventory, including MCP.

Final unit inventory: **1,006 passing**, including **32 MCP tests**. Convex typecheck, production builds and dependency audit pass; audit reports zero vulnerabilities. The 11 shared browser suites pass, including 86 MCP checks. Catalyst, retail, retail-tech, real-estate, media, fitness, dental and construction/automotive browser suites pass.

The aggregate release command exposed two pre-existing time-dependent dental fixtures: independently clamped appointment hours overlapped overnight, and a recent request moved into the overdue bucket near midnight. The fixture now clamps its schedule together, and the journey selects the request's actual bucket. After those corrections, the dental suite passed 315 checks and construction/automotive passed all 12 scenarios. Unaffected passing suites were not repeated. The full unit inventory was rerun after the final OAuth change.

Deployment found a Node-only transitive import in shared validation that typechecking did not catch. The shared error class is now runtime-independent; the actual Convex bundle and schema deployment pass.

## Isolated deployed evidence

- Runtime source: `0d1705e` (including `1df2d40` implementation and `342a8ea` Convex runtime fix). Documentation-only commits may follow.
- Candidate website: https://bznsflow-mcp-acceptance.vercel.app/en/mcp and `/mcp`.
- Separate Vercel project: `bznsflow-mcp-acceptance`, ID `prj_ZGVYMw5b2HT4rocpORv1cYJC9CXr`. Preview deployment: `dpl_2beXpncptdFjZr33bKCJ2zaQiW2t`, `bznsflow-mcp-acceptance-cpnxv7g01-yungahmed1100-7330s-projects.vercel.app`. Never promote this synthetic project to Green domains.
- Separate Convex project: `ahmed-darwish:bznsflow-mcp-acceptance`, development deployment `quaint-monitor-641`, Ireland. It expires four days after creation, on 19 October UTC. No Green credentials or customer data were copied.
- **21 real Convex HTTP checks passed**: schema validation, owner/employee/foreign management denial, concurrent duplicate writes and imports, exact approval, stale/expired approval rejection, exports, five-call concurrency, revoked/expired connections, and plan/integration changes. A candidate-only internal fixture seeded synthetic accounts and changed test conditions; it is kept under `tests/helpers/`, not shipped in the normal Convex source.
- **35 HTTPS checks passed**: actual Vercel rewrites, existing signed account-session endpoint, OAuth PKCE, SDK initialization/discovery/read/write, website approval, refresh rotation/replay and revocation. The real-estate fixture exposed 150 permitted tools. These are SDK integration checks, not model-driven client acceptance.
- All 12 Vercel functions were inspected as `nodejs24.x`, `deployedTo: ["dub1"]`. Private connection pages return `private, no-store` and `noindex, nofollow`; unauthenticated `/api/mcp` returns 401 with protected-resource metadata and read/write scopes.
- Codex CLI **0.161.0** completed actual OAuth login and Arabic consent against the candidate; its temporary credentials were removed. Tool invocation and automatic refresh inside Codex still need acceptance; SDK evidence is listed separately.

Claude Code's CIMD omits OIDC `application_type` and uses a changing loopback port. Native client defaults now support that standard flow; tests reject changed hosts, paths, query strings and HTTPS ports. HTTPS redirects remain exact. **Claude Code 2.1.285 and Codex 0.161.0 both completed actual CIMD OAuth login and Arabic browser consent on the final candidate.** Both temporary client credentials were removed. The 35 HTTPS OAuth/SDK checks passed again after this change.

Cleanup is verified: remaining synthetic connections were revoked; the candidate-only fixture environment flag and deployed function were removed. The final deployed function inventory contains no `mcpAcceptance` function. Generated credentials were scanned against tracked source with zero matches. The separate candidate remains restricted to its synthetic pilot account; it is not Ahmed's production workspace.

Read-only inspection confirmed Green still serves deployment `dpl_9xmBvVwjrrrhkFuDMRJhdRQaM5EL` (`bznsflow-main-gku4u1z6b-yungahmed1100-7330s-projects.vercel.app`). No Green deployment, migration, configuration or outbound send was performed. This ID is an observation for the release record, not a future promotion/rollback instruction.

Machine-readable evidence: [verification-2026-10-16.json](verification-2026-10-16.json). Reproducible opt-in candidate runners are `tests/mcp-candidate.mjs`, `tests/mcp-https-candidate.mjs` and `tests/mcp-cli-candidate.mjs`; credentials and seeded session files are deliberately not included in Git.

The first deployment to the new Vercel project automatically used that project's production environment. It was replaced by an explicit **preview** deployment because the application's Green production guards correctly refuse a synthetic origin. This did not deploy, alias or change anything in `bznsflow-main`.

## Candidate acceptance still required

The user authorized implementation and preparation; this record does **not** authorize production promotion, production database migration or real messages.

1. Retain or recreate the isolated candidate after its expiry. Its fixed HTTPS alias belongs only to the separate test project; it is not a Green promotion. Keep credentials outside Git and enable only the designated synthetic owner until production authorization.
2. Extend the real boundary evidence to simultaneous approval/execution, revocation during queued provider work and sustained rate/load tests. Local queued-message and eight-sector tests remain synthetic domain fixtures; they do not establish real provider delivery or every deployed sector workflow.
3. Complete **Claude remote**, **Claude Code** and **Codex** client acceptance: permitted discovery, allowed read, approved write, automatic refresh and disconnect in each actual client. Installed CLI login results are narrower evidence. No connected Claude browser was available to perform the remote connector flow in this session.
4. Run email-code and configured social sign-in returns against the candidate's real account endpoints, including account switching, expired transactions and reloads. Exercise live provider health checks using approved synthetic assets; external sends remain mocked.
5. Measure latency/capacity and errors under the configured rate/concurrency limits, provider slowdown and cleanup backlog. Verify no secrets/customer data enter telemetry. Record the configuration and rollout spending ceiling.
6. Verify deployment rewrites, OAuth redirect/issuer URLs, private page cache/referrer headers, no-index metadata, function size/cold starts and Dublin function placement. Verify normal website/authentication/API behavior with MCP disabled.
7. Obtain explicit Green release authorization only after the candidate evidence is complete. Use the committed source archive excluding secrets, caches and ignored artifacts. Re-inspect and record the then-current Green deployment for rollback; historical IDs are not an adequate release target.

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

Candidate secrets were independently generated, stored in mode-0600 files outside Git, and supplied only to the isolated services. Candidate email delivery points at a disabled endpoint and messaging gates remain off. The test account's browser session was seeded; this does **not** verify email-code or social sign-in.

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
