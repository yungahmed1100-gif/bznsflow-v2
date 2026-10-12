# Green release — GEO and business pages, 12 October 2026

## Authorization and scope

Owner explicitly requested: “push live to production live along with the pages u made”. Release Company & Contact, Service Scope, Help & Support and updated public terms in Arabic and English, together with GEO/SEO improvements. Publish only existing confirmed contact details and written-agreement commercial terms. No registration identity or support SLA is invented. The internal DPA template is not a public page.

Baseline: deployment `dpl_Bj6JfPtLPp93k64NKt5rKdPfMXXJ`, source `cdba8c4576e8ba867d5241318ba8818fd5761f4f`. Roll back to that deployment if release-specific failures appear. Its metadata also has an inherited `gitCommitSha=b97e138`; the explicit archived `sourceCommit` is the authoritative source identifier for that release.

Build on the baseline in branch `release/geo-business-pages-2026-10-12`. Include the four public Ascend plan-copy files from the owner-approved 12 October availability decision so the visible offer matches the new pages and structured data. Do not include b97e138 operational backend, scheduler, dashboard or schema changes. Preserve the deployed refund policy and footer clearance.

GSC is a local read-only Codex tool and still lacks Google credentials. `.codex` and `.agents` remain excluded by `.vercelignore`. No Google sitemap submission, outbound message, credential change, webhook change or Convex deployment is authorised or required by this static-content release.

## Acceptance

Build the committed source from an isolated git archive. Verify all new pages, semantic navigation, language switching, no-JavaScript rendering, schema, policy links and social image. Check production remains on the baseline before promotion; if it changed, inspect the new release and reconcile before continuing. Candidate must be READY before promotion.

Original workspace verification: build passed; 84 browser checks plus two audit unit tests passed; 18-page SEO audit had zero errors and 51 warnings. GSC startup and read-only behavior passed offline; Google authentication and search data are not verified. A stale RAG-file reference in a pre-existing project skill remains unrelated to this release.

Deployment outcome and live evidence will be appended after verification. Customer terms changes do not amend existing agreements or constitute customer notices; no notices were sent.
