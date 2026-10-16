# Retail & e-commerce: agent build specification

Task **B04** · sector ID `retail` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `orders`; implementation family: **order + stock**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Retail & e-commerce product/dashboard specification](../retail.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing hasibOrders, variants/stock and product requests. No new fulfillment ledger.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [convex/hasib/requestsState.js](../../convex/hasib/requestsState.js)
- [convex/hasib/stock.js](../../convex/hasib/stock.js)
- [src/components/hasib/OrdersView.jsx](../../src/components/hasib/OrdersView.jsx)
- [src/components/hasib/ProductRequests.jsx](../../src/components/hasib/ProductRequests.jsx)

Existing operations / explicit gaps: **items, stock_moves, product_request_create, product_request_status, order_create, order_status, payment_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/retail.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/retail.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/retail.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-retail-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Product/category search, approved catalogs/feeds, social product content and customer referrals.
- **Offer / next action:** Verified variant availability and a short, transparent checkout.
- **Deterministic fit:** Variant/quantity, fulfillment, address and live stock; use budget only when needed to select options.
- **Verified conversion sequence:** Confirmed order → fulfilled first purchase, adjusted for returns.
- **Repeat/referral route:** Consent-based replenishment, complementary products, loyalty and lapsed-customer recovery.
- **First experiment:** Compare the current product entry with a stock-verified variant and transparent total before checkout; judge fulfilled new-customer contribution after returns. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L11, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: No false scarcity, stale stock or reuse of a shopping inquiry as blanket marketing consent.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| variantId / qty | owned variant ID; integer1..1000 | existing order lines |
| fulfilment | pickup/delivery; area/address reference only when needed | existing fulfillment fields |
| requestedAt / budgetMinor | UTC ms; optional stated budget integer≥0 | don't ask budget for fixed-price checkout |
| substitutionPreference | enum none/ask/approved_equivalent | explicit customer choice, never automatic higher price |
| stockRequestId | owned product request ID optional | waitlist source; no inventory reservation claim without stock evidence |
| returnEvidence | owned order/return reference | reverse acquisition revenue and affected outcome |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'retail'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Confirm price, available variant quantity, stock reservation and fulfillment coverage through existing order rules. Product request is interest, not an order. Restock can offer a purchase, not charge or confirm without acceptance. Refund/return adjusts conversion value with ledger evidence.

**Mutation/event wiring:** Emit first_order_confirmed, fulfilled, payment_recorded, cancelled, returned and requested_variant_restocked. Cancel abandoned-order follow-ups on payment or cancellation. Restock offers filter by requested exact variant and unfulfilled demand, with one offer per stock epoch.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `retail.product_request` | Verified desired product/variant | MISSING_INPUT | Do not promise stale or reserved stock |
| `retail.checkout` | Accepted basket and valid address | EV; QUOTE if allowed abandoned basket | Hold expires or basket changes invalidate jobs |
| `retail.confirmed` | Verified required payment/credit condition | EV; DELIVERY_DUE | Payment claims are not settlement |
| `retail.shipped_ready` | Warehouse ready or carrier acceptance | EV; COLLECTION for pickup | Use the correct service mode |
| `retail.delivery_exception` | Authoritative failed delivery or changed promise | RECOVERY; DELIVERY_DUE | Never reuse an obsolete address after correction |
| `retail.return_requested` | Order-linked request within policy | REVIEW | Exception routes to decision owner without unrelated queue blocking |
| `retail.return_received` | Inspection and receipt facts | EV; BALANCE only for real remaining obligation | Refund initiated is not settled |
| `retail.back_in_stock` | New saleable stock event matches permitted request | BACK_IN_STOCK | Stop on decline, fulfillment, stock loss or expiry |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Match requirements to available catalog items, handle routine checkout and order questions, request missing address details, send verified fulfillment updates and explain eligible return options.
**Hasib:** Reserve exact variants, compute authorized totals, create/reconcile orders, manage fulfillment and return obligations, update stock only from valid events and calculate margin/cohort metrics.
**Necessary human/source input:** Perform picking/packing and condition inspection where no trusted scan/system exists. Only unusual damage, fraud indicators, out-of-policy discounts/refunds and data discrepancies need case decisions.

One-time standing configuration: catalog/variant prices; stock reservation and hold duration; discount authority; shipping promises; return eligibility; refund/payment authority; loyalty and marketing rules. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Use reorder alerts and requested-item demand in Work; acquisition segments in Customers. Never generate broadcast audiences solely from import presence without purpose eligibility.**

## 5. Six-tab UI wiring

Keep Chats · **Orders / الطلبات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Fulfillment list**. Exactly these permanent Work secondary views: **Orders · Products & stock · Requests · Follow-ups**.

Primary action: **New order**. Main row shows **Order/customer, variants, reservation state, promise, balance, fulfillment**. Filters: **Unconfirmed · Picking · Ready · Overdue**. Details include **Line items; stock/lot allocations; delivery/pickup; returns and payments**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Category/variant; channel; new vs repeat customer; stock age**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B04.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B04.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B04.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B04.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B04.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B04.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B04.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B04.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B04.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../retail.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time fulfillment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Stock held beyond age limit | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Order gross margin | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Unfilled product requests | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Inventory turnover | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Available-stock sell-through | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Return rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Repeat purchase | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per fulfilled new customer; net contribution after returns/discounts; checkout completion; repeat purchase within W**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Two customers attempt the last unit; one succeeds. A waitlisted contact opts out before stock arrives. First purchaser returns a10000 order after source conversion was recorded.

**Assert exact business results:** No negative stock; one fulfilled conversion initially; opted-out restock sends0; return reverses10000 revenue and adjusts cohort result without deleting attribution history.

Additional sector acceptance requirements from the operating specification:

1. Concurrent checkout cannot oversell the last variant.
2. A returned unit restores the correct cost/stock state exactly once and keeps original revenue history.
3. Opt-out cancels replenishment marketing without erasing legitimate order support records.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-retail-growth.test.mjs
node --test tests/retail-journeys.test.mjs tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B04-retail.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
