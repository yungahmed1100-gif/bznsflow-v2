---
name: bznsflow-rag-engineering
description: Build or improve Layla tenant-scoped retrieval, ingestion, indexing, grounded answers and RAG evaluations.
---

# Rag Engineering

Read `.codex/references/project-map.md` and `.codex/references/ai-evaluation.md`. Choose the canonical SME or large-corpus retrieval procedure by actual corpus size and intent count; do not merge their overhead. Existing SME guidance is at `/Users/ramsis21/Desktop/obsidian/business/Operations/Procedures/SME-Retrieval-Build.md`; large-corpus guidance at the adjacent `Retrieval-System-Build.md`.

Audit the existing retrieval engine before adding a vector database or agent framework. Establish a lexical baseline, then evaluate dense/hybrid retrieval and reranking only against demonstrated misses. Consider reciprocal-rank fusion when combining differently scaled retriever scores; tune chunking/top-k/reranking on development data, then check a held-out set.

Ingestion must carry tenant, source, version, section/page, document hash and deletion state. Bound file size/parser work, normalize Arabic without destroying the original text, quarantine untrusted instructions, and make re-ingestion/deletion idempotent. Enforce tenant and document authorization during candidate retrieval and again before returning citations. A global top-k followed only by post-filtering can lose recall and expose data.

Keep caches keyed by tenant, authorization scope, corpus version and model/embedding version. Invalidate on document updates/deletion. Separate evidence from instructions, cite actual chunks, and abstain or ask a precise clarification when evidence is absent or contradictory.

Convex vector search runs in actions; consult current official docs for index filters and query limits. Do not migrate storage or introduce GraphRAG, contextual chunking or a cross-encoder solely because it is newer. Benchmark quality, freshness, latency and cost. Report measurable gains and tradeoffs rather than declaring a universally best architecture.
