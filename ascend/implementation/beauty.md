# Beauty & salons: agent build specification

Task **B05** · sector ID `beauty` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `bookings`; implementation family: **resource booking**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Beauty & salons product/dashboard specification](../beauty.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing hasibBookings/resources/services and order payments. Add typed service-skill policy, deposit and rebooking evidence links; no duplicate calendar.

Existing files to inspect and extend only as required:

- [convex/hasib/bookingsState.js](../../convex/hasib/bookingsState.js)
- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [src/components/hasib/BookingWorkView.jsx](../../src/components/hasib/BookingWorkView.jsx)

Existing operations / explicit gaps: **resources, services, booking_create, booking_update, booking_status, waitlist_add, waitlist_book, payment_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/beauty.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/beauty.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/beauty.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-beauty-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Service-specific local discovery, visual proof with permission, referrals and social-to-booking.
- **Offer / next action:** An available service/provider slot and transparent terms.
- **Deterministic fit:** Service, preferred time/location, provider skill and resource availability; professional suitability remains separate.
- **Verified conversion sequence:** Confirmed appointment → attended paid visit.
- **Repeat/referral route:** Policy-approved packages, customer-chosen rebooking and measured completed repeat visits.
- **First experiment:** Compare generic inquiry with real provider/service slot selection; judge attended first visits and completed returns, not rebooking volume. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L02, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Do not celebrate calendar inflation or infer suitability; sensitive procedures need separate audience/export review.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| serviceId / locationRef | owned service/location refs | service duration from catalog |
| providerPreference / skillRequirement | owned resource optional; approved skill tag | do not offer unqualified staff |
| startsAt / flexibility | UTC ms and bounded allowed alternatives | resource includes room/equipment buffers |
| depositPolicy / depositEvidence | approved policy ref and ledger link | required deposit before confirmation if policy says so |
| professionalSuitability | unknown/cleared/requires_review plus evidenceRef | professional input; AI cannot clear treatment suitability |
| rebookIntervalDays | integer1..365 from approved service policy | due date derived from completed visit, not inquiry |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'beauty'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Use current booking states scheduled/confirmed/arrived/in_service/completed/missed/cancelled and capacity validation. A cancelled or missed visit must not count as attended. Auto-rebooking offers valid slots but requires customer acceptance. Professional suitability cannot be inferred from intake completeness.

**Mutation/event wiring:** Confirmation/reschedule queues PRE_EVENT; completed visit plus service interval schedules a one-time rebooking invitation using a tenant-configured CHECKPOINT followed by EV; no-show queues one recovery offer under consent; waitlist capacity release creates a time-limited offer with atomic winner.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `beauty.service_inquiry` | Customer selects known service | MISSING_INPUT | Suitability uncertainty routes to qualified provider |
| `beauty.slot_accepted` | Valid customer choice plus deposit condition | EV plus PRE_EVENT | Expired holds release once |
| `beauty.deposit_received` | Verified receipt | EV | Customer payment claim alone cannot confirm |
| `beauty.rescheduled` | Valid change inside configured rules | EV plus PRE_EVENT | Exceptions to fee/cancellation policy are surfaced |
| `beauty.attended_complete` | POS/check-in/service completion facts | EV plus FEEDBACK optional | Package purchase and redemption cannot double revenue |
| `beauty.missed` | Verified no-show outcome | RECOVERY | Do not impose an unapproved penalty automatically |
| `beauty.rebooking_accepted` | Customer accepts suitable future visit | PRE_EVENT | Cancel old sales reminders without cancelling valid appointment reminders |
| `beauty.package_expiring` | Authoritative credit/expiry ledger | RENEWAL | No inferred treatment interval or misleading unused credit |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Answer approved service questions, book/reschedule, request deposits, coordinate waiting slots, offer customer-appropriate rebooking and explain verified package balances.
**Hasib:** Reserve staff/room resources, apply valid credits, schedule confirmations, reconcile attendance and charges, calculate utilization/retention, and update all linked tasks.
**Necessary human/source input:** Record service arrival/completion or cash receipt if not electronically captured. Practitioners determine suitability and perform services. Managers handle policy exceptions and disputes only.

One-time standing configuration: service catalog/durations; staff/resource schedules; booking/deposit and cancellation rules; package credits; standard prices; customer-selected rebooking cadence; medical-aesthetic referral boundary. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Expose provider utilization using available staffed minutes, not24h/day. Separate service revenue from retail sales and deposit receipts in Insights.**

## 5. Six-tab UI wiring

Keep Chats · **Bookings / الحجوزات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Staff day schedule**. Exactly these permanent Work secondary views: **Schedule · Booking list · Services · Follow-ups**.

Primary action: **New booking**. Main row shows **Time, client, service, provider/resource, confirmation, next action**. Filters: **Today · Unconfirmed · Gaps · Rebooking due**. Details include **Booking/resource; attendance; package/charge; linked return booking**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Service group; staff capacity; client cohort; booked vs attended**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B05.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B05.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B05.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B05.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B05.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B05.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B05.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B05.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B05.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../beauty.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Attended utilization | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · No-show rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Realized repeat visits | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Service contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Same-day rebooking | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Rebooking realization | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Average completed ticket | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Late-cancellation rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended new client; attended utilization; rebooked-to-returned conversion; cancellation-adjusted retention**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** One stylist has a60min slot; two clients accept it concurrently. Confirmed customer reschedules and attends; deposit10000 is part of30000 service total, not extra revenue.

**Assert exact business results:** One booking per actual capacity; old reminder cancelled; one attended new-customer conversion; total revenue30000; only completed visit starts rebook clock; no clinical claims in messages.

Additional sector acceptance requirements from the operating specification:

1. A standard booking, deposit confirmation and reminder sequence runs without receptionist approval per message.
2. The last room slot cannot be allocated to two staff bookings.
3. A future booking later cancelled remains a rebooking event but never counts as realized retention.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-beauty-growth.test.mjs
node --test tests/hasib-bookings.test.mjs tests/hasib-industry-journeys.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B05-beauty.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
