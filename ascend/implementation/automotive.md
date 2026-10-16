# Automotive: agent build specification

Task **B10** · sector ID `automotive` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `automotive`; implementation family: **existing workshop**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Automotive product/dashboard specification](../automotive.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing automotive schema owns vehicles, requests, bays, appointments, work orders, inspections, estimates, approvals, labor and parts. Growth only links these records.

Existing files to inspect and extend only as required:

- [convex/hasib/automotiveState.js](../../convex/hasib/automotiveState.js)
- [convex/hasib/automotiveDomain.js](../../convex/hasib/automotiveDomain.js)
- [convex/hasib/automotiveSchema.ts](../../convex/hasib/automotiveSchema.ts)
- [convex/hasib/automotiveMetrics.js](../../convex/hasib/automotiveMetrics.js)
- [src/components/hasib/AutomotiveDashboard.jsx](../../src/components/hasib/AutomotiveDashboard.jsx)

Existing operations / explicit gaps: **automotive_request_save, automotive_appointment_save, automotive_appointment_status, automotive_work_order_save, automotive_inspection_save, automotive_estimate_save, automotive_approval_record, automotive_part_status, automotive_quality_save, automotive_work_order_status**.

Own these **proposed new** sector files:

- `config/ascend-growth/automotive.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/automotive.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/automotive.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-automotive-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Repair/service-specific local search, customer referrals, fleet partnerships and verified service history.
- **Offer / next action:** A diagnostic/service appointment or a sourced estimate for a known service.
- **Deterministic fit:** Vehicle/service, location, urgency stated by customer, bay/technician capacity and available parts where needed.
- **Verified conversion sequence:** Attended appointment → authorized completed work order.
- **Repeat/referral route:** Service-due reminders, fleet agreements and permitted referrals.
- **First experiment:** Compare a generic quote request with a vehicle/service-specific diagnostic booking; judge completed authorized work, with repair complexity matched. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L09, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: No invented fault, fear-based upsell or claim that all declined recommendations must be purchased.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| vehicleId / serviceId | owned IDs; plate/VIN restricted source facts | existing vehicle/service tables |
| concern / urgency | customer-stated bounded text and requested time | no inferred safety diagnosis |
| odometerKm / powertrain | nonnegative integer and catalog enum | supplied by verified record/customer with provenance |
| appointmentWindow / bayId / technicianId | UTC interval and owned resources | existing capacity and skill validation |
| estimateVersion / approvalScope | current version and exact lines authorized | existing estimate and approval records |
| inspectionEvidence / qualityEvidence | technician-recorded references | cannot auto-pass physical inspection |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'automotive'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Use automotive domain guards rather than generic job status. Approved lines only may proceed; repricing invalidates prior approval scope; parts availability, promised date, inspection and quality all retain current authority. Vehicle ready status requires required quality evidence.

**Mutation/event wiring:** Request→appointment→arrival→inspection/estimate→authorization→work→quality→collection supplies event chain. DVI link is current authorized artifact; approval follow-up stops on decision. Maintenance invitation uses actual vehicle/service policy/odometer evidence.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `automotive.intake` | Verified vehicle/contact and concern | EV plus MISSING_INPUT | No repair authorization inferred from intake |
| `automotive.inspection_complete` | Mechanic supplies finding/service lines | QUOTE | Technical ambiguity routes to mechanic |
| `automotive.estimate_accepted` | Authorized customer accepts exact scope/version | EV | New extra work requires corresponding authorization |
| `automotive.parts_or_schedule_hold` | Authoritative shortage or capacity conflict | EV plus NO_PROGRESS | No guessed ready time |
| `automotive.in_progress` | Verified mechanic start | EV optional | Do not duplicate unchanged updates |
| `automotive.quality_passed` | Required mechanic/test evidence complete | EV plus COLLECTION | Failed quality checks block ready notification |
| `automotive.collected` | Verified handover | EV plus BALANCE if applicable | Outstanding payment survives collection as its own obligation |
| `automotive.comeback_or_due` | Verified repeat concern or recorded next-service date | RECOVERY or RENEWAL | Human decides roadworthiness and disputed cause |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect vehicle concerns, explain mechanic-recorded findings, request estimate consent, provide status/delay updates and coordinate collection.
**Hasib:** Create linked work orders, validate current estimate approval, reserve bays/parts, track repair/test/ready events, maintain costs and queue all authorized reminders.
**Necessary human/source input:** Mechanics inspect, repair and certify relevant checks; enter actual findings/work/handover only when no source supplies them. Exceptions cover unsafe conditions, nonstandard repair authorization and disputed warranty/refund decisions.

One-time standing configuration: service/inspection menus; labor/parts price rules; technician/bay capacity; customer authorization limits; parts substitutions; handover/test checklist; promised-date rules; warranty and comeback routing. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Track billed vs actual labor, bay utilization and first-time-fix according to existing metric definitions; don't count quote value as realized gross profit.**

## 5. Six-tab UI wiring

Keep Chats · **Workshop / الورشة** · Customers · Broadcasts · Insights · Settings. Default Work view: **Vehicle stage board**. Exactly these permanent Work secondary views: **Board · Schedule · Parts · Follow-ups**.

Primary action: **New work order**. Main row shows **Vehicle, current stage, estimate approval, promised ready, parts blocker, advisor**. Filters: **Awaiting approval · Parts needed · Past promise · Ready**. Details include **Vehicle/inspection; approved estimate; repair/quality events; invoice and collection**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Repair type; customer/warranty work; parts category; comeback reason**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B10.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B10.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B10.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B10.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B10.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B10.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B10.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B10.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B10.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../automotive.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Vehicles past promise | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Estimates awaiting approval | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · First-time repair success | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Work-order contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Average repair order | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Parts gross margin | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Effective labor rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Ready-to-collection time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per completed acquired-customer job; estimate acceptance; declined-work recovery; repeat contribution**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Vehicle estimate includes10000 required work and5000 optional declined work. Parts arrive late; quality fails once then passes. Customer returns for unrelated new service.

**Assert exact business results:** Authorized amount10000 only; no ready message after failed check; one ready update after pass; late parts revise promise with source evidence; return service is new lifecycle but not a second newly acquired customer.

Additional sector acceptance requirements from the operating specification:

1. Inspection entry → automatically priced estimate → customer consent → repair/test facts → ready update requires no advisor to copy the estimate or create reminders.
2. An estimate revision invalidates old acceptance and all queued approval messages.
3. Collection before a scheduled reminder cancels it while preserving a separately verified debt.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-automotive-growth.test.mjs
node --test tests/hasib-automotive.test.mjs tests/hasib-automotive-load.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B10-automotive.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
