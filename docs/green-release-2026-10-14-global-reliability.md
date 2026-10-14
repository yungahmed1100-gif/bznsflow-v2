# Green release — global reliability — 2026-10-14

Owner: Ahmed. Authorization: implement the approved global reliability plan, create and verify an unaliased production candidate, then promote it if checks pass. This authorization does not include submitting the Vercel support report, changing DNS providers, changing Convex/data interfaces, or sending customer messages.

## Scope and invariants

- Run all Vercel Functions in Dublin (`dub1`) beside Green Convex `rare-fish-465` in `eu-west-1`.
- Preserve routes, payloads, cookies, authentication, webhook behavior, schemas and customer data.
- Keep static HTML and assets on Vercel’s global CDN.
- Replace runtime Google Fonts with self-hosted WOFF2 subsets using `font-display: swap`.
- Deliver the full uncropped team scene as responsive WebP/AVIF; largest WebP must remain below 250 KB.
- Keep Meta Pixel asynchronous, defer it until browser idle time and contain blocked-domain failures.
- Add read-only per-edge SNI/TLS/HTTP diagnostics and Checkly monitoring as code.

## Baseline evidence

- Baseline source: `d3dbae2e384acefd50564b034420d41092c35f2f`; website runtime source before this release: `8386b3cc816277226ba2f1ee80d215f72c81956f`.
- Production deployment before this release: `dpl_5Fxg7TV41m9vaVSemypenn5kGJMW`.
- Baseline production build passed. The team image was 1,079.88 KB and functions were deployed to `sin1`.
- 30/30 worldwide homepage probes and 30/30 anonymous API probes returned HTTP 200.
- Direct SNI-correct tests reproduced intermittent TLS-stage timeouts on `76.76.21.164` and `76.76.21.241` while comparison addresses succeeded.

## Implementation evidence

- Team image output: 480/960/1536 WebP and AVIF variants preserve the 3:2 scene. The largest WebP is 217.85 KB (build output, decimal), down from 1,079.88 KB.
- Poppins 400–800 Latin/Latin Extended and IBM Plex Sans Arabic 400–700 Arabic/Latin WOFF2 subsets are local, OFL licenses included, all faces use `font-display: swap`, and Google Fonts is absent from HTML and CSP.
- The public home browser suite passed 42 EN/AR checks at 320–1440 px with every non-local request blocked, proving local fonts, critical artwork, hydration, accessibility and layout without Google or Facebook.
- Meta Pixel remains asynchronous. Its loader runs three seconds after hydration and then waits for browser idle; loader, storage and network failures are contained.
- The first release run exposed missing static routes for the live Media owner preview. Arabic and English Media routes were added; the owner suite then passed all 59 authorization and viewport cases.
- Checkly configuration typechecks with v9.5.0 and credentials remain outside Git. `CHECKLY_API_KEY` and `CHECKLY_ACCOUNT_ID` are unavailable in this operator environment, so remote activation and monitor IDs remain pending.
- Support draft: `docs/vercel-global-reachability-support-draft-2026-10-14.md`; it remains unsubmitted.

## Verification and production outcome

- 974 Node tests pass; Convex typecheck, production build and dependency audit pass with zero vulnerabilities.
- Shared browser evidence: auth 36, owner 59, onboarding review 22, WhatsApp setup 62, Instagram 40, Layla switch 152, dashboard 347, product setup 10, BznsBrain 1,433 and homepage 42 checks. These use synthetic APIs or blocked external traffic as documented by each suite.
- Sector browser evidence: Catalyst 297, retail 441, electronics/phones 490, real estate 328, Media 319, Fitness 312 and Dental 315 checks; construction/automotive passed all 12 EN/AR × 320/768/1440 scenarios.
- The long sequential runner produced intermittent Playwright element-wait timeouts under local process contention. Each affected suite passed unchanged or after test stabilization in isolation; the failures were retained in the operator logs and are not represented as product failures.
- Live pre-release diagnostic on 2026-10-14 UTC passed `/`, `/en`, `/api/auth-session` and a hashed CSS asset on both returned `www` addresses (`76.76.21.164`, `66.33.60.34`). The apex address `76.76.21.21` returned the expected 308 for all three paths.
- Candidate deployment, `dub1` inspection, promotion and public post-promotion checks: pending.

## Rollback and remaining limits

Retain deployment `dpl_5Fxg7TV41m9vaVSemypenn5kGJMW` as the immediate content rollback unless candidate inspection identifies a different current production deployment. Rollback must remain compatible with Green Convex and must not change data or messaging controls.

The owner elected to retain Vercel Hobby. Its personal/non-commercial restriction remains an operational and contractual risk. Vercel custom domains have no native IPv6; IPv6-only access depends on the client network’s translation. No single CDN can guarantee every ISP or national network path.
