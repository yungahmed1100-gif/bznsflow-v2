---
name: geo-optimizer
description: Audit and improve BznsFlow's search and AI discoverability using the pinned Auriti Labs GEO Optimizer, grounded in actual public content and official crawler guidance.
---

# BznsFlow GEO workflow

Read `upstream.md` for the requested upstream workflow. Source: Auriti-Labs/geo-optimizer-skill, commit `a630a954578a8a4af445a7a28e326b065ff172d0` (4.19.0); original MIT license retained alongside it.

Apply the project's AGENTS.md and canonical business sources first. Preserve the existing design and unrelated edits. Follow `docs/geo-search-console-setup.md` for the pinned local tools and GSC authentication.

1. Run `.codex/tools/seo/.venv/bin/geo audit --url https://www.bznsflowai.com --no-plugins --format json --output work/geo-audit.json` before changes.
2. Review the recommendations against actual content and official provider docs. The numerical score is a heuristic, not evidence of indexing, citations, traffic or ranking. The CLI blocks localhost; use the repository SEO audit for local acceptance rather than weakening its URL protections.
3. Correct crawlability, broken preview images, semantic links, truthful schema and stale public summaries. Keep Arabic and English consistent. Schema must describe visible content. Never invent statistics, testimonials, commercial terms, author biographies, third-party profiles or service capabilities to earn points.
4. Do not run `geo fix --apply` blindly. Do not add fictional site search, fabricated publication dates, RSS for a site without a feed, or blanket deployment jobs. Decorative images may correctly have empty alt text.
5. Official guidance takes precedence where upstream advice is inaccurate: OAI-SearchBot handles ChatGPT search; Claude-SearchBot handles Claude search, while ClaudeBot serves model development; Googlebot governs Google Search AI features, not Google-Extended. Preserve existing training preferences unless the owner changes them.
6. `llms.txt` is a supplementary curated overview, not a Google ranking requirement. Do not add extra AI endpoints solely for a score. Do not infer AI citation counts from GSC Web traffic.
7. Build and run `npm run seo:audit -- --base http://127.0.0.1:5207 --json work/seo-audit.json` against the built preview. Use GSC read-only tools only after authenticating; discover the exact property before querying. Report unavailable data honestly. Never deploy or submit sitemaps without task authorization.

References: https://developers.google.com/search/docs/appearance/ai-features and https://developers.openai.com/api/docs/bots and https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
