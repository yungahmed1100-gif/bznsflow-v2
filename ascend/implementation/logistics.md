# Logistics & delivery: agent build specification

Task **B21** · sector ID `logistics` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new shipment case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Logistics & delivery product/dashboard specification](../logistics.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New shipment case with quote, consignments, normalized tracking events and proof of delivery; optional provider adapter port, not a simulated live carrier feed.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order_create/payment_record; proposed case/artifact operations plus authenticated tracking ingestion**.

Own these **proposed new** sector files:

- `config/ascend-growth/logistics.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/logistics.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/logistics.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-logistics-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Lane/service search, shipper partnerships, permitted business-directory research and contract RFQs.
- **Offer / next action:** A source-backed rate and pickup option for a supported shipment/lane.
- **Deterministic fit:** Origin/destination, goods restrictions, size/weight, frequency, service level, deadline and available capacity.
- **Verified conversion sequence:** Accepted quote → first completed shipment → active shipping account.
- **Repeat/referral route:** Contract renewal, permitted reorder prompts and partner referrals.
- **First experiment:** Compare a generic sales form with lane/service-specific quote intake; judge activated shippers and completed-shipment contribution. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L14** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Company prospect discovery does not authorize messaging individuals; quote accuracy depends on actual lane/rate data.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| origin / destination | validated location refs and service lane | serviceability before quote |
| goodsClass / restrictions | approved enum and explicit declared restrictions | unknown restricted-goods status cannot be auto-cleared |
| weightGrams / dimensionsMm / pieces | positive bounded integers; dimensional calculation policy | quote from correct chargeable weight |
| pickupWindow / requiredDeliveryAt | UTC interval and deadline | carrier capacity/service level evidence |
| frequency / accountType | one_off/recurring; consumer/business | separate first shipment from account activation |
| carrierRef / trackingRef / providerSequence | owned connector/reference and ordered event evidence | protect cross-tenant webhook lookup |
| proofOfDelivery / disputeStatus | authorized evidence ref; none/open/resolved | delivered must come from carrier/recipient evidence |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'logistics'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed inquiry→quoted→accepted→booked→collected→in_transit→delivered→closed; exception/returned/cancelled preserve history. Provider tracking events have occurredAt and receivedAt; older scans cannot regress delivered. Invoice value is not shipment declared cargo value.

**Mutation/event wiring:** Lane-fit inquiry→QUOTE; acceptance→pickup booking; collected/transit/delivered events→customer updates only on meaningful changes; exception→one action request; first completed shipment→account conversion; repeat lane offers under policy.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `logistics.quote_request` | Validated lane, size and service | MISSING_INPUT; QUOTE | No unsupported lane promise |
| `logistics.pickup_booked` | Accepted quote and available capacity | EV; PRE_EVENT | Carrier rejection leaves unconfirmed booking visible |
| `logistics.picked_up` | Physical pickup scan | EV | Label created is not goods collected |
| `logistics.in_transit` | Normalized carrier scan and timestamp | EV on meaningful milestone; DELIVERY_DUE | Stale scan cannot imply current GPS position |
| `logistics.delivery_attempt` | Verified attempted delivery and reason | RECOVERY | Keep attempt distinct from delivered |
| `logistics.exception` | Carrier delay/loss/damage evidence | EV; CHECKPOINT | No invented arrival date or liability decision |
| `logistics.delivered` | Valid proof associated with shipment | EV; FEEDBACK | Dispute opens linked case without deleting proof/history |
| `logistics.claim_or_return` | Authorized claim/return request | REVIEW; BALANCE for verified invoice | Out-of-policy compensation needs case decision |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect complete shipment instructions, quote supported lanes, confirm pickup, answer tracking from authoritative scans and communicate delivery exceptions and corrected instructions.
**Hasib:** Validate addresses/rates/capacity, create one shipment identity, map carrier events, maintain promises and exception queues, reconcile proof, claims and cost/service KPIs.
**Necessary human/source input:** Move goods and capture physical scan/proof when devices do not; decide restricted-goods and exceptional loss/damage claims. Dispatchers handle unresolved routing constraints rather than manually sending every update.

One-time standing configuration: service lanes/cutoffs and rate cards; shipment restrictions; pickup capacity; promised delivery basis; exception SLAs; proof-of-delivery requirements; claims and compensation limits. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Live tracking requires signed carrier integration and reconciliation. Until connected, show timestamped source-entered updates and missing evidence, not fake real-time tracking.**

## 5. Six-tab UI wiring

Keep Chats · **Shipments / الشحنات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Shipment exception list**. Exactly these permanent Work secondary views: **Shipments · Dispatch · Exceptions · Follow-ups**.

Primary action: **New shipment**. Main row shows **Shipment, promise, latest verified scan, exception, assigned carrier, next action**. Filters: **Awaiting address · Pickup due · Delivery failed · POD missing**. Details include **Address/package; scan chronology; proof of delivery; claims/COD remittance**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Route/carrier; service level; failure cause; shipment size**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B21.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B21.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B21.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B21.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B21.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B21.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B21.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B21.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B21.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../logistics.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time in-full delivery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · First-attempt delivery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Unresolved exceptions | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Contribution per shipment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Proof-of-delivery coverage | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Perfect shipment rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Order-to-delivery cycle | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · COD remittance overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per activated shipper; quote-to-first-shipment; contribution after claims/fees; active-account retention**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Tracking delivered arrives before delayed in_transit scan; delivered webhook replays. Cargo declared value1000000, transport charge15000; one missing POD keeps confirmation uncertain.

**Assert exact business results:** No regression or duplicate delivery message; transport revenue15000 only; no verified delivered conversion without required POD; first completed shipment counted once per account acquisition; restricted goods block autoquote.

Additional sector acceptance requirements from the operating specification:

1. Out-of-order carrier scans cannot change delivered back to in transit.
2. Label creation never starts the pickup-to-delivery clock.
3. Duplicate delivery proof stops overdue messages exactly once while preserving late-delivery history.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-logistics-growth.test.mjs
node --test tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B21-logistics.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
