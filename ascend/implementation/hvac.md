# Air conditioning: agent build specification

Task **B08** · sector ID `hvac` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `jobs`; implementation family: **field job + equipment**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Air conditioning product/dashboard specification](../hvac.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing hasibJobs/equipment and linked orders. Add service radius, technician skill/route window and maintenance contract facts; use shared reservations for dispatch only where current jobs lack resource locking.

Existing files to inspect and extend only as required:

- [convex/hasib/jobsState.js](../../convex/hasib/jobsState.js)
- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [src/components/hasib/JobsWorkView.jsx](../../src/components/hasib/JobsWorkView.jsx)

Existing operations / explicit gaps: **equipment_save, job_create, job_estimate, job_approve, job_update, job_status, job_repeat**.

Own these **proposed new** sector files:

- `config/ascend-growth/hvac.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/hvac.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/hvac.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-hvac-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Local high-intent repair/installation search, service-area pages, property-manager partnerships and referrals.
- **Offer / next action:** A scheduled diagnostic visit or a policy-priced maintenance option.
- **Deterministic fit:** Service area, asset/job type, unit count, requested timing and technician capacity.
- **Verified conversion sequence:** Confirmed visit → completed paid job.
- **Repeat/referral route:** Accepted maintenance agreements, service-due reminders and permitted referrals.
- **First experiment:** Compare a generic contact CTA with a service-area-checked diagnostic booking path; judge completed jobs and contribution. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L01, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Use source-backed diagnosis and price rules; top-performer booking rates are external context, not an Oman guarantee.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| jobType / equipmentId | enum repair/maintenance/install; owned equipment optional | existing job.kind and equipment link |
| siteRef / unitCount | verified service address reference; integer1..1000 | radius and time/capacity fit |
| assetType / issue | catalog type and customer statement≤500 | not a diagnosis |
| preferredWindow / technicianSkill | UTC interval and approved required skill | include travel/setup duration |
| estimateVersion / partsEvidence | current version and owned stock/procurement refs | approval and parts before work commitment |
| maintenanceDueAt | UTC ms from equipment/service plan | repeat job must not reuse original request ID |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'hvac'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Call current job_estimate/job_approve and transitions; never skip accepted estimate for billable scope. Dispatch only to available qualified resource within area. Customer-stated urgency is not safety clearance. Completion and actual time need technician or source-system evidence.

**Mutation/event wiring:** Qualified inquiry→job estimate; accepted estimate→dispatch slot; technician committed en-route/on-site evidence→status update; completed job→BALANCE/FEEDBACK; equipment.nextServiceAt→configured CHECKPOINT then one permitted EV maintenance offer. Repeats link original asset and create independent order/lifecycle.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `hvac.request` | Customer gives location and service need | MISSING_INPUT | Do not diagnose from customer phrasing |
| `hvac.estimate` | Technician finding or catalog service fits price policy | QUOTE | Out-of-policy scope requires one technical/commercial exception |
| `hvac.scheduled` | Accepted scope, suitable resource and available window | EV plus PRE_EVENT | Capacity change invalidates old promise |
| `hvac.on_site` | Verified technician arrival | EV optional | No GPS/location claim without verified source |
| `hvac.parts_delay` | Confirmed shortage or supplier date | EV plus NO_PROGRESS | Unknown supplier date remains unknown |
| `hvac.tested_complete` | Technician submits completion and required checks | EV plus BALANCE | Failed checks prevent completed state |
| `hvac.service_due` | Approved asset nextServiceAt enters horizon | RENEWAL | No auto-invented maintenance interval |
| `hvac.repeat_fault` | Customer reports problem linked to asset/job | EV; deadline escalation | Do not declare warranty fault or blame technician without evidence |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect site/asset details, book eligible visits, present policy-priced estimates, coordinate access, explain verified status and arrange authorized maintenance.
**Hasib:** Assign suitable technicians, reserve windows and parts, track asset/job history, derive due maintenance from approved dates, calculate costs and manage event queues.
**Necessary human/source input:** Technicians perform diagnosis/repair and enter findings, completion/testing and unavailable part facts when not captured by field systems. Managers decide nonstandard scope and safety/technical exceptions.

One-time standing configuration: service catalog/rates; permitted maintenance intervals from asset records; skills/service zones; technician calendars; parts rules; standard quote limits; arrival promises and contract renewal terms. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Missed-call lead capture is a future telephony adapter, not current capability. Start with actual WhatsApp/web source and synthetic call adapter; distinguish response time from arrival SLA.**

## 5. Six-tab UI wiring

Keep Chats · **Jobs / الأعمال** · Customers · Broadcasts · Insights · Settings. Default Work view: **Dispatch schedule**. Exactly these permanent Work secondary views: **Schedule · Job list · Assets · Follow-ups**.

Primary action: **New job**. Main row shows **Visit window, site/asset, job stage, technician, parts blocker, next action**. Filters: **Today · Unassigned · Parts needed · Service due**. Details include **Asset history; approved estimate; visit checklist; costs and service dates**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Asset type; repair vs maintenance; service area; contract vs one-off**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B08.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B08.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B08.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B08.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B08.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B08.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B08.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B08.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B08.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../hvac.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time arrival | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · First-time fix | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Maintenance due | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Job contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Estimate acceptance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Repeat-fault rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Jobs past promise | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Maintenance renewal | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per completed job; qualified-to-booked; estimate acceptance; contribution per acquired customer; agreement renewal**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Two accepted jobs overlap one qualified technician; one site lies outside service radius; estimate v2 changes price after v1 approval; completed maintenance creates nextDueAt.

**Assert exact business results:** One reservation succeeds; out-of-area inquiry gets explicit ineligible reason; stale approval cannot authorize v2; one recurrence offer at approved due date; completed-paid conversion requires actual job completion and payment evidence.

Additional sector acceptance requirements from the operating specification:

1. A known preventive service is booked, dispatched, reminded and closed administratively from factual field events without staff chasing.
2. A parts delay invalidates an old completion notice and carries forward the approved promise history.
3. A repeat-fault job links costs and quality metrics to the original asset without duplicate revenue.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-hvac-growth.test.mjs
node --test tests/hasib-jobs.test.mjs tests/hasib-industry-journeys.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B08-hvac.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
