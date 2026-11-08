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

## Evidence status

Release verification and deployment are in progress. Final source SHA, deployment identifiers, checks and monitoring results will be recorded after execution. Earlier broad working-tree evidence in `mcp/verification-2026-11-08.md` is historical and does not substitute for this narrower candidate's checks.

Actual signed-in ChatGPT acceptance remains the owner's post-deployment check; public health and synthetic SDK/browser tests cannot establish it.
