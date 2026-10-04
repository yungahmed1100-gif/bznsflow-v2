---
name: bznsflow-convex-engineering
description: Design and review BznsFlow Convex schemas, functions, indexes, tenant authorization and background jobs.
---

# Convex Engineering

Read `.codex/references/project-map.md`. Use convex-green MCP for schema/function inspection; its tools are intentionally metadata-only. For operational queries or deployment use the existing CLI within the task's authorization and verify the exact target first. A project path and deployment selector are routing controls, not a credential security boundary.

Derive tenant identity from verified server session, never a request's account ID. Check the actor's workspace membership and grant in the actual entry wrapper. Keep capability checks specific to operations: Catalyst retains chats/customers while imports, exports and broadcasts remain gated. Scope indexes and pagination to tenant ownership; reject foreign IDs on reads and writes.

Use bounded indexed reads, validate API and Convex arguments, keep externally initiated side effects outside mutations, and make jobs/idempotency/receipts durable. Preserve atomic grant plus audit writes. Trace cancellation, pause, takeover, ambiguous sends and replay behavior before changing schedulers.

Run affected Node tests and `npm run typecheck:convex`. Include expired/revoked sessions, foreign actor/record, and concurrency cases where applicable. Deploy additive schema first only when deployment is in scope; rollback must not reintroduce Supabase writes. Do not infer missing Vercel secrets from blank sensitive-env exports.
