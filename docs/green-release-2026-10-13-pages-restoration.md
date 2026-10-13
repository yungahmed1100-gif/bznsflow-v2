# Green public pages restoration — 13 October 2026

Owner authorization: “push changes to production”.

The current production domain pointed to `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta`, created after the previous GEO release. Its `/en/contact` returned 404. It contained newer operational source but omitted the business pages and GEO changes from `0d4e552`.

Recovered and SHA-1 verified all 641 deployed runtime/source files against the deployment's file manifest. Commit `4741e14` preserves that source on `release/restore-business-pages-2026-10-13`. Restore the previously approved public page/SEO files on that baseline, preserving its API, Convex, dashboard and configuration source. No Convex deployment, credential changes, scheduler changes, outbound messages or Google mutations are included.

The Google Search Console connection is verified with read-only scope. Its credential and token files remain outside the repository and deployment. Local connection documentation is updated.

Build from an isolated committed archive. Verify bilingual pages, homepage, footer, raw HTML, schema and social image before and after promotion. Retain `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta` for rollback. Evidence is stored in ignored `work/geo-research/restore-*` files.

## Production outcome

Published to https://www.bznsflowai.com on 13 October 2026 (Asia/Muscat).

- Runtime source: `a692f76e7f98e1414156770c52275702766a847c`, pushed to `origin/release/restore-business-pages-2026-10-13`.
- Deployment: `dpl_FaKxRMzrzxDp3ZBdHvHqFwbp5JBa` (READY).
- Deployment URL: https://bznsflow-main-8pzn75ta9-yungahmed1100-7330s-projects.vercel.app .
- Vercel metadata confirms `sourceCommit`; inherited parent-directory Git metadata is not the archived release source.
- The production alias still matched the recorded baseline before promotion and now resolves to the new deployment.
- Rollback: `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta`; this preserves the operational baseline but would remove the restored business pages.

Verification observed:

- Isolated archive build and four SEO/static-HTML regression tests pass.
- All 374 checked operational API, Convex, config, dashboard and dependency/configuration files match the current deployed baseline byte-for-byte. No operational source was reverted to the earlier GEO release.
- All 47 generated HTML files contain valid UTF-8 and no NUL padding; all 27 raw JSON-LD blocks parse.
- Local browser checks: 46 discovery + 38 homepage + 145 business pages + 120 footer = 349 passing assertions.
- Local 18-page SEO audit: zero errors, 52 warnings (existing metadata lengths/image sizing and local timing/layout measurements). No ranking or field-performance improvement is claimed.
- Protected candidate verified through authenticated Vercel CLI: 12 bilingual homepage/business/terms/refund URLs and exact social-image bytes. The unauthenticated candidate probe hit Vercel's login page and was not counted as a successful content check.
- After promotion: all 18 public pages return 200 with correct language/canonical metadata and valid raw schema; sitemap, robots, llms.txt and social image pass. Five private entry routes retain noindex; anonymous session retains 200 with account=null and needsProfile=false.
- Live browser checks: 145 business-page checks and 120 footer checks pass, covering both languages, mobile/desktop, keyboard navigation, accessibility, no-JavaScript content and legal-link clickability with the chat invitation visible.

Google access remains local and read-only. No Google sitemap entries were changed. No authenticated customer/owner workflow, Meta delivery or payment integration was retested by this website release.
