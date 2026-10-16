# Ascend acquisition and sector automation — project engineering pack

Prepared 2026-10-10; status **planned**. Project: BznsFlow Ascend extension inside existing Green repository. Profile: business application / Layla integration. Scope owner and release authority: Ahmed, subject to current task authorization. Engineering implementer: assigned build agent; operational/security responder and customer-side source/price policy owner must be named before live activation. This pack follows the canonical Project-Engineering-Pack template; it does not certify production readiness.

## G0: outcome, baseline, constraints

Outcome: sector-specific lead capture → deterministic business fit → real operational conversion → permitted automatic follow-up → measured paid/repeat outcome, through the requested six-tab Ascend UI. Preserve existing Catalyst entry, contacts, communications, plan behavior and unrelated changes.

Baseline:25 configured industries; six enabled, nine preview, ten pending. Intake qualification, multiple Hasib domain adapters and campaign delivery exist. Sector source attribution, generalized durable follow-up automation, many pending-domain operations and the production six-tab migration are not established by the local draft. The [foundation](shared-foundation.md) identifies exact inspected boundaries.

Non-goals for this build pack: production deployment, advertising purchases, live messages, data migrations against Green, scraping contacts, new microservices, medical/legal/financial professional judgment, unbounded AI autonomy, fully automatic creation of truthful physical-world evidence.

Data: tenant/contact/channel identities, source metadata, business opportunity facts, financial records, operational events, bounded evidence references; sensitive sectors need narrower capture and roles. Avoid duplicating raw transcripts/documents. Customer jurisdiction, processors and retention obligations are tenant-specific owned inputs, not assumed from local workspace timezone.

Actual customer volumes and processor locations are unknown. Proposed targets below enable synthetic engineering tests; they are **not measured load, contractual SLAs or approved production limits**. Owner must accept or replace them and validate isolated capacity before G2.

## G1: architecture and authority

L0 policy/config → L1 existing authenticated dashboard/verified provider ingress → L2 sector rules and use cases → L3 existing domain/payment/channel ports → L4 Convex state, outbox, internal actions and receipts. Boundaries: browser untrusted; provider webhook signed but payload still validated; model output untrusted; manager policy trusted only within permitted controls; provider acceptance distinct from confirmed delivery.

Use existing React/React Router/Vite, Convex and server API deployment units. No queue vendor, Redis, extra load balancer or additional database is necessary initially. Work schedules/capacity, prices and payment ledger stay authoritative in current domain modules. New events are evidence/projections, not a second writable version of domain state. Cases are added only for missing adapters. Source referrals supply attribution; no retroactive fabrication.

Effects register: WhatsApp/Instagram messaging reuses current verified integration/sender and channel eligibility; fake transport only in build tests. Website/form/portal adapters require configured tenant binding, signature/anti-abuse controls and replay key. Spend import initially supports bounded manual data; real ad connectors need customer-owned accounts and explicit activation. Asset storage exposes signed/authorized references, never raw secrets. External publishing and payment collection integrations remain separate unless explicitly scoped.

## Numeric budgets — proposed test targets

| Item | Proposed target / enforcement |
|---|---|
| Eligible success | Proposed 7-day target: ≥99.5% of valid authorized ingress events durably accepted and ≥99% of eligible, unexpired operational notices submitted before their usefulness deadline; user cancellation/opt-out excluded with recorded reason, provider outage included as failure and separately diagnosed; delivered outcomes reported separately |
| Synthetic capacity profile |100 tenants ×1000 new opportunities/month;100000 total monthly; bursts10 ingress events/s global for5min,2/s/tenant; existing-domain data10000 contacts +10000 opportunities/tenant for query tests |
| Ingress |p95 durable acceptance≤2s under synthetic burst; provider effects asynchronous; payload≤64KiB before parsing, endpoint-specific stricter limits retained |
| Owner API |p95 reads≤500ms, writes≤1s at target; bounded25/100 pagination; no tenant table scan or per-row provider call |
| Jobs |claim batch25; per-tenant dispatch concurrency2/global10; proposed target10 eligible jobs/s global; lower provider quota always wins; excess durable queue, no dropped acceptance |
| Timing |lease90s; call15s; finalize30s; retry1/5/30min with jitter, initial+3 retries maximum; stale leases reconciled before retry |
| Queue usefulness |event update expires1h; appointment reminder expires at appointment start; quote follow-up expires at quote validity; marketing nurture expires7days unless policy says sooner; dead-letter alert after15min unresolved |
| UI freshness |poll10s visible; commit displayed≤15s target; stale after30s; hidden tabs pause; error backoff≤60s |
| Recovery |proposed RTO4h/RPO15min; must be replaced by demonstrated authorized backup/restore capability before release; no claim managed DB automatically meets them |
| Model |max1 extraction call +1 wording call per inbound event,2 tool actions, bounded6000 input/500 output tokens per call,20s total deadline; deterministic fallback; no self-chaining |
| Spend |synthetic tests spend0; proposed live pilot ceiling USD0.05 AI/op andUSD5/tenant/day,USD50/global/day,USD1000/global/month; reserve budget before call, alert80%, deny additional calls at100%, overshoot≤one reserved call; owner approval required |
| Retention |proposed nonsensitive attribution180days, delivery metadata90days, raw normalized ingress≤7days, redacted logs14days; deletion jobs≤7days unless lawful retention requires an exception; sensitive tenant limits can be shorter |
| Runtime scaling |managed platform concurrency bounded by application dispatch gate; custom replica/SQL connection pools N/A because none introduced; validate platform quotas and rollout overlap in isolated target |
| Evidence |all regression failures logged; success aggregate metrics only, no customer payload logs; weekly queue/cost review; synthetic recovery report before release |

The initial capacity profile intentionally includes a short burst well above average volume. Backlog recovery test: inject3000 events over5min while provider slows, then restore; assert deadlines, tenant fairness, bounded attempts and no unbounded memory/scan. If target cannot be met, change measured budget with owner acceptance instead of weakening tests silently.

## Cache register

No new distributed/application answer cache. Browser data is tenant/session-scoped, transient and invalidated on logout, workspace change, writes and revocation; private responses must not become shared CDN cache entries. Availability, consent, permissions and prices are reread at execution. Metric buckets are durable projections with watermarks and rebuild behavior, not a cache that may silently drift. Model prompt caching is disabled/unclaimed until endpoint-specific usage/retention evidence exists.

## Control register

All applicable controls are **planned** until dated implementation evidence is linked. Exact canonical definitions live under `/Users/ramsis21/Desktop/obsidian/business/Operations/Architecture/`.

| Control | Applicability / required evidence |
|---|---|
| APP-01 |planned: current modular boundaries and single domain authority; dependency review |
| APP-02 |planned: typed request/response and error contracts; API-to-Convex tests |
| DATA-01 |planned: tenant ownership of every read/write/link; two-tenant suite |
| DATA-02 |planned: concurrent idempotency, capacity and version tests on real isolated backend |
| DATA-03 |planned: indexed bounded reads and measured large-tenant query latency; no new SQL pool |
| DATA-04 |planned: additive schema, unknown legacy attribution, deletion and rollback rehearsal |
| NET-01 |planned: bounded ingress, tenant-aware admission and overload tests |
| NET-02 |planned: managed platform limits and rollout overlap; custom load balancer not applicable |
| NET-03 |planned: finite timeouts, retry classes, provider slowdown and uncertain-effect tests |
| ASYNC-01 |planned: durable acceptance, lease lifecycle and dead-letter evidence |
| ASYNC-02 |planned: atomic domain/outbox boundary, ordering, duplicate and timeout-after-effect tests |
| ASYNC-03 |planned: backlog age, fairness, poison-message quarantine and scoped replay |
| CACHE-01 |planned: explicit no-new-cache decision and authority register |
| CACHE-02 |planned: private/no-store behavior and tenant cache leakage tests |
| CACHE-03 |planned: browser invalidation and projection reconciliation; distributed cache not applicable |
| AI-01 |planned: prompt/data/spend budgets; no unverified prompt-cache savings |
| AI-02 |planned: extraction evidence, deterministic validation, bounded tools, hostile prompt tests |
| SEC-01 |planned: trust boundaries, least privilege, tenant/resource roles, session/CSRF/revocation and selected ASVS scope |
| SEC-02 |planned: secret lifecycle, signed/replayed webhook tests, bounded private uploads and SSRF/egress checks for connectors |
| SEC-03 |planned: untrusted model/document/tool inputs, injection/exfiltration tests and deterministic permission enforcement |
| SEC-04 |planned: data categories/regions/processors, purpose, retention/deletion including backups, incident/rights ownership and sensitive-sector gates |
| SEC-05 |planned: locked dependencies, vulnerability/secret scans and owned risk disposition with dated evidence |
| REL-01 |planned: eligible-event SLI definitions, measured success/latency/error budget and demonstrated recovery objectives |
| REL-02 |planned: traceable functional/failure/load/security tests, known gaps, client acceptance and current explicit release authority |
| REL-03 |planned: identifiable artifact/config, additive migration compatibility, staged enablement, stop thresholds and rollback evidence |
| OPS-01 |planned: queue/provider/latency/cost dashboards and tested alerts |
| OPS-02 |planned: model/messaging/storage/support costs, atomic budget reservations, enforcement and bounded overshoot tests |
| OPS-03 |planned: named responder, reconcile/dead-letter/access recovery runbooks, isolated backup restore, handoff and review feedback |

Security mapping is an engineering acceptance checklist, not an ASVS certification. If ASVS is selected for release review, the reviewer must record its version and exact requirement-to-test mapping rather than asserting full compliance. Legal/regulatory assessment remains separate evidence.

## G2: build and release evidence

Build order and test commands: [queue](README.md), [agent runbook](agent-runbook.md). Every task report must distinguish in-memory, HTTP harness, browser, isolated backend and production evidence. Sensitive cases need specific tests that prevent export of clinical, conflict or account details. Use approved synthetic fixtures only.

Migration plan: add optional columns/new tables/indexes; deploy readers compatible with old rows; version policy/events; backfill only verified source history with resumable tenant cursor and dry-run counts. Existing contacts receive unknown attribution rather than false first-touch. Existing manual followups remain manual. Do not require historical records to satisfy newly introduced evidence fields retrospectively; restrict new transition claims until evidence exists.

Release conditions: exact artifact and schema versions, green automated suite, concurrency/restore evidence, named operations owner, approved connection/retention/budgets, per-sector policies, rollback rehearsal and current explicit deployment authorization. Pending pack access cannot be activated by a documentation edit. Enable one tenant/sector in shadow first, compare decisions, then authorized active rollout.

Stop thresholds proposed: any cross-tenant disclosure or unauthorized send → immediate disable; duplicate effect>0 → stop worker; error rate>2%/5min or oldest useful job>5min → pause new dispatch and investigate; never discard durable jobs. Validate thresholds against measured load before release.

## G3: operations and gaps

Monitor acceptance/queue-to-submit/delivery times separately, suppression reasons, uncertain delivery count, dead letters, conversion reversals, source/spend completeness, AI costs and physical-input backlog. Managers see exceptions with proposed resolution; routine messaging proceeds under standing policy. Assigned staff see only their operational scope.

Recovery: disable growth dispatch; preserve records; identify provider outcome before replay; replay selected tenant/event range with dry-run; compare source and projection watermarks; repair projection only, never fabricate external confirmation. Restore test needs authorized isolated backup target and records achieved RTO/RPO.

Owned unknowns: production workload and budget (Ahmed before G2); provider credentials/eligibility and tenant consent policy (customer owner before connector activation); processor region/retention and incident responder (operations owner before live data); missing sector domain adapters (build agent at listed task); actual capacity/concurrency/restore evidence (engineering before release). These do not block drafting or synthetic implementation. No production deployment, live campaigns or actual readiness result is recorded by this pack.
