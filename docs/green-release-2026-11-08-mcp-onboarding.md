# Green MCP and onboarding release — 8 November 2026

## Authorization and source

The owner explicitly requested verification followed by production deployment and confirmed:

- Only MCP connection, health, logo, and onboarding fixes.
- Green: Vercel `bznsflow-main` / `www.bznsflowai.com`, including required Convex updates to `rare-fish-465`.
- The owner will connect or refresh BznsFlow in ChatGPT and report real-client acceptance after deployment.

Candidate branch: `release/mcp-onboarding-2026-11-08`, isolated from baseline `aecd3f2`. The original working tree remains intact. Earlier hero/Motion, visual polish, media processing and campaign fixes are excluded. Package dependencies and lockfile are unchanged; the package adds only the public `mcp:health` diagnostic command.

## Scope and expected behavior

MCP advertises shared BznsFlow server/tool icons, description and fixed usage instructions; OAuth errors provide recognizable branding and connection help. The bilingual connection guide describes the current ChatGPT flow. A quiet 401/403 clears stale controls immediately. Permissions and available tool operations do not expand.

Onboarding retries use the submitted brief and its captured name/email/deadline. Domain prices reject malformed values. Brain cleanup retains accepted answers until their matching draft is published. Convex adds only optional `websiteBriefs.emailContext` and optional internal `submittedOnly`; existing records remain valid. Historical briefs without snapshots cannot recover their original display metadata.

## Deployment sequence and rollback

Observed before release: `www.bznsflowai.com` serves READY production deployment `dpl_AfmqdGYNwUGTfMheVMCDCkqvxSfr`, URL `bznsflow-main-26lstsq9z-yungahmed1100-7330s-projects.vercel.app`. Recheck immediately before promotion.

Verify the isolated candidate, commit its reviewed files, and build an archive of that commit without local secrets/artifacts. Deploy additive Convex changes first. Stage the Vercel production candidate with `--prod --skip-domain`, verify its routes, then promote and probe the public domain.

Website rollback may restore the recorded previous Vercel deployment, which already uses Convex. Retain optional `emailContext` in the backend schema after any new rows use it; do not blindly redeploy the old schema. Leave existing MCP worker guards, receipts, permissions and audit history intact. No outbound test messages, emails, payments, provider reconnection or new OAuth grants are authorized by this deployment.

## Verification

Runtime source: `05f9c65701e5aa905154372b35b996ea5c02f471`. The archive SHA-256 is `31788a4022881599ed08370a03116383cd642958d1916068009ba68990bc0fd7`. Every archived tracked file matched the committed source after local build/code generation. Vercel's dry-run inventory contained no private environment files, cookies, test artifacts or local agent configuration contents. A clean `npm ci` used the unchanged lockfile.

- 1,234 unit tests passed; Convex typecheck, production build and dependency audit passed (zero vulnerabilities).
- All 15 shared browser suites passed, including 248 bilingual MCP checks, authentication, onboarding, brain publication, setup and Paymob synthetic end-to-end checks.
- Catalyst 297; retail 582; retail-tech 603; real estate 328; media 319; fitness 312; dental 315; HVAC 340; construction/automotive 12 scenarios; final Ascend cross-feature journey 107 checks passed.
- The initial full-release command stopped at a retail employee-navigation timeout near an interrupted session. An unchanged full retail rerun passed all 582 assertions. The remaining release suites then passed in sequence. This is a resumed gate completion, not a claim that the original command exited successfully.
- Independent code and JavaScript reviews found no runtime blockers. Corrected a copied historical runbook instruction that would have included the excluded media/messaging patches. `git diff --check` passed.

Earlier broad working-tree evidence in `mcp/verification-2026-11-08.md` remains historical and does not substitute for this narrower candidate's checks.

## Deployment and public checks

- Convex Green `prod:rare-fish-465` deployed first. Dry run and actual push reported no index deletions and successful schema validation. Deployed function metadata now includes optional boolean `submittedOnly`, absent before release. A read-only `get` using an intentionally nonexistent session hash and that argument returned `sign_in_required`, exercising the real deployed validator and session lookup without writing customer data.
- Vercel production deployment: `dpl_BW2tkHS94bmny6SpPYXnsJoUfpDV`, `https://bznsflow-main-fn3cnojbu-yungahmed1100-7330s-projects.vercel.app`, built from the committed archive with `releaseSource` metadata. The first CLI attempt stalled before creating a deployment; it was stopped after checking the deployment list. The explicit-project retry uploaded and built successfully.
- Staged with `--prod --skip-domain`. Home, English home, bilingual connection pages, icon and anonymous session returned 200. Private page headers remained `no-store`/`noindex`. Six API checks correctly refused the temporary deployment hostname with `invalid_host`/`origin`; the production-only hostname checks were preserved. Discovery and OAuth therefore required verification after public promotion.
- Promoted successfully on 8 November 2026. `www.bznsflowai.com` was re-inspected and resolves to the new READY deployment. Immediately before promotion it still pointed to the recorded rollback deployment.
- Public health: **13/13 passed** after promotion — DNS, four issuer aliases, protected resource, public signing keys, PNG logo, unauthenticated challenge and trusted/untrusted CORS.
- Additional public probes passed: `/`, `/en`, `/mcp`, `/en/mcp`, anonymous session (200); MCP management and onboarding without authentication (401); deliberately invalid OAuth authorization (400 with the new BznsFlow logo and restart guidance). Connection pages retain private/no-store and noindex headers.
- Initial deployment monitoring returned no HTTP 5xx records. Ten runtime entries classified by Vercel as errors were identical Node `DEP0169` `url.parse()` deprecation warnings, not application exceptions; the sampled requests returned their expected statuses. These warnings are recorded, not silently reported as an empty error log.
- Final health recheck at 17:06 GST (13:06 UTC) passed 13/13 again. The deployment's 13:01–13:06 UTC request-log window returned zero HTTP 5xx records, no excluded intervals and no remaining pages. This is a short observation window, not an uptime guarantee.

Ignored evidence: `work/mcp-release-2026-11-08/` contains verification/install logs, archive, deployment records, staging/public probes, Convex target and denial probe, and monitoring output. Private operational artifacts are not committed or uploaded.

## Remaining acceptance

Actual signed-in ChatGPT acceptance remains the owner's post-deployment check. Connect or refresh `https://www.bznsflowai.com/api/mcp` with OAuth, open a fresh chat with BznsFlow enabled, and request a read-only business-state result. Client rendering of the advertised icon is controlled by ChatGPT. Public health and synthetic SDK/browser tests cannot establish that real-client result.

Existing local production cookies were expired and were not reused; no authenticated customer read, new OAuth grant, outbound message, email, payment or provider reconnection was performed. Positive authenticated onboarding and provider delivery remain separate acceptance evidence. Historical brief email snapshots cannot be reconstructed. Firefox/WebKit execution is not claimed.
