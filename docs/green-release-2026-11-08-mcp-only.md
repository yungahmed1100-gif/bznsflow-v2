# Green MCP-only correction — 8 November 2026

The owner corrected the release scope to **only MCP** after deployment of the previously confirmed MCP/onboarding candidate. This correction supersedes the active scope in `green-release-2026-11-08-mcp-onboarding.md`; that record remains historical evidence.

Branch: `release/mcp-only-2026-11-08`. Restore the website brief API, Convex brain/brief functions and schema, and onboarding regression files exactly from pre-release baseline `aecd3f2`. Retain MCP identity/icons, OAuth error branding, connection guide, stale-access-control fix, diagnostic and MCP tests. All hero, visual, messaging and onboarding work remains preserved in the owner's original working tree.

Sequence: verify and commit the correction, build an isolated archive, stage and promote the MCP-only website first, wait at least 60 seconds for previous API requests, recheck the added field's data compatibility, then restore baseline Convex. This order prevents the old API's `submittedOnly` argument from reaching a validator that no longer accepts it. Do not remove stored customer data to achieve a schema rollback. If any record contains `emailContext`, retain its optional schema validator while restoring runtime behavior.

Initial read-only production compatibility check: one website brief scanned, complete, zero records with `emailContext`; only counts were returned. No customer content was returned or changed.

Verification and production correction are in progress. Final source, deployment, schema compatibility and health evidence will be recorded here after execution. Signed-in ChatGPT acceptance remains the owner's follow-up.
