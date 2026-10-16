# Ascend implementation: shared foundation

Status: **planned engineering contract**, inspected 2026-10-10. This describes additions; it is not evidence that they exist. Read the [agent runbook](agent-runbook.md), [engineering pack](engineering-pack.md), [product acquisition design](../lead-generation.md), [automation contract](../automation-contract.md) and the chosen sector's implementation file. Existing sector product specs remain the authority for their eight KPI definitions and eight primary event rules.

## 1. Actual code boundary and ownership

| Concern | Existing source to extend | Required change |
|---|---|---|
| Browser access | `src/lib/dashboard/api.js` | Keep `hasib(action, body)`, existing session/CSRF handling; never send authoritative account/pack IDs |
| HTTP entry | `api/layla-meta.js`; `api/_lib/hasib/hasib-api.js` | Reuse Hasib surface; retain origin/session/body/CSRF checks and founder read-only previews |
| HTTP arguments | `api/_lib/hasib/validate.js`; `config/hasib-workflow-operations.js` | Add explicit growth operations and bounded field shapes, required IDs and request/version rules |
| Convex entry | `convex/blueHasib.ts`; `convex/hasib/entryArgs.js` | Extend validators with typed growth payload and operation union; no `v.any()` |
| Domain dispatch | `convex/hasib/hasibState.js` | Register growth operations; dispatch only AFTER gate, tenant resolution, plan, workspace, role, pack and staff checks |
| Authorization | `convex/hasib/capabilities.js`; `staffPolicy.js`; `workspaceState.js` in same directory | Explicit roles per operation, assigned-record scope and response redaction; don't let new names inherit accidental access |
| Industry selection | `config/hasib-packs.js`; `config/layla-qualification.js`; `config/layla-sector-packs.js` | One authoritative server-selected industry ID; add explicit retail-tech qualification mapping; retain Catalyst qualification semantics |
| Data | `convex/schema.ts`; `convex/hasib/workflowSchema.ts` | Import proposed growth tables additively; preserve current records and IDs |
| UI | `src/pages/LaylaDashboard.jsx`; `src/lib/dashboard/navigation.js`; `src/components/hasib/` | Implement six-tab Ascend shell behind separate gate; retain Catalyst's existing four tabs |
| Existing local concept | `src/components/ascend-draft/` | Visual reference only: localStorage and synthetic rows cannot become operational sources |
| Messaging | `convex/blueMessaging.ts`; `convex/blueCampaignState.js`; `api/_lib/layla/campaign-worker.js` | Reuse authenticated channel/transport and receipts; one dispatch authority per delivery, not two competing schedulers |
| Attribution baseline | `convex/blueContacts.js`; `convex/schema.ts`; `src/lib/analytics.js` | Contact source is coarse. Add separate touchpoints; marketing website pixel/CTA clicks are not tenant conversions |

Current Hasib pack status: six enabled, nine preview, ten pending. Module `available` is not proof of live access. `executeHasib` refuses non-live packs except overview outside the synthetic harness. `ctx.hasibPreview` is test-only; a customer cannot choose its tenant/industry by query string. Current Ascend production navigation has more destinations than the requested six; draft navigation is not the migrated shell.

## 2. Proposed file layout and contracts

All files below are **new**, unless a later agent has already built and documented them. Reuse a completed foundation instead of making a parallel engine.

- `config/ascend-growth-sectors.js`: imports sector descriptors from `config/ascend-growth/<slug>.js`; exact 25-ID registry, fields, deterministic fit rules, permitted events, policies and measurement versions. Config contains no credentials.
- `config/ascend-growth-operations.js`: operation names/HTTP argument allowlists; import into current validators and dispatcher.
- `convex/hasib/growthSchema.ts`: typed table definitions and discriminated unions; spread into root schema.
- `convex/hasib/growthState.js`: authenticated use cases; `growthRules.js`: pure validation, fit, state transitions, cadence and metric predicates; `growthMetrics.js`: bounded projections.
- `convex/hasib/growthAdapters/<slug>.js`: only sector-specific domain bridge and guards; shared engines in `growthAdapters/common.js`. Existing domain executors retain stock, capacity, payment and domain-state authority.
- `convex/hasib/growthOutbox.js`: pure eligibility, claim/completion, retry/reconciliation state. `convex/ascendGrowth.ts`: internal scheduler/action wrappers using typed generated function references. Effects run in actions, never inside mutations. Register one internal recovery sweep in existing `convex/crons.ts`; schedule exact due jobs through the current Convex scheduler and make the sweep a recovery path, not a duplicate sender.
- `convex/hasib/sectorCasesState.js`: proposed shared runner for sectors with no operational adapter; typed sector-specific payloads, versioned artifacts and resource holds. This is not an untyped notes-based CRM.
- `api/_lib/hasib/growth-ingress.js`: verified source-to-touchpoint normalization behind existing ingress where possible. A separate public source adapter is only added with signature/replay/tenant binding tests.
- `src/components/hasib/growth/{OpportunityPanel,AcquisitionSettings,SourcePerformance,AutomationTimeline,SectorCaseView}.jsx`: shared components; use existing sector dashboards for existing work. Add `src/lib/hasib/growthStrings.js` for complete EN/AR copy.
- `tests/ascend-growth-*.test.mjs`, `tests/ascend-<slug>-growth.test.mjs`, `tests/fixtures/ascend/<slug>.mjs`: synthetic contract/domain/API/automation fixtures. Extend current in-memory helpers only as needed, without weakening existing assertions.

Adapter contract: `validateFacts(input, policy)` returns normalized typed facts or field errors; `evaluateFit(facts, availability, policy, now)` returns `{state,reasons,missingFields,validUntil}`; `createOrLinkWork(ctx, tenant, opportunity, requestId, now)` calls the proper authorized domain helper once; `onDomainEvent(ctx, tenant, event, now)` appends conversion/follow-up decisions atomically; `conversionEvidence(ctx, tenant, link, milestone)` reads the authoritative record; `publicSummary(record, role)` redacts restricted fields. Effects and model calls are excluded. Every referenced ID is fetched and verified against the resolved tenant.

Fit states: `unknown | needs_input | eligible | ineligible | exception`. Missing information is not rejection. Availability has a timestamp/expiry, not an unqualified boolean. Optional AI extraction proposes facts with source references; deterministic validators decide readiness. Contact `qualificationStatus=qualified` remains intake completeness and must not silently become commercial fit.

## 3. Typed durable data contract

Proposed common fields: `accountId:v.id('accounts')`, `createdAt/updatedAt:number` UTC milliseconds, `version:number` safe integer. Currency amounts use integers with currency/minor-unit exponent from existing account conventions (OMR is not two-decimal USD). No floating-point prices, arbitrary tenant IDs or sensitive details in UTM fields.

| New table | Required fields and constraints | Required indexes / authority |
|---|---|---|
| hasibGrowthPolicies | sectorId, schemaVersion, enabled, mode=shadow/active, offerVersion, policyVersion, timezone, business hours, purpose/channel rules, frequency caps, capacity/price bounds, expiry, managerActorId | by_account_sector; immutable revisions retained; one active version transactionally enforced |
| hasibGrowthTouchpoints | contactId optional until matched, providerEventKey, occurredAt, receivedAt, channel, source/medium, campaign/ad/creative/landing/offer/referral IDs optional, consentEvidenceRef optional, payloadHash, attributionQuality=verified/declared/unknown | by_account_event; by_account_contact_time; ingest dedupe; no raw conversation or documents |
| hasibGrowthOpportunities | contactId, sectorId, lifecycleId, intentKey, fitState, missingFields, stage, facts discriminated by sector, policyVersion, firstTouchId/latestTouchId optional, domainLink optional, version | by_account_intent, by_account_stage_updated, by_account_contact_created; one active intent within configured dedupe window; multiple distinct needs allowed |
| hasibGrowthEvents | opportunityId, eventKey, kind, sourceType, sourceId, sourceVersion, occurredAt, recordedAt, evidenceRef, reversalOf optional, schemaVersion | by_account_event; by_account_opportunity_time; append-only evidence ledger; correction by reversal |
| hasibGrowthJobs | opportunityId, eventId, stepKey, purpose, dueAt, expiresAt, status, attempts, leaseToken/leaseUntil optional, guardVersion, policyVersion, channel, messageRef optional, lastErrorCode optional | by_status_due, by_account_status_due, by_account_step; step uniqueness checked in same transaction |
| hasibGrowthDeliveries | jobId, deliveryKey, attempt, providerMessageId optional, state, submittedAt/deliveredAt/readAt/failedAt optional, errorClass, reconciliationAt optional | by_account_delivery; by_provider_message (verify sender/tenant); immutable attempt evidence, monotonic receipt reconciliation |
| hasibGrowthConversions | opportunityId, milestone, sourceEventId, domainLink, conversionKey, occurredAt, valueMinor/currency optional, reversalOf optional, attributionModelVersion | by_account_conversion; by_account_milestone_time; distinct real outcome, never a click or scheduled reminder |
| hasibGrowthSpend | source, campaignId, periodStart/end, amountMinor, currency, completeness, externalKey, version | by_account_source_period; by_account_external; imported data separate from booked expenses to avoid double counting |
| hasibSectorCases | sectorId, contactId, opportunityId, status, typed payload, orderId optional, version | by_account_sector_status_updated; by_account_opportunity; only for missing domain adapters, never a duplicate repair/order/booking |
| hasibGrowthArtifacts | caseId or typed domainLink, kind, revision, status, authorizedApproverRef, evidenceRef, expiresAt optional, supersedesId optional | by_account_record_revision; exact-version approvals, no public storage secrets |
| hasibGrowthReservations | resourceKey, caseId or domainLink, startsAt, endsAt, quantity, status=held/confirmed/released/expired, expiresAt, version | by_account_resource_start; atomic overlap/capacity checks and hold expiry |
| hasibGrowthMetricBuckets | sectorId, metricId/version, localDate, timezone, dimensions, numerator, denominator, valueMinor optional, sourceWatermark, completeness | by_account_sector_date; bounded daily projections; reversible updates and rebuild cursor |

IDs called domainLink are a validated tagged union, not arbitrary table names accepted from clients: `{kind:'repair',repairId}`, `{kind:'order',orderId}`, `{kind:'booking',bookingId}`, `{kind:'job',jobId}`, `{kind:'real_estate',opportunityId}`, `{kind:'construction',projectId}`, `{kind:'automotive',workOrderId}`, `{kind:'case',caseId}`. Use actual table IDs from current schemas. Attendance/membership links may be added as explicit alternatives. Do not guess automotive table names: import its validators.

Each table receives bounded retention/deletion rules under the engineering pack before activation. Unique indexes in this contract mean transactionally enforced uniqueness; do not assume the database index itself is a uniqueness constraint. Same idempotency key with a different canonical fingerprint must return conflict. Cross-tenant link resolution returns a nondisclosing not-found/refusal, never another customer's label.

## 4. API operations and permissions

New operation registry must cover **all five** surfaces: HTTP shape, Convex args union, HASIB_OPERATIONS, dispatch, role/staff policy. API result follows existing `{ok,value|reason}` domain and HTTP response conventions. Use requestId on create/effect requests, expected version on edits, and typed ID on reads. Limits: page 25 default/100 maximum, strings capped per descriptor (general text 500, labels 120, source IDs 128), arrays 20 unless an explicitly bounded domain list requires more. Reject invalid required values rather than silently dropping them. Strict unknown-field rejection applies to new growth payloads; preserve existing operations' tested argument-shaping behavior, which drops unknown keys. Read the service adapter in `api/_lib/convex.js` when tracing HTTP-to-internal-function calls; do not create a second unauthenticated Convex transport.

| Operation | Fields besides server context | Access / result |
|---|---|---|
| growth_opportunities | cursor, limit, stage, fitState, contactId, fromAt, toAt | assigned operational scope; redacted paged summaries |
| growth_opportunity | growthOpportunityId | owned detail + linked work + next action |
| growth_opportunity_save | requestId or growthOpportunityId+version, contactId, facts, intent discriminator | staff permitted operational facts; server derives sector and fit; no client stage/attribution override |
| growth_work_create | requestId, growthOpportunityId, version | ordinary staff/agent capability; idempotent domain create/link with guards |
| growth_case_update | caseId, version, typed patch, evidenceRef | assigned operational scope; sector transition rules; actor allowed for evidence kind |
| growth_artifact_decide | requestId, artifactId, version, decision, evidenceRef | authorized approver only; authenticated external decision adapter maps identity; no anonymous trust |
| growth_timeline | growthOpportunityId, cursor, limit | assigned scope; no secret/raw sensitive payloads |
| growth_job_resolve | jobId, version, resolution code, evidenceRef | manager exception action; cannot bypass consent or pretend delivery |
| growth_policy_get/save | policyId/version for save, typed policy | manager only; save audits old/new revision and cancels incompatible queued steps |
| growth_metrics | period, filters, cursor | existing insights/money roles; staff do not see margin/spend |
| growth_sources/spend_import | source filters; import requestId + bounded normalized rows | manager only; signed connector ingestion separate from browser |
| growth_attribution_correct | touchpointId, version, correction, evidenceRef | manager only; append correction/audit, preserve original |

Inbound ingestion, outbox claim/finalize, receipt reconciliation, conversion recording and metric rebuilding are **internal operations**, not public Hasib actions accepting arbitrary events. Layla tools have bounded capabilities through trusted service context, no fabricated owner session, unrestricted database access or manager-role impersonation.

## 5. Acquisition entry and attribution wiring

F02 first implements manual/synthetic source input and existing inbound metadata. Sources must be nullable: missing provider referral becomes `unknown`, not an invented paid campaign. Normalize provider event ID before contact matching; channel identity and verified business integration resolve tenant, never UTM parameters.

F08 adds one adapter at a time: website inquiry (tenant-bound signed form configuration, anti-abuse and consent capture), click-to-message referral metadata, signed Meta lead-form webhook, approved portal/CSV imports, partner referral links. A new advertising platform connector, call transcription, email inbox, Google Ads upload or Meta CAPI export is a separately tested integration, not implied by an acquisition recommendation. Record missing credential/eligibility as connection state. Build with fake adapters first.

Persist first valid touch once; update latest eligible touch by event time with late-event rules; store source history. Baseline attribution: first-touch acquisition source and last eligible touch before conversion as two separately labelled reports; default lookback30 days, policy-versioned and configurable per sector. Never sum both models as two conversions. Direct/unknown does not erase a known earlier touch. Referral attribution needs a recorded token, not an AI guess.

Default active-intent dedupe window24h using contact + sector + intent discriminator from the sector file; explicit new service/project date/device can create a new opportunity sooner. Provider event dedupe is permanent within retained ingestion evidence, separate from the opportunity window. Closed cases get a new lifecycle for genuine repeat work; late receipts update old evidence only.

## 6. Automation state machine, timing and source of truth

Job states: `scheduled → claimed → submitted → delivered`; `claimed → retry_wait → claimed`; any unsent job can become `cancelled/suppressed/expired`; repeated deterministic failure → `dead_letter`; timeout after possible provider acceptance → `uncertain`. Read is an optional delivery receipt, not required for completion. Provider submission is not delivery. Transport-level permanent failure cannot be relabelled sent.

1. Commit domain transition, growth event, conversion if proven, and deduplicated outbox step in one mutation. Existing notification queues (notably clinic) must delegate to one sender or own the event exclusively; never enqueue both.
2. Schedule after durable commit through internal runner. Claim max25 due jobs with a lease token; finalization requires matching lease. Per-record ordering and version checks suppress old messages after revisions.
3. Immediately before sending, reread source state/version, opt-out, purpose consent, channel policy/window/template eligibility, takeover, provider health, policy/gate, capacity/offer expiry and job deadline. Transactional operations are not permission for marketing.
4. Generate content only from current typed evidence; deterministic templates first. AI can phrase known facts within bounded tool/model budgets. It cannot invent available stock, attendance, diagnosis, contract acceptance or delivery.
5. If new inbound reply answers the question, purchase completes, appointment moves, quote revises or customer opts out, cancel superseded jobs in the same workflow. A policy revision triggers bounded reconciliation of remaining jobs.
6. Retry only failures known to precede acceptance. Suggested retries1m/5m/30m, maximum3 retry attempts after initial attempt, exponential jitter, respect Retry-After and expiry. Unknown outcome reconciles via existing message/provider evidence; no blind resend.
7. Produce an exception with reason, owner, evidence and proposed safe next step when automation cannot decide. Never require a manager to approve ordinary reminders inside policy.

Cadence profiles and stop conditions are defined in [automation-contract.md](../automation-contract.md). Implement those profiles once, with tenant timezone/business hours and configurable purpose caps; sector events select them. Do not invent25 independent cron systems. Claim expiry90s; provider call deadline15s; finalization deadline30s. Clock tests cover DST and Asia/Muscat. Provider limits can tighten these internal targets.

Follow-ups UI becomes a projection of jobs + existing manual `hasibFollowups`, visibly labelled automation/manual. Current manual rows support only open/completed and cannot be silently treated as sent. Extend typed linked references to repairs/cases while retaining legacy readers; create no fabricated historical delivery receipts.

Live updates initial implementation: authenticated HTTP polling every10s while visible for active work, refresh immediately after mutation, stop on hidden tab, exponential error backoff to60s, show last successful refresh and stale indicator after30s. This is polling, not streaming. A later Convex subscription requires real auth design; never expose internalMutation or sessionHash to browser. Tests must prove a second browser sees committed changes within15s under target load. Source systems still need to supply actual repair/shoot/site facts.

## 7. Six-tab integration and measurement

Ascend/Apex only: Chats · sector Work · Customers · Broadcasts · Insights · Settings. Preserve Catalyst's four destinations and plan denials. Each sector file supplies Work name/default/max4 secondary views. Opportunity and evidence live in drawers, filters or nested details; no permanent seventh tab and no fifth Work view. Team is Settings; expenses and margin are Insights; catalog/resources belong in Work or Settings as specified.

Use `src/components/ascend-draft/presentation.js` and product specs as visual reference; wire real data through current dashboard client. Migrate old today/orders/stock/service/money/team deep links with explicit per-sector alias tests, preserve selected record/query state and browser back/forward. Do not mount old dashboards wholesale if they introduce extra navigation or duplicate polling.

Measure lead → eligible → verified first milestone → completed paid outcome → repeat, with cancellations/refunds/reversals. Keep operational KPIs from each sector's original table exactly; acquisition metrics extend Insights, not replace those four headline/eight total definitions. Formula registry must identify event source, timestamp, denominator/cohort, window, currency, missing-data behavior and reversal policy.

Shared fixture: five eligible new-customer opportunities, three verified first conversions, two completed purchases with100000/80000 minor-unit revenue, one20000 refund, total direct costs90000, matched spend30000. Expected eligible→conversion60%; net revenue160000; contribution before acquisition70000, after40000. Completed-new-customer CAC15000 (two customers); first-conversion cost10000 (three conversions). These are different metrics. Missing spend yields unknown CAC, not0. No denominator yields unavailable, not0%. One customer with two opportunities is not two acquired customers.

Paid conversion export remains off until customer-owned connection, current platform eligibility and field-level consent policy are tested. Health/legal/financial sensitive facts never enter analytics URLs, ad audience fields or creative identifiers. Existing marketing `fbq Schedule` on CTA click must not become Ascend's verified booking signal.

## 8. Foundation work packages and completion

| ID | Build contents | Required proof before dependent sector |
|---|---|---|
| F01 | Registry, typed contracts, authorization, industry alignment, additive schema | All25 IDs accounted; Catalyst/staff/foreign IDs denied; preview read-only; unknown fields rejected |
| F02 | Touchpoints, idempotent ingest, fit, opportunities, domain-link interface | Duplicate/reordered events; separate intents; missing vs ineligible; source unknown retained |
| F03 | Domain events, outbox, policies, templates, suppression, fake transport and reconciliation | Crash/retry/opt-out/late reply/takeover tests; no double sends or false receipts |
| F04 | Six-tab shell, Work/Customers/Insights/Settings components, live refresh | EN/AR320/768/1440; actual authenticated API harness; cross-browser staleness; old links |
| F05 | Conversion/spend/metric projections, cohort reports, reversal and data-quality display | Golden arithmetic above; replay doesn't duplicate; missing-cost and cancelled cohorts |
| F06 | Existing-domain bridge helper and fixture contracts | Stock/capacity/payment mutations retain their existing authority; API-to-schema tests |
| F07 | Typed cases, artifacts/revisions, reservations for missing domain families | Competing holds, expired approval, restricted evidence and payment linkage; no generic unvalidated blobs |
| F08 | Source adapter framework then individually scoped connectors | Valid/invalid signatures, replay, tenant binding, payload caps, secret redaction, disabled live transport |

Build F01→F02→F03; F04/F05/F06 follow; F07 before Media and other pending-domain sectors. F08 fake/manual framework is needed for every sector, but third-party credentials must not block synthetic delivery. Start first sector only when F01–F06 and fake ingress pass; build F07 immediately before Media. Independent task IDs are implementation dependencies, not authorization to spawn parallel agents.

Gate proposed `ascendGrowthEnabled` per account plus per-sector policy; default false. Shadow mode computes decisions and evidence without scheduling external actions. Preview pack enablement is a separate release decision. Feature rollback disables new jobs/UI and restores old navigation while retaining additive data for audit; do not delete domain records or republish all packs to recover one sector.
