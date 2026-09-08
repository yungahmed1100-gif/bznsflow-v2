# SEO baseline — bznsflowai.com
Captured: 2026-09-08 (GSC data window 2026-04-29 → 2026-09-06)
Property: **Domain property** (`sc-domain:bznsflowai.com`)

## Headline: the site has no topical footprint

| Metric (16-month window) | Value |
|---|---|
| Total clicks | 82 |
| Total impressions | **194** |
| Average CTR | 42.3% |
| Average position | 5.7 |

The CTR and position look excellent. They are meaningless. 194 impressions in ~4.5
months, and **every visible query is a brand or near-brand string**:

| Query | Clicks | Impressions |
|---|---|---|
| bznsbuilder | 0 | 5 |
| trymasar.co | 0 | 3 |
| (Arabic robotics boolean — unrelated noise) | 0 | 1 |
| buunyflow | 0 | 1 |
| bzns | 0 | 1 |

Only 5 queries surface at all. The 82 clicks come from queries Google anonymises below
its privacy threshold — i.e. brand searches by people who already know the name.

**Not one commercial query.** Not "ai receptionist", not "whatsapp automation", not any
service or vertical term. Position 5.7 means "we rank 5th for our own name."

## Indexing

| State | Count |
|---|---|
| Indexed | **2** |
| Not indexed | 6 |

Not-indexed reasons: "Alternative page with proper canonical tag" (3, validation
**Failed**) and "Page with redirect" (3, not started). Both are expected artefacts of
the `/` vs `/en` canonical pair, apex-vs-www, and the `/ar → /` redirects in
`vercel.json`. Benign. The problem is not the 6 excluded — it is that there are only 2.

## BUG: the sitemap has never been read

Submitted sitemap is `https://www.bznsflowai.com/` — **the homepage, not
`/sitemap.xml`**.

| Field | Value |
|---|---|
| Submitted | 11 Jul 2026 |
| Last read | 8 Sept 2026 |
| Type | Unknown |
| Status | **1 error** |
| Discovered pages | **0** |

Google has been fetching the homepage, trying to parse it as XML, and failing, every
day for two months. `/sitemap.xml` itself is valid and live. This is a one-line fix
and the single cheapest win available.

## Core Web Vitals

"Not enough usage data in the last 90 days" for both mobile and desktop — the site
lacks the traffic for field data. Lab measurement via the Playwright audit is the only
option for now.

## Competitive gap

| Site | Indexed URLs |
|---|---|
| aiprofitlab.io | **350** (162 EN blog + 188 AR) |
| aiinoman.com | **212** |
| **bznsflowai.com** | **2** |

These competitors rank for the category because they have pages that answer queries.
Their content patterns (geo-modifiers stripped, since we target worldwide English):
cost/pricing explainers, "X vs Y" comparisons, build-time/timeline posts, per-industry
guides, "do I need…" and "I'm not technical…" objection posts, ROI calculators.

## Conclusion

Nothing on this site is broken in a way that on-page tuning fixes. The site is
technically clean and commercially invisible, because it has two URLs. Fix the sitemap
submission, then build the page architecture.
