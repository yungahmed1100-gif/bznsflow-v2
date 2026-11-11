# Green MCP control release — 10 November 2026

Ahmed asked to improve the MCP connection, functions and flow, fix UI and backend bugs, test end to end, deploy to production and add functions so BznsFlow can be fully controlled via MCP. Scope confirmed: **MCP only**; live testing on his workspace limited to reads and writes that leave data as it was.

Branch `release/mcp-control-2026-11-10`, built on the live MCP-only line (`2f96092`, runtime `63fb0da`). Other uncommitted work in the main checkout (hero, onboarding, legal, messaging) is not included.

## What changed

- **Discovery.** Real descriptions and titles for every tool; per-tool schemas with required fields; sector tools advertise their key fields and `bznsflow_tools_describe` returns the full schema. Real estate discovery fell from 384 KB to ~123 KB; every sector is budget-tested (≤140 KB, Catalyst ≤65 KB).
- **Errors.** `{ code, message, hint, field }`, e.g. `conversationId is required.` Upper-case request ids accepted.
- **Approvals.** Rejected, cancelled and expired requests explain the next step; `/mcp?approval=<id>` opens and highlights the request; approval cards show the action, records and values with the raw request folded away.
- **New tools.** `workspace_summary`, `tools_describe`, `requests_list`, `requests_cancel`, `onboarding_get/save`, `website_state/save_draft/domain_check`, 12 Rasil email tools (Rasil allow-list unchanged), `billing_state`. Inventory: [capabilities-2026-11-10](mcp/capabilities-2026-11-10.md).
- **Email effects.** MCP-created email campaigns are tagged; `requests_status` reports delivery from receipts; the Rasil worker blocks a campaign after revocation (optional schema fields `mcpConnectionId`, `mcpRunId` on `emailCampaigns`).
- **Carried fixes.** Pending consent survives fresh sign-in; campaign "completed" is no longer reported as delivered.

## Problems found in production and fixed structurally

| Problem | Fix | Guard |
| --- | --- | --- |
| Continue on the consent card looked dead: the fresh-sign-in refusal showed only at the top of the page | Errors render beside the action and scroll into view | `tests/mcp-browser.mjs` refused-consent step |
| A signed-in owner was told to verify again and sent away to sign in | Code emailed and confirmed inside the card, then the same consent or permission change continues; 5-minute rule kept | browser test: wrong code, right code, auto-continue |
| `GET /api/mcp` held open until Vercel's 60 s kill, keeping a concurrency lease | GET/DELETE answer 405 before any token check or lease | `tests/mcp-transport.test.mjs`; health `method:GET/DELETE` |
| A request could run into the platform limit | 45 s budget from arrival; `request_timeout` with "do not repeat"; lease released | transport test |
| Convex deployed before the website: the old website failed every call on unknown tool names (the few minutes between the Convex and website deploys) | Unknown names are skipped, so either deploy order works | transport test |

The transport tests fail against the previous handler (GET hangs) and pass on the new one.

## Deployments

| Order | Target | Source |
| --- | --- | --- |
| 1 | Convex `prod:rare-fish-465` (additive optional fields; no index deleted) | `e533415` |
| 2 | Vercel `dpl_HtTadLCz2NYHdmDRmUwkXi9PLT3F` | `e533415` |
| 3 | Vercel `dpl_CmcWhhxDn18fNsNHtmri9ZGevKyJ` | `9129fa3` |
| 4 | Vercel `dpl_AEpa5yhu9DFNXnUPJ39vvGcmbTJz` | `2a13e88` |
| 5 | Vercel `dpl_MMgBFkNJ6CwdPeyat6fpWiHTXfjd` | `afb3604` |
| 6 | Convex `prod:rare-fish-465` (module layout only) and Vercel `dpl_8nDdNzkBMf9noVhoUoAUGQzwtv1y` (current) | `04c934d` |

Each website deploy was built from a clean `git archive`, staged with `--skip-domain`, checked (pages 200, private headers, temporary-host refusal) and promoted. Rollback: promote `dpl_MMgBFkNJ6CwdPeyat6fpWiHTXfjd` (pre-refactor, same behaviour) or `dpl_HENxf5PXasHe8Eudb2AVDoMpEUm6` (before this release); keep the additive Convex fields; `MCP_ENABLED=false` in both runtimes stops MCP.

## Evidence

- Before release: `npm run test:release` passed — 1,237 unit tests, Convex typecheck, build, 0 vulnerabilities, all 15 shared browser suites and every sector suite.
- MCP suites at the final commit: 50 unit/integration tests; MCP browser 272 checks (Arabic/English, 320/768/1440, axe).
- Production health: 15/15 (adds GET/DELETE refusal; admission probed with POST).
- **Live journey on Ahmed's Ascend retail workspace, 40/40 checks:** OAuth PKCE, version 1.1.0, discovery 156 tools / 112 KB / 3 pages; reads in every group (workspace, business, conversations, customers, broadcasts, messaging, catalog, knowledge, BznsBrain, setup, billing, requests, Hasib, website, email preview); readable argument error; timezone written with its current value; setup progress re-saved at its current step (step 0); one approval cancelled by the assistant; one rejected by Ahmed on the deep-linked page and refused on retry with guidance; refresh rotation; after disconnect the access token got 401 and the refresh token was refused.
- Nothing was sent, published or paid. The first live run stopped on an over-broad test assertion (the response's own dashboard link) and was repeated with a second temporary connection, which Ahmed disconnected along with the first.

## Not verified

- The in-place code confirmation was tested with synthetic sign-in responses; Ahmed's next real connection is its first live use.
- Writes beyond the reversible ones above, email sends, website submission and real ChatGPT/Claude client runs with the new tools.
- Setup tools that need the browser (`setup_*` provider steps, file pickers, website submit/upload, Paymob payment) remain handoffs.

## Refactor and push (10 November 2026, afternoon)

Ahmed asked to refactor the release and push it. Behaviour is unchanged: the tool registry and every advertised schema are byte-identical to the pre-refactor commit (snapshot of all 433 tools).

- Connection page: 1,001 → 441 lines; `copy.js`, `pending-policy.js`, `ConnectionCard`, `ConsentCard`, `ActivityList`/`PastConnections`.
- Convex: `executeApplication` dispatches through `domains/core.js` and `domains/product.js` (longest handler 32 lines); request lifecycle in `requests.js`; activity helper in `audit.js`; `state.js` 866 → 690 lines.
- Registry: product tools in `config/mcp/product-tools.js`, one function per area; `contracts.js` 820 → 695 lines.
- Handler: `discovery.js` (tool list) and `calls.js` (tools/call, no mutation of store results); `handler.js` 538 → 369 lines.
- Fixed while refactoring: `bznsflow_email_domain_connect` was routed to Rasil instead of returning its website link; handoffs are now answered before their domain (regression test added).

Evidence: 1,241 unit tests, Convex typecheck, build, 0 vulnerabilities, MCP browser 272, and every shared and sector browser suite passed in the full release check except `tests/home-browser.mjs`, which timed out once waiting 6 s for the home pipeline animation (2.6 s step) and then passed twice on rerun. That suite is a known timing flake to replace with a controlled clock; the home page is not part of this release. MCP tests at the final commit: 43 across the touched suites. Production after promotion: health 15/15, pages 200, unauthenticated POST 401, GET 405, no errors or timeouts in the deployment's logs.

`origin/master` fast-forwarded from `e2fd10c` to `04c934d` (45 commits, no force push); branch `release/mcp-control-2026-11-10` pushed. The main checkout's local `master` still points at `aecd3f2` with uncommitted work; update it with `git pull --ff-only` after committing or setting that work aside.

## Production-readiness verification (11 November 2026)

Ahmed asked to verify all changes. Independent re-check of `58c06a3` (HEAD = `origin/master` = release branch, clean tree):

- **Source gates:** clean `git archive` + `npm ci` + `npm run test:release` passed with exit 0 and no reruns: 1,241/1,241 unit tests, Convex typecheck, build, contracts/KB/sitemap checks, 0 vulnerabilities, all 15 shared browser suites (MCP 272, dashboard 679, home 364), every sector suite and Ascend end-to-end 107. `npm audit --omit=dev`: 0.
- **Refactor parity:** canonical snapshot of all 433 tools plus advertised schemas at `b8c6912` and `58c06a3`: byte-identical (1,537,120 bytes, same SHA-256).
- **Production equals source:** www serves `dpl_8nDdNzkBMf9noVhoUoAUGQzwtv1y`; all 17 content-hashed assets on `/mcp` exist in a local build of `58c06a3`. Convex `rare-fish-465` dry run: no function, index or schema changes.
- **Live health:** 15/15; 38 public pages 200 (`owner/ascend-draft` is development-only by design); `.well-known` OAuth documents 200; POST without token 401; GET 405 with `Allow: POST, OPTIONS`; DELETE 405; HSTS, `nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies present.
- **Logs:** no MCP errors or timeouts since the deploy; the only error-level lines are the known DEP0169 `url.parse` deprecation warning.
- **Security review of the release diff (`aecd3f2..58c06a3`):** the five-minute fresh sign-in is enforced in Convex (`convex/mcp/access.js`), so the in-place code step cannot bypass it; the resume cookie is cleared only after a decision (`Path=/`, `Secure`, `HttpOnly`); billing checkout, website submit/upload and email domain connect are link-only handoffs; email campaign create/cancel need owner approval unless the owner allowed messages directly; website and email tools are Ascend/Apex only; no secrets or `console.log` added.

Open items, none blocking: `src/styles/mcp.css` is 804 lines (split it the next time it changes); `/api/layla-meta` logged 9 platform 60 s timeouts between 8 and 10 November on an earlier deployment (Layla webhook, outside this release; worth its own investigation); the in-place code confirmation still awaits its first real use; Rasil sending stays gated.
