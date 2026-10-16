# Electronics and phone store: agent build specification

Task **B01** · sector ID `retail-tech` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `orders`; implementation family: **repair + serialized sale**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Electronics and phone store product/dashboard specification](../retail-tech.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing hasibRepairs and hasibOrders remain authoritative. Extend repair evidence additively; no sector case for repairs or sales.

Existing files to inspect and extend only as required:

- [convex/hasib/repairsState.js](../../convex/hasib/repairsState.js)
- [convex/hasib/repairMachine.js](../../convex/hasib/repairMachine.js)
- [convex/hasib/serialsState.js](../../convex/hasib/serialsState.js)
- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [src/components/hasib/ServiceView.jsx](../../src/components/hasib/ServiceView.jsx)
- [src/components/hasib/RepairDialogs.jsx](../../src/components/hasib/RepairDialogs.jsx)
- [src/components/hasib/TradeInDialog.jsx](../../src/components/hasib/TradeInDialog.jsx)

Existing operations / explicit gaps: **repair_create, repair_update, repair_approval, repair_status, serial_lookup, trade_in, order_create, order_status, payment_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/retail-tech.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/retail-tech.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/retail-tech.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-retail-tech-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Model/repair-specific local search, accurate listings, device content, local partners and customer referrals.
- **Offer / next action:** A clear eligible repair estimate/diagnostic booking, available device, or condition-dependent trade-in option.
- **Deterministic fit:** First distinguish repair/buy/sell/trade-in; then model, stated issue/variant, location, desired timing and actual service/stock fit.
- **Verified conversion sequence:** Repair: verified intake then accepted repair and collection; retail: fulfilled paid device sale.
- **Repeat/referral route:** Warranty/service support, specifically requested stock alerts, consent-based referrals and relevant repeat needs.
- **First experiment:** Compare the current generic inquiry with intent-first repair/buy/trade-in intake and a model-specific feasible next step; judge completed paid repairs or fulfilled device sales separately. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L12, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Add an explicit retail-tech qualification adapter: calling the current helper with that ID falls back to Other. Do not scrape consumer numbers or infer a diagnosis from a price inquiry.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| intent | enum repair/buy/sell/trade_in; required | intent + normalized model/variant + device discriminator; distinguish separate devices |
| model / variantId | model string≤120 or owned variantId; required by route | repair.device or inventory variant; qualification needs explicit retail-tech branch |
| issue / serialRef | issue string≤500; serialRef optional restricted reference | repair.fault/serial; never put full serial/IMEI in source URLs |
| requestedAt / locationId | UTC ms and owned location reference | need timing and service radius before slot promises |
| quoteVersion / approval | integer≥1; approval ties customer evidence to exact version | reuse quote reset in repair_update; older approval cannot authorize new amount |
| partsReady / qualityCheck | partsReady derived from stock; qualityCheck={passed:boolean,evidenceRef,actorRef,at} | new technician evidence before ready; elapsed time cannot set passed |
| saleCondition / warrantyPolicyId | enum new/refurbished/used and approved policy reference | stock/serial and actual warranty records supply availability; no inferred warranty |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'retail-tech'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Preserve current repair transitions: received→diagnosing/cancelled; diagnosing→waiting_parts/repairing/ready/cancelled; waiting_parts→repairing/cancelled; repairing→ready/cancelled; ready→collected/cancelled. Approval gates repairing/ready unless free warranty. Add quality evidence before ready. Parts leave stock at ready once; collection completes linked order once. A repeat fault opens a linked new lifecycle, not an illegal reverse transition.

**Mutation/event wiring:** Emit repair_received, quote_revised, approval_recorded, parts_available, repair_ready, repair_collected and repair_cancelled inside successful repair mutations. A quote revision suppresses old QUOTE jobs; ready queues one collection update; collected cancels all collection reminders. Separate sales use fulfilled/returned order events. Existing FollowupView requires a typed repair link; current manual follow-up linkedType has none.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `retail-tech.received` | Validated device intake and contact association | EV once; NO_PROGRESS after 1 business day without diagnosis | Stop intake task on diagnosis/cancellation; do not claim a fault is diagnosed |
| `retail-tech.diagnosing` | Technician saves diagnosis or diagnostic system supplies verified result | QUOTE on quote_issued; REMINDER at +1 and +3 business days | Cancel old sequence on quote revision/decision; uncertain diagnosis goes to technician |
| `retail-tech.quote_accepted` | Authorized customer accepts exact quote revision | EV once; no extra staff approval within policy | A different quote version requires new customer consent; silence never approves |
| `retail-tech.waiting_parts` | Inventory reservation fails or technician records shortage | EV when material change; NO_PROGRESS at recorded supplier due time | No guessed ETA; new parts/status supersede the old delay message |
| `retail-tech.repairing` | Approved scope plus verified technician start event | EV optional, coalesced; SLA at promised ready time | Do not send repetitive unchanged progress; pause on scope/approval mismatch |
| `retail-tech.ready` | Technician/test system confirms required tests passed and device is ready | EV once then COLLECTION | Cancel collection messages if reopened/cancelled; ready is not collected or paid |
| `retail-tech.collected` | Verified handover receipt or staff scan | EV once; FEEDBACK optional | Stop all obsolete pickup reminders; unpaid balance remains a separate obligation |
| `retail-tech.sale_return_tradein` | Authoritative serialized sale, return or accepted trade-in event | EV once; BACK_IN_STOCK for waiting permitted requests | No duplicate IMEI sale; disputed coverage/valuation or exceptional refund is an exception |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect the device/fault details, explain the intake receipt, deliver policy-priced estimates, obtain version-specific customer consent, answer repair-status questions from the live record, communicate verified delays and arrange collection.
**Hasib:** Create one customer-linked repair and linked order, validate serial uniqueness, calculate authorized quotes, reserve parts only at the defined commitment point, enforce approval/state transitions, enqueue updates, reconcile payment and stock, and calculate repair metrics.
**Necessary human/source input:** Scan a device if the customer cannot provide its identity; record physical intake/condition, diagnosis, repair/test outcome and handover when no trusted integration captures them. A technician performs the repair. Manager input is limited to warranty disputes, nonstandard price/scope, exceptional refunds and other out-of-policy decisions.

One-time standing configuration: repair service menu and price bands; diagnostic fees; warranty eligibility evidence; technician skills; part availability; repair/test checklist; promised-time rules; pickup hours; collection cadence; trade-in valuation limits; return/refund exception policy. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Add a read-only repair progress timeline with source timestamps, current estimate, customer approval, parts ETA only when verified, next step and message receipt. Customer replies must update the current repair by typed link, not arbitrary extracted ticket ID.**

## 5. Six-tab UI wiring

Keep Chats · **Store & repairs / المتجر والصيانة** · Customers · Broadcasts · Insights · Settings. Default Work view: **Repair and collection list**. Exactly these permanent Work secondary views: **Repairs · Sales · Devices · Follow-ups**.

Primary action: **New repair**. Main row shows **Ticket/device reference, estimate state, due time, parts blocker, collection state**. Filters: **Approval pending · Parts needed · Overdue · Ready for collection**. Details include **Intake condition; estimate/repair test; serialized stock; trade-in/warranty and costs**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Device category; sale vs repair; warranty status; repair issue**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B01.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B01.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B01.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B01.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B01.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B01.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B01.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B01.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B01.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../retail-tech.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Overdue repairs | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Device contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Aged serialized stock | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Repair-ready turnaround | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Repair first-time success | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Estimate acceptance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Awaiting collection | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Repair contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per completed paid repair or net new device buyer; estimate-to-intake/approval; contribution by intent/source; return/comeback rate**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** A repair quote v1=25000 minor units is revised to v2=30000 before old approval arrives. Customer approves v2; technician records pass; ready is replayed twice; customer collects. Separately the same contact buys one in-stock serialized device.

**Assert exact business results:** v1 approval refused; zero ready messages before technician pass; one ready notification and one parts movement after duplicate event; one repair-collection conversion and one sale conversion; one acquired customer; no collection chase after collected. Parts shortage yields waiting state, not a promise.

Additional sector acceptance requirements from the operating specification:

1. Create a ticket → quote → customer approval → verified start → passed tests → ready → collection using fake time; no staff communication or manual follow-up creation is required after fact capture.
2. Replay ready twice, then collect before dispatch: one enrollment exists and the stale pickup message is cancelled.
3. Ask Layla for status on the correct and a different customer's device; only the verified owner's current record is returned with source time.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-retail-tech-growth.test.mjs
node --test tests/hasib-tech.test.mjs tests/retail-tech-journeys.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B01-retail-tech.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
