# Medical clinics: agent build specification

Task **B07** · sector ID `clinic` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `bookings`; implementation family: **clinic governance + booking**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Medical clinics product/dashboard specification](../clinic.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing clinicAppointmentRequests, clinicNotifications, preferences, governance, waitlist offers and bookings. Connect existing notification authority to shared outbox; never send twice.

Existing files to inspect and extend only as required:

- [convex/hasib/clinicState.js](../../convex/hasib/clinicState.js)
- [convex/hasib/bookingsState.js](../../convex/hasib/bookingsState.js)
- [config/clinic-safety.js](../../config/clinic-safety.js)
- [src/components/hasib/ClinicDashboard.jsx](../../src/components/hasib/ClinicDashboard.jsx)

Existing operations / explicit gaps: **clinic_governance, clinic_request_save, clinic_request_assign, clinic_request_book, clinic_preference_update, clinic_notification_queue, clinic_waitlist_offer, clinic_experience_save**.

Own these **proposed new** sector files:

- `config/ascend-growth/clinic.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/clinic.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/clinic.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-clinic-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Accurate provider/service discovery, appointment pages and authorized referral partners.
- **Offer / next action:** Available administrative appointment options.
- **Deterministic fit:** Service/provider/location/time and authorized scheduling criteria; clinical priority is supplied professionally.
- **Verified conversion sequence:** Confirmed appropriate appointment → verified attendance.
- **Repeat/referral route:** Approved recall/return scheduling and administrative continuity journeys.
- **First experiment:** Compare the current administrative booking request with verified available-time choices; judge access/attendance without changing clinical priority. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L07, P01, P03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Keep the clinic gate; no symptom-based ad audiences, automated clinical triage or generic customer-data export.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| serviceId / providerId / branchRef | owned refs; service scope validated | existing request and resource mapping |
| preferredFrom / preferredTo | UTC interval end>start | existing appointment request window |
| governanceStatus | server-derived clinic governance state | not writable through growth intake |
| operationalReminders | existing contact preference evidence | marketing consent remains separate |
| priority | source-issued administrative priority/evidence only | no AI triage or inferred condition |
| waitlistOfferId / expiresAt | owned current offer reference and UTC expiry | single capacity winner |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'clinic'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Clinic governance must satisfy existing guards before activation. Keep stricter clinic booking transitions: arrived→in_service→completed, no direct arrived→completed and no completed reversal through normal booking transition. Professional facts remain professional. Shared automation must respect clinic preference and existing queue state.

**Mutation/event wiring:** Request intake qualifies administratively, then calls clinic_request_book. Reuse clinic notification eligibility and offer expiry. Emit attended only from verified lifecycle evidence. Bridge clinicNotifications receipt/job ID to shared timeline without a second enqueue.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `clinic.request` | Administrative request from verified contact | MISSING_INPUT | Clinical intent is routed to staff, not autonomously triaged |
| `clinic.booking` | Customer selects available routine slot | EV plus PRE_EVENT | No double booking or inferred service suitability |
| `clinic.slot_cancelled` | Valid cancellation releases capacity | SLOT_OFFER | Exclude clinical prioritization unless staff supplies it |
| `clinic.offer_accepted` | Verified acceptance before expiry | EV | One slot has one winning reservation |
| `clinic.arrival` | Check-in or receptionist event | EV optional | Arrival is not clinical handoff |
| `clinic.handoff_completed` | Authorized reception/practice events | EV optional | No medical outcome inference |
| `clinic.missing_document` | Required administrative item remains absent | MISSING_INPUT | Do not request unnecessary health content |
| `clinic.missed_or_rescheduled` | Verified attendance outcome or allowed customer change | RECOVERY or PRE_EVENT | Staff restrictions override automatic rebooking |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Resolve administrative requests, book permitted visits, send confirmations and waiting-list offers, collect missing nonclinical details and answer reception-status questions.
**Hasib:** Reserve resources, maintain queue timestamps, allocate waiting-list offers atomically, calculate access/attendance measures and expire obsolete tasks.
**Necessary human/source input:** Enter physical arrival/handoff facts if not captured electronically. Qualified staff decide clinical urgency, suitability and medical actions. Reception handles identity conflicts and exceptional access only.

One-time standing configuration: approved administrative service list; provider/room availability; reception queue rules; waiting-list permissions; routine access reporting; neutral templates; fee/identity rules; clinic governance gate. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Preview availability is not clinical production approval. Document each governance dependency in readiness and block live activation separately from synthetic implementation.**

## 5. Six-tab UI wiring

Keep Chats · **Visits / الزيارات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Reception queue**. Exactly these permanent Work secondary views: **Queue · Schedule · Waiting list · Follow-ups**.

Primary action: **Book visit**. Main row shows **Scheduled time, patient reference, provider, arrival state, waiting duration**. Filters: **Arrived · Unconfirmed · Access pending · Waiting-list offers**. Details include **Administrative booking; reception timestamps; slot offer history; approved balances**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Provider/service; appointment type; access delay; appointment lead time**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B07.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B07.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B07.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B07.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B07.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B07.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B07.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B07.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B07.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../clinic.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Attendance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Unconfirmed upcoming visits | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Median reception wait | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Waiting-list fill rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Third-next-available routine appointment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Late cancellations | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Administrative request resolution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Overdue approved charges | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended new patient where measurable; access delay; inquiry-to-attendance; waitlist fill**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Two patients accept a single waitlist offer concurrently; a reminder is also visible in clinicNotifications. Governance becomes inactive before dispatch; a booking attempts arrived→completed.

**Assert exact business results:** At most one capacity reservation; exactly one delivery authority;0 sends after governance gate fails; invalid transition refused; metrics distinguish request, booked, arrived and completed.

Additional sector acceptance requirements from the operating specification:

1. Released slot → eligible offer → valid acceptance → confirmed appointment completes without reception copying records.
2. Simultaneous acceptances reserve the slot only once.
3. A medical-priority request stops administrative automation and creates a clinical handoff with minimal necessary context.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-clinic-growth.test.mjs
node --test tests/hasib-clinic.test.mjs tests/hasib-bookings.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B07-clinic.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
