# Green public pages restoration — 13 October 2026

Owner authorization: “push changes to production”.

The current production domain pointed to `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta`, created after the previous GEO release. Its `/en/contact` returned 404. It contained newer operational source but omitted the business pages and GEO changes from `0d4e552`.

Recovered and SHA-1 verified all 641 deployed runtime/source files against the deployment's file manifest. Commit `4741e14` preserves that source on `release/restore-business-pages-2026-10-13`. Restore the previously approved public page/SEO files on that baseline, preserving its API, Convex, dashboard and configuration source. No Convex deployment, credential changes, scheduler changes, outbound messages or Google mutations are included.

The Google Search Console connection is verified with read-only scope. Its credential and token files remain outside the repository and deployment. Local connection documentation is updated.

Build from an isolated committed archive. Verify bilingual pages, homepage, footer, raw HTML, schema and social image before and after promotion. Retain `dpl_Fnc2SkjGZZg6o2uLkkX7boVWy3Ta` for rollback. Evidence is stored in ignored `work/geo-research/restore-*` files.

Release outcome will be recorded after verification.
