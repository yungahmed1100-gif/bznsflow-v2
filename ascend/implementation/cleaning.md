# Cleaning & facilities: agent build specification

Task **B09** · sector ID `cleaning` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `jobs`; implementation family: **site visit + recurring contract**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Cleaning & facilities product/dashboard specification](../cleaning.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing jobs/orders for visits; proposed typed cleaning contract facts in growth opportunity/artifacts. Do not misuse equipment as a site or enable membership operations globally.

Existing files to inspect and extend only as required:

- [convex/hasib/jobsState.js](../../convex/hasib/jobsState.js)
- [convex/hasib/membershipsState.js](../../convex/hasib/membershipsState.js)
- [src/components/hasib/JobsWorkView.jsx](../../src/components/hasib/JobsWorkView.jsx)

Existing operations / explicit gaps: **job_create, job_estimate, job_approve, job_status, job_repeat, equipment_save where appropriate; memberships are not currently enabled for cleaning**.

Own these **proposed new** sector files:

- `config/ascend-growth/cleaning.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/cleaning.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/cleaning.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-cleaning-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Local service search, property/facility-manager partners, client referrals and permitted business-account research.
- **Offer / next action:** An available standard visit or scoped site assessment/recurring quote.
- **Deterministic fit:** Site type/area, location, frequency, access/time, scope and crew capacity.
- **Verified conversion sequence:** Accepted visit/contract → completed quality-accepted first service.
- **Repeat/referral route:** Recurring-contract renewal, quality-confirmed referrals and permitted lapsed-client recovery.
- **First experiment:** Compare general inquiry with site-type/scope/location-specific scheduling or survey; judge quality-accepted first services and recurring contracts separately. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L18, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Consumer one-off and commercial contracts need separate funnels; no underpriced automated bid from incomplete site scope.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| siteRef / siteType / areaSqm | owned site reference; enum home/office/commercial; number>0 | site profile new typed facts with restricted access details |
| scopeChecklist | array≤20 approved task IDs | separate included tasks/exclusions |
| frequency | one_off/weekly/fortnightly/monthly/custom; explicit interval if custom | contract policy, not inferred recurrence |
| accessWindow / accessEvidence | UTC interval and restricted reference | never place lock codes in messages/logs |
| crewSkills / durationMinutes | approved skills; integer15..1440 | crew availability plus travel buffers |
| qualityEvidence / contractVersion | recorded checklist/client issue evidence; integer≥1 | completion, redo and renewal source |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'cleaning'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Create one job per agreed service occurrence. Reserve crew and equipment atomically, respect site access. Completion requires actual checklist evidence; unresolved complaint pauses promotional/referral asks, creates redo linked to original without new acquisition revenue.

**Mutation/event wiring:** Site inquiry→quote; accepted scope→visit schedule; completed quality check→service conversion; recurring contract→next occurrence by unique contract+date key; complaint→recovery; renewal offer only from current contract expiry.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `cleaning.site_request` | Customer gives service/site requirements | MISSING_INPUT then QUOTE | Nonstandard site hazards go to supervisor |
| `cleaning.contract_confirmed` | Accepted scope/price and valid recurring terms | EV plus PRE_EVENT | Retries cannot duplicate recurring visits |
| `cleaning.access_missing` | Access evidence missing before visit cutoff | CHECKPOINT | Never broadcast access codes or mark visit complete |
| `cleaning.crew_arrived` | Field app or crew confirms arrival | EV optional | No arrival inference from schedule |
| `cleaning.checklist_complete` | Crew supplies required task facts | EV optional | A crew checklist alone is not inspection acceptance |
| `cleaning.inspection_failed` | Verified defect and severity | RECOVERY plus PRE_EVENT | No automatic blame, safety certification or pathogen claim |
| `cleaning.visit_accepted` | Authorized inspection/acceptance event | EV plus BALANCE | Correction cost stays linked to original work |
| `cleaning.renewal_due` | Contract term reaches renewal window | RENEWAL | Changed scope/rate outside policy becomes exception |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Qualify the site, schedule allowed service, collect access details, notify arrival/completion, recover quality complaints and coordinate renewal.
**Hasib:** Generate recurring visits, reserve crews, monitor checklists and independent inspections, create corrective tasks, allocate contract revenue/costs and track renewals.
**Necessary human/source input:** Crew perform cleaning and capture factual access/completion/checks when not integrated. Supervisors decide unsafe-site, chemical/method and disputed-quality exceptions; their judgment is not replaced by customer-chat inference.

One-time standing configuration: site scopes/checklists; contract prices; crew skills/capacity; travel buffers; access handling; inspection standards; corrective-visit entitlement; renewal terms. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Human input is actual access, completed tasks and quality exceptions. Route optimization is optional later; initial deterministic schedule must include travel buffers and no conflicting crews.**

## 5. Six-tab UI wiring

Keep Chats · **Site visits / زيارات المواقع** · Customers · Broadcasts · Insights · Settings. Default Work view: **Crew and site schedule**. Exactly these permanent Work secondary views: **Schedule · Sites · Contracts · Follow-ups**.

Primary action: **New site visit**. Main row shows **Site, visit window, crew, access status, checklist/inspection state, owner**. Filters: **Access missing · Visit due · Inspection failed · Renewal due**. Details include **Approved site scope; access; visit checklist; independent inspection/correction**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Site/contract type; crew capacity; defect type; recurring vs one-off**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B09.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B09.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B09.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B09.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B09.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B09.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B09.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B09.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B09.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../cleaning.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time completed visits | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · First-pass inspection acceptance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Open quality exceptions | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Visit contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Checklist completion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Reclean rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Crew productive-time share | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Contract renewal | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per first quality-accepted service; quote-to-contract; recurring retention; contribution after corrective work**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Weekly contract has4 visits. Scheduler retries creation of visit2, crew loses access, customer requests redo after completion. Existing payment covers all4.

**Assert exact business results:** Exactly4 planned occurrences, not5; blocked access does not count completed; redo links original with no extra acquisition conversion; payment allocated once; renewal stops after cancellation.

Additional sector acceptance requirements from the operating specification:

1. A recurring contract generates one visit per occurrence and automatically handles access reminders.
2. Failed inspection creates a corrective visit and updates costs without requiring manual follow-up setup.
3. Accepted correction stops the complaint sequence and prevents duplicate customer notices.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-cleaning-growth.test.mjs
node --test tests/hasib-jobs.test.mjs tests/hasib-industry-journeys.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B09-cleaning.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
