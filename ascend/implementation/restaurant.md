# Restaurants: agent build specification

Task **B14** · sector ID `restaurant` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `orders`; implementation family: **order + proposed reservation adapter**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Restaurants product/dashboard specification](../restaurant.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Orders/food controls exist. Add typed reservation/catering payload and shared reservations, or explicitly extend bookings with restaurant-only tests; do not pretend generic booking operations already work here.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [convex/hasib/restaurantState.js](../../convex/hasib/restaurantState.js)
- [src/components/hasib/RestaurantControls.jsx](../../src/components/hasib/RestaurantControls.jsx)
- [src/components/hasib/OrdersView.jsx](../../src/components/hasib/OrdersView.jsx)

Existing operations / explicit gaps: **Existing order_create/order_status/payment_record/recipe_save; restaurant is not in the current booking-operation allowlist**.

Own these **proposed new** sector files:

- `config/ascend-growth/restaurant.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/restaurant.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/restaurant.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-restaurant-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Social/Google discovery, direct reservations/orders, local partnerships and guest referrals.
- **Offer / next action:** A real table/time, clear menu/order, or scoped catering option.
- **Deterministic fit:** Party/date/time for reservations; basket/address for delivery; guest count/date for catering; verify capacity.
- **Verified conversion sequence:** Attended reservation or fulfilled order; catering also requires accepted scope/deposit.
- **Repeat/referral route:** Opted-in preference-based invitations, actual repeat-visit rewards and permitted occasion offers.
- **First experiment:** Compare the existing generic social destination with direct date/party or order-context entry; judge attended covers/fulfilled orders with the service modes kept separate. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L10, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: UAE findings are regionally useful but not Omani top-decile proof; retain permission and true POS spend coverage.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| intent | enum reservation/delivery/pickup/catering | separate lifecycle/required fields by intent |
| partySize / startsAt / durationMinutes | integer1..1000; UTC ms; bounded duration | table/zone capacity for reservations |
| basket / deliveryAddressRef | existing typed order lines and served address | order route only |
| cateringScope / guestCount / depositEvidence | versioned menu/scope; integer>0; ledger reference | catering route only |
| allergenRequest / venueRef | declared requirement and owned outlet/location | approved preparation policy; no medical guarantees |
| attendanceEvidence | host/POS-confirmed seating reference | reservation conversion independent from fulfilled takeaway |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'restaurant'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Implement capacity-bearing reservation lifecycle proposed requested→held→confirmed→seated→completed, with cancelled/missed and hold expiry. Lock table/zone capacity atomically. An order route never waits for reservation fields. Catering acceptance/deposit must precede resource commitment.

**Mutation/event wiring:** Reservation confirmed→PRE_EVENT, reschedule cancels old reminder, seating records attended milestone. Order ready/delivered uses actual fulfillment. Catering quote/acceptance uses versioned scope; expired offers stop. Feedback only after actual service.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `restaurant.reservation_requested` | Party size and time verified | MISSING_INPUT; SLOT_OFFER | Expired hold releases capacity once |
| `restaurant.reservation_confirmed` | Accepted slot and required deposit | EV; PRE_EVENT | Reschedule supersedes old slot jobs |
| `restaurant.slot_released` | Actual cancellation or released hold | SLOT_OFFER | One acceptance wins; no double booking |
| `restaurant.order_accepted` | Confirmed menu lines and table/delivery link | EV; SLA | Menu revision cannot silently change accepted price |
| `restaurant.kitchen_delayed` | Verified delay or promise breached | EV on material change; NO_PROGRESS internal | Do not spam unchanged delay messages |
| `restaurant.ready_dispatched` | KDS ready plus courier acceptance where required | EV; DELIVERY_DUE | Ready is not dispatched; dispatched is not delivered |
| `restaurant.service_completed` | Table closure or delivered proof | FEEDBACK; BALANCE | Open complaint suspends retention messages |
| `restaurant.missed_or_complaint` | Verified no-show or customer complaint | RECOVERY once | No automatic punitive fee without valid agreed policy |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Handle reservations, waitlist offers and changes, collect structured orders, communicate verified kitchen/delivery status and resolve routine service questions within the approved policy.
**Hasib:** Allocate tables or slots atomically, sync reservation/POS identities, schedule reminders, route preparation and dispatch tasks, reconcile checks/payments and compute service/food economics.
**Necessary human/source input:** Seat, cook and serve; capture missing actual service/quality facts. A qualified staff member resolves allergen uncertainty, food safety incidents and compensation outside standing limits.

One-time standing configuration: service periods/table capacity and turn assumptions; deposits; waitlist priority; order/menu prices; kitchen cutoffs; delivery coverage; substitution/compensation authority. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Direct booking/reservation acquisition is a target requiring the missing adapter. Do not describe restaurant reservation integration as live just because a channel strategy recommends it.**

## 5. Six-tab UI wiring

Keep Chats · **Orders / الطلبات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Kitchen fulfillment queue**. Exactly these permanent Work secondary views: **Queue · Order history · Menu · Follow-ups**.

Primary action: **New order**. Main row shows **Order/channel, promised time, preparation stage, issue flag, handoff state**. Filters: **Preparing · Late · Ready · Catering**. Details include **Order and recipe version; kitchen events; incidents/refunds; channel costs**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Service mode; sales channel; menu group; shift/daypart**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B14.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B14.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B14.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B14.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B14.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B14.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B14.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B14.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B14.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../restaurant.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time fulfillment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Order contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Recorded food waste cost | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Problem-order rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Preparation time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Food cost ratio | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Prime cost ratio | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Catering quote conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended new guest/fulfilled first order; channel contribution; no-show-adjusted acquisition cost; repeat spend**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** A4-seat resource gets concurrent parties3 and2 in same slot. One confirmed party cancels; pickup order total20000 fulfills. Catering100000 quote expires before acceptance.

**Assert exact business results:** No capacity oversell; cancellation releases hold; pickup conversion does not count as attended reservation; expired catering quote refused; ingredients/expiry/waste still follow existing food controls.

Additional sector acceptance requirements from the operating specification:

1. Concurrent waitlist acceptances cannot claim the same last table.
2. A reservation time change cancels both old reminders and recalculates capacity.
3. Delivery delay, restaurant completion and actual payment remain distinct facts and metrics.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-restaurant-growth.test.mjs
node --test tests/hasib-restaurant.test.mjs tests/hasib-food-correctness.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B14-restaurant.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
