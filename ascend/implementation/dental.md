# Dental clinics: agent build specification

Task **B06** · sector ID `dental` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `orders`; implementation family: **restricted booking**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Dental clinics product/dashboard specification](../dental.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing bookings/services and restricted contact handling. Dental's current ownerUi workflow is orders despite booking operations; explicitly route new Visits shell to booking adapter rather than inheriting orders.

Existing files to inspect and extend only as required:

- [convex/hasib/bookingsState.js](../../convex/hasib/bookingsState.js)
- [convex/hasib/serviceSync.js](../../convex/hasib/serviceSync.js)
- [convex/blueContacts.js](../../convex/blueContacts.js)
- [src/components/hasib/BookingWorkView.jsx](../../src/components/hasib/BookingWorkView.jsx)
- [config/clinic-safety.js](../../config/clinic-safety.js)

Existing operations / explicit gaps: **services_sync, booking_create, booking_update, booking_status, waitlist_add, waitlist_book, payment_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/dental.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/dental.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/dental.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-dental-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Local service discovery, accurate practice listings and patient-initiated referrals.
- **Offer / next action:** An administrative appointment for a service the practice actually offers.
- **Deterministic fit:** Service, branch, provider availability, requested time and verified patient/guardian contact; clinical suitability stays with clinicians.
- **Verified conversion sequence:** Confirmed new-patient visit → verified attendance.
- **Repeat/referral route:** Clinician-set recall, permitted reactivation and voluntary referrals after service.
- **First experiment:** Compare the existing contact path with an explicit administrative service/branch/available-time path; judge attended new-patient visits and booking abandonment. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L06, P01, P03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Do not send health-related conversion data to prohibited ad destinations or rank access by expected treatment spend.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| serviceId / branchRef | owned catalog references | administrative service intent only |
| preferredWindows | array≤5 UTC intervals | availability from real clinician/chair capacity |
| newPatient / guardianRef | boolean and verified guardian contact optional | guardian only when applicable; no inferred age |
| providerRequirement | approved service/resource rule | professional suitability remains external evidence |
| recallDueAt / recallEvidence | UTC ms plus professional/source-system reference | AI must not prescribe recall timing |
| contactPermission | purpose-scoped communication evidence | separate care reminders from marketing consent |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'dental'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Reuse booking capacity and state rules; verify provider/chair resource compatibility. Restricted text policy and current contact sanitization must persist. No clinical diagnosis, treatment recommendation or urgency ranking by marketing score. Clinician-directed recall evidence is necessary before recall cadence.

**Mutation/event wiring:** Appointment confirmed/rescheduled/missed/attended emit administrative events. Queue reminders from current booking and guardian/contact permission. Recall due supplied by approved source queues a booking invitation. Keep symptoms and procedure details out of attribution/ad exports.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `dental.administrative_request` | Verified scheduling intent | MISSING_INPUT | No clinical note extraction into ordinary tasks |
| `dental.slot_selected` | Valid slot and customer acceptance | EV plus PRE_EVENT | Resource conflict yields alternate slots |
| `dental.reschedule` | Verified customer requests an allowed change | EV plus regenerated PRE_EVENT | Cancel old reminder version |
| `dental.arrival_or_completion` | Practice system or staff records factual visit outcome | EV optional | No AI diagnosis or treatment-completion assumption |
| `dental.missed_visit` | Staff or authoritative attendance process confirms missed status | RECOVERY | Stop on booking, reply, decline or staff hold |
| `dental.recall_due` | Clinician-authorized recall date exists | RENEWAL adapted to staff-set date | No invented treatment interval or medical urgency |
| `dental.charge_due` | Authorized charge and due date with current unpaid balance | BALANCE | Pause on dispute/payment reversal; avoid clinical details |
| `dental.customer_reply` | Verified response on active administrative task | EV or cancelled sequence | Do not cancel every unrelated future appointment |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Handle administrative inquiry, book permitted slots, confirm/reschedule, recover missed appointments and remind on clinician-set dates using neutral wording.
**Hasib:** Map dental order-backed visits correctly, reserve chair/provider resources, deduplicate attendance, create administrative tasks, allocate verified payments and calculate reception metrics.
**Necessary human/source input:** Record arrival/completion when no check-in integration exists; clinicians perform care and decide treatment/recall/urgency. Reception handles ambiguous identity, exceptional scheduling and disputes only.

One-time standing configuration: administrative service catalog; provider/chair capacity; appointment duration; cancellation/no-show rules; neutral templates; clinician-set recall sources; fee schedules and billing authority. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Reuse current dental text retention/sanitization rather than copying raw conversation into facts. No requirement for real patient messages in tests.**

## 5. Six-tab UI wiring

Keep Chats · **Visits / الزيارات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Day schedule**. Exactly these permanent Work secondary views: **Schedule · Visit list · Services · Follow-ups**.

Primary action: **Add visit**. Main row shows **Visit time, patient reference, provider, administrative status, next action**. Filters: **Today · Unconfirmed · Missed · Follow-up due**. Details include **Administrative visit details; attendance; approved charges; staff-set follow-ups**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Provider; service group; new vs returning patient; time of day**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B06.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B06.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B06.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B06.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B06.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B06.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B06.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B06.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B06.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../dental.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Visit attendance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Missed visits | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Administrative follow-ups due | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Overdue visit balances | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Available-chair utilization | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Late-cancellation rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Recall completion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Charge collection | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended new-patient visit; booking/attendance rates; recall return rate; permitted aggregate acquisition cost**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** New patient has a confirmed visit, reschedules, arrives and completes. A recalled patient has no professionally recorded recall date. A minor's guardian contact is missing.

**Assert exact business results:** One verified attended-new-patient conversion; no stale reminder; no inferred recall job; guardian-dependent flow stays needs_input; clinical text excluded from source metadata/logs/ads; appointment click produces0 attended conversions.

Additional sector acceptance requirements from the operating specification:

1. Book and reschedule an administrative visit through Layla; no separate staff task creation or reminder approval occurs within policy.
2. The dental order adapter produces correct attendance with an empty generic bookings table.
3. A clinical question reaches qualified staff without creating a guessed recall date or clinical recommendation.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-dental-growth.test.mjs
node --test tests/hasib-dental.test.mjs tests/dental-journeys.test.mjs tests/dental-layla.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B06-dental.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
