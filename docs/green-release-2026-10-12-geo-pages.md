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

## Production outcome

Published successfully to https://www.bznsflowai.com on 12 October 2026.

- Runtime source: `0d4e552bc1590f112c36ddc843075c64f8a2c208`.
- Deployment: `dpl_93p7B29YsceebnBVyFz2yj2U8YAN`.
- Deployment URL: https://bznsflow-main-lanqhjilz-yungahmed1100-7330s-projects.vercel.app .
- GitHub branch: `release/geo-business-pages-2026-10-12`, pushed to `origin`.
- Rollback: `dpl_Bj6JfPtLPp93k64NKt5rKdPfMXXJ`, preserving the same backend.
- Public domain inspection confirms the final deployment; deployment metadata confirms the complete runtime source hash. Production was still on the recorded baseline immediately before promotion.

The first candidate (`dpl_F8YtQLrcLCdKjkAb6mMNXbpPp7mU`, source `cc85150`) was **not promoted**. Its raw Arabic HTML contained NUL padding emitted during prerendering. Browser-based checks did not expose the raw JSON-LD parsing failure. The final source adds a narrowly scoped static-HTML normalization step and rejects invalid UTF-8 or malformed JSON-LD. Regression tests cover Arabic text, padding, valid content preservation and genuine malformed input. All 47 generated HTML files passed raw encoding/NUL checks and all 27 raw JSON-LD blocks parsed before the replacement deployment.

Final release evidence:

- Isolated archive production build passed; four SEO/static-HTML regression tests passed.
- Final archive browser checks: 46 discovery/no-JavaScript/keyboard checks, 38 existing homepage checks, 145 business-page checks, 120 footer checks — **349 total**.
- Candidate checks: 64 direct assertions covering Arabic/English homepages, all six new business-page URLs, both terms pages, raw JSON-LD, valid UTF-8, metadata, policy links and exact social-image bytes.
- Live business-page checks: **145 passed**, including 320/390/768/1440, bilingual keyboard navigation, no-JavaScript content, metadata and accessibility.
- Live footer checks: **120 passed**, all three legal links at 320/390/768/1024/1440 in both languages with chat invitation visible.
- Live HTTP checks: all 18 public sitemap pages return 200 with correct canonicals/languages, valid raw schema and no NUL bytes. The 1200×630 social image returns 200 image/jpeg with the expected asset hash. Sitemap, robots and llms.txt pass. Five private entry routes retain noindex.
- The anonymous session GET returns the existing contract, **200 with account=null and needsProfile=false**. The initial probe incorrectly expected 401; the existing handler was inspected and the probe corrected. No authentication code was changed, and this check is not evidence of authenticated owner/customer workflows.

The pre-normalization release audit completed with zero errors and 51 non-blocking warnings (title/description lengths, image sizing and one local CLS warning). The final artifact and live checks above additionally cover the raw HTML defect the browser audit missed. No claim of improved rankings, indexing or measured AI citations is made. Google Search Console credentials remain pending; GSC installation is local tooling only. Outstanding legal identity and standard commercial details are not invented on the published pages; terms refer to the actual written agreement.

Evidence lives in ignored `work/geo-research/`: `final-archive-build.log`, `final-geo-browser.log`, `final-home-browser.log`, `final-business-pages.log`, `final-footer.log`, `final-candidate-*`, `promote.log`, `live-deployment.json`, `live-deployment-api.json`, `live-public-check.json`, `live-business-pages.log`, and `live-footer.log`.

No Convex deployment, operational migration, outbound message or Google property/sitemap mutation occurred. Production API/backend source remains the baseline. The additional Ascend operational work in the primary checkout is preserved outside this release.
