# Manufacturing: agent build specification

Task **B20** · sector ID `manufacturing` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new RFQ + production case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Manufacturing product/dashboard specification](../manufacturing.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New manufacturing RFQ/production case, drawing/spec revisions, capacity reservations and quality evidence; reuse inventory ledger only for supported units and movements.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [convex/hasib/stock.js](../../convex/hasib/stock.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing inventory/order/payment operations; proposed case/artifact/reservation operations**.

Own these **proposed new** sector files:

- `config/ascend-growth/manufacturing.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/manufacturing.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/manufacturing.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-manufacturing-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Capability/product search pages, industrial directories, distributor partnerships and permissioned RFQ feeds.
- **Offer / next action:** A feasibility-qualified RFQ response with specification, lead time and terms.
- **Deterministic fit:** Material/process, drawing/spec revision, quantity/MOQ, tolerances/certifications, delivery location/date and available capacity.
- **Verified conversion sequence:** Complete feasible RFQ → accepted purchase order → delivered order.
- **Repeat/referral route:** Forecast/reorder signals agreed with the buyer, contract renewal and distributor referrals.
- **First experiment:** Compare general contact with capability-specific RFQ intake; judge feasible RFQs, accepted POs and delivered contribution. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L17** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: No fabricated capability/certification or blind automatic quote for an unreviewed technical specification.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| partRef / drawingRevision | customer part reference and immutable artifact revision | required RFQ spec identity |
| material / process / tolerances | approved catalog identifiers and bounded specifications | engineering-reviewed feasibility |
| quantity / unit / MOQ | positive quantity with approved precision/unit; policy MOQ | do not assume all units integer pieces |
| certifications / inspectionPlan | required certificate IDs≤10 and plan artifact | availability needs verified supplier/process capability |
| requiredAt / deliveryRef | UTC ms and destination reference | capacity/material lead-time fit |
| quoteVersion / purchaseOrderRef | integer≥1 and accepted customer PO evidence | revision alignment mandatory |
| lotRef / qualityRelease | owned lot and authorized pass/fail evidence | actual output/inspection, not elapsed schedule |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'manufacturing'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed rfq_incomplete→feasibility_review→quoted→po_accepted→scheduled→in_production→quality→released→shipped→closed. Engineering clearance precedes quote commitment when tolerances/certifications require it. PO must match current drawing/price/version; nonconformance blocks release.

**Mutation/event wiring:** Complete RFQ→feasibility task; approved feasibility→QUOTE; accepted PO→materials/capacity; measured production→milestone update; quality released→shipment update; repeat RFQ retains customer/part but new lifecycle.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `manufacturing.order_requirement` | Accepted product specification and demand | MISSING_INPUT; QUOTE | No unsupported lead-time promise |
| `manufacturing.production_planned` | Confirmed order and feasible capacity | EV; DELIVERY_DUE | Reservation conflict blocks unsupported confirmation |
| `manufacturing.material_shortage` | Authoritative stock/receipt gap | CHECKPOINT; EV if affected | No silent unapproved material substitution |
| `manufacturing.released_started` | Authorized release and actual machine/operator start | NO_PROGRESS at operation checkpoint | Planned release is not physical start |
| `manufacturing.downtime` | Machine signal or operator reason-coded stop | SLA; CHECKPOINT | Unknown reason stays unknown, not inferred root cause |
| `manufacturing.quality_result` | Traceable inspection result and lot | EV for customer impact | Elapsed time or target output cannot auto-pass inspection |
| `manufacturing.finished_shipped` | Finished-goods receipt and dispatch proof | EV; DELIVERY_DUE | Partial shipment retains remaining obligation |
| `manufacturing.closed_reconciled` | Actual yield, labor/material and delivery evidence | BALANCE; FEEDBACK optional | Incomplete costs leave margin visibly incomplete |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect order requirements, explain authorized quotations and verified production/delivery milestones, request customer specification decisions and handle routine order-status questions.
**Hasib:** Validate BOM/version/capacity, create production and procurement obligations, reconcile inventory and WIP, monitor schedule/quality gates, queue material exceptions and calculate covered production KPIs.
**Necessary human/source input:** Operate equipment and make engineering/quality judgments; enter actual counts, tests, downtime causes and inspection facts where no trusted system captures them. Only out-of-policy substitutions and release exceptions need decisions.

One-time standing configuration: approved product/BOM/routing versions; production capacity; material reservation; quality sampling and release authority; supplier terms; lead-time commitments; scrap/rework rules; order change controls. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **General food batch machinery is not automatically a manufacturing/MRP system. Add typed unit/lot/quality behavior and tests before claiming manufacturing readiness.**

## 5. Six-tab UI wiring

Keep Chats · **Production / التصنيع** · Customers · Broadcasts · Insights · Settings. Default Work view: **Production-order schedule**. Exactly these permanent Work secondary views: **Orders · RFQs · Quality · Follow-ups**.

Primary action: **New RFQ**. Main row shows **Order/spec revision, release state, material blocker, inspection state, due date**. Filters: **RFQ incomplete · Sample pending · Material shortage · Quality hold**. Details include **Specification/BOM revision; approval evidence; production/inspection; lot costs**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Product family; process/equipment; order type; defect/scrap cause**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B20.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B20.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B20.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B20.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B20.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B20.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B20.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B20.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B20.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../manufacturing.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time in-full orders | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · First-pass yield | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Production orders past due | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Order contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · RFQ conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Scrap cost rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Overall equipment effectiveness — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Production cycle time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per qualified RFQ; quote turnaround; quote-to-PO; delivered contribution; reorder rate**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** RFQ drawing A changes to B before PO A arrives. Order100 units yields95 accepted/5 scrap; capacity has only80 units in requested window.

**Assert exact business results:** PO mismatch blocked; original delivery promise not auto-confirmed; quality yield95%; scrap5 tracked separately; revenue only accepted/shipped contractual units; costs include scrap rather than disappearing.

Additional sector acceptance requirements from the operating specification:

1. Failed lot inspection blocks shipment readiness and preserves traceability.
2. A partial shipment cannot mark the remaining order fulfilled.
3. Duplicate machine events do not double-count downtime, output or material consumption.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-manufacturing-growth.test.mjs
node --test tests/hasib-orders.test.mjs tests/hasib-domain.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B20-manufacturing.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
