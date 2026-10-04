---
name: bznsflow-release-verification
description: Verify and release BznsFlow Green changes with committed source, real authorization checks and honest integration evidence.
---

# Release Verification

Read `docs/green-release-2026-10-05.md` and inspect current deployment state; historical IDs are evidence, not permanent targets. Green is Vercel bznsflow-main with Convex rare-fish-465. Blue is a separate source environment. Preserve unrelated local work.

Select checks proportional to the change. `npm run test:release` is the full release command; it covers the unit inventory, Convex typecheck, build, dependency audit and browser suites. For narrower changes run relevant tests/build/browser cases. Check actual authenticated APIs and deployed wrappers for access changes, not only synthetic previews.

Follow authorization already present in the task; do not infer permission for a new release or outbound message from this skill. When deploying, commit the reviewed runtime files, build from an isolated archive, exclude env files, cookies, work/ and test artifacts, deploy additive Convex changes before the Vercel candidate, then promote and inspect the public domain.

Record observed tests separately from user-attested prior evidence. A enabled readiness flag is not an integration test. A transport timeout is not a passing probe and is not automatically a server outage: inspect the corresponding status/logs and record limitations. Preserve a Convex-compatible rollback and never restore Supabase writes. Final evidence states source commit, deployment, tested roles/routes, unresolved issues, and monitoring result.
