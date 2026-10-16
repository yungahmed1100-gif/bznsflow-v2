# Travel & hospitality: agent build specification

Task **B22** · sector ID `travel` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new supplier-backed booking case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Travel & hospitality product/dashboard specification](../travel.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New travel booking case, supplier quote/hold/confirmation artifacts, traveler references and cancellation ledger linkage; supplier remains inventory authority.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order_create/payment_record; proposed case/artifact/reservation operations; supplier connector separate**.

Own these **proposed new** sector files:

- `config/ascend-growth/travel.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/travel.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/travel.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-travel-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Destination/intent content, search, repeat-client referrals, and for hotels a balanced mix of direct and partner distribution.
- **Offer / next action:** A current itinerary/room offer with complete conditions and expiry.
- **Deterministic fit:** Dates, travelers/rooms, destination, preferences and current supplier/PMS availability; collect documents securely later.
- **Verified conversion sequence:** Supplier-confirmed issued booking or confirmed stay → completed travel/stay.
- **Repeat/referral route:** Customer-chosen future travel dates, returning-guest offers and permitted referrals.
- **First experiment:** For the selected subtype, compare generic inquiry with a currently available offer and transparent terms; judge completed stays/trips and net contribution. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L15** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Hotel evidence is not travel-agency proof; never treat a local payment or expired quote as a supplier confirmation.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| productType / destination | enum package/hotel/tour/flight_service; destination ref | avoid assuming ticketing integration |
| departureAt / returnAt / travelers | UTC dates; traveler counts by relevant age band | collect identity documents only in secure later flow |
| budgetMinor / preferences | stated amount and bounded non-sensitive preferences | supplier price timestamp/currency |
| supplierQuoteId / expiresAt / holdId | owned supplier refs and UTC expiry | current availability/reprice evidence |
| cancellationPolicyVersion / acceptedAt | immutable terms revision and customer evidence | changes require new acceptance |
| issuedConfirmation / documentChecklist | supplier-issued evidence ref and authorized checklist result | AI cannot guarantee visas/entry eligibility |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'travel'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed inquiry→quoted→held→accepted→supplier_pending→confirmed→in_travel→completed→closed; cancelled/refund_pending/reconciled tracked. Customer payment alone is not supplier confirmation or ticket issuance. Quote expiry forces availability/reprice recheck; no blind retry of ambiguous supplier booking.

**Mutation/event wiring:** Complete trip brief→QUOTE; supplier confirmation→PRE_EVENT/checklist; schedule change→verified update; travel completion→feedback; refund lifecycle reconciles supplier and customer payments; optional renewal/next trip marketing only with permission.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `travel.trip_request` | Dates, party and preferences | MISSING_INPUT | No sensitive document in ordinary task notes |
| `travel.offer_issued` | Timestamped supplier offer and terms | QUOTE within offer expiry | Reprice expired offers before acceptance |
| `travel.accepted_payment` | Consent to exact version and verified payment condition | EV; SLA for unconfirmed booking | Ambiguous supplier timeout requires lookup, not second purchase |
| `travel.ticketed` | Supplier ticket/voucher issuance | EV; PRE_EVENT | Booking hold is not ticket issuance |
| `travel.documents_due` | Confirmed itinerary checklist and deadline | REVIEW | No guarantee of admission or visa from checklist completion |
| `travel.schedule_changed` | Authoritative supplier change | EV; REVIEW | Cancel old itinerary reminders |
| `travel.cancel_refund` | Accepted cancellation within terms or exception decision | CHECKPOINT; EV on actual settlement | Refund requested is not money returned |
| `travel.trip_closed` | Verified completion/cancellation outcome | FEEDBACK | Active disruption/claim pauses promotional outreach |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Gather itinerary requirements, explain current sourced options and terms, request missing traveler details securely, communicate confirmed bookings and schedule changes, and track document readiness.
**Hasib:** Version itineraries/quotes, revalidate supplier offers, manage holds and payment deadlines, reconcile supplier booking/ticket statuses, schedule trip preparation and track refunds/commissions.
**Necessary human/source input:** Resolve unsupported supplier operations and exceptional travel/document judgments; enter verified facts where suppliers provide no integration. AI does not guarantee visas, entry or a booking from a quote alone.

One-time standing configuration: supplier availability and fare freshness; booking holds; traveler verification; cancellation/change terms; agency fee authority; payment deadlines; document checklist and support scope. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Travel agency, tour operator and accommodation variants need selected subtype; hotel benchmarks inform a route but do not prove all travel operations share a PMS or cancellation policy.**

## 5. Six-tab UI wiring

Keep Chats · **Bookings / الحجوزات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Upcoming-trip readiness list**. Exactly these permanent Work secondary views: **Bookings · Quotes · Suppliers · Follow-ups**.

Primary action: **New travel inquiry**. Main row shows **Trip/stay dates, customer, quote expiry, supplier confirmation, balance, readiness**. Filters: **Quote expiring · Supplier pending · Departing soon · Refund pending**. Details include **Accepted offer; supplier evidence; itinerary/checklist; payments/refunds**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Agency vs lodging; trip type; supplier; booking lead time**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B22.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B22.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B22.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B22.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B22.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B22.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B22.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B22.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B22.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../travel.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Quote-to-confirmed booking | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Awaiting supplier confirmation | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Booking contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Upcoming balances due | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Refund turnaround | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Pre-arrival readiness | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Hotel occupancy — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Hotel ADR / RevPAR — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per completed booking/stay; net contribution after commission/refunds; quote-to-confirmed; cancellation-adjusted channel yield**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Supplier quote50000 expires; refreshed price55000. Customer paid50000 but supplier times out after possible acceptance. Cancellation later returns40000.

**Assert exact business results:** No false confirmed booking; uncertain supplier effect reconciled before resubmit; repricing needs acceptance; refunds40000 linked once; original50000 cash not automatically earned revenue; documents excluded from analytics.

Additional sector acceptance requirements from the operating specification:

1. A supplier timeout after booking triggers reconciliation without buying a second ticket.
2. Expired fare acceptance requires a refreshed offer and new customer consent.
3. Flight changes invalidate old reminders; a pending refund never appears as settled cash.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-travel-growth.test.mjs
node --test tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B22-travel.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
