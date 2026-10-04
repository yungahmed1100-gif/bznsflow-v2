---
name: bznsflow-performance
description: Profile and optimize BznsFlow browser, API, Convex or retrieval performance with before-and-after evidence.
---

# Performance

Identify one slow user journey and its boundary: navigation, render, network waterfall, database scan, ingestion, retrieval, or model request. Reproduce under the same dataset, viewport, cache state and concurrency before and after.

For the browser, use built production assets and Playwright traces/network timing; check route bundle size, startup work, layout shift, unnecessary polling and serial requests. Apply independent-request concurrency, narrower subscriptions and pagination before indiscriminate memoization. Keep initial server/client markup deterministic. JSON-LD must be valid raw JSON with `<` escaped; scripts that insert DOM nodes must wait until hydration.

For Convex/API work, inspect index selectivity, bounded reads, repeated tenant lookups, payload size and action/query boundaries. For RAG/model work, time parsing, embedding, retrieval, reranking and generation separately, then evaluate batching or versioned caches. Preserve tenant isolation and cancellation semantics.

Read current React/Convex/provider docs for the changed API; Vercel React guidance is a reference, but Next.js server-component rules do not apply to this static React Router project. Record baseline and candidate p50/p95 only with sufficient samples; label single-run results as samples. Do not claim performance gains from a build passing.
