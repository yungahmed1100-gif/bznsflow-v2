# Coffee & dessert: agent build specification

Task **B13** · sector ID `cafe` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `orders`; implementation family: **fast order + repeat**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Coffee & dessert product/dashboard specification](../cafe.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing order/recipe/stock records; growth facts only identify source, basket intent and repeat eligibility.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [convex/hasib/restaurantState.js](../../convex/hasib/restaurantState.js)
- [src/components/hasib/RestaurantControls.jsx](../../src/components/hasib/RestaurantControls.jsx)
- [src/components/hasib/OrdersView.jsx](../../src/components/hasib/OrdersView.jsx)

Existing operations / explicit gaps: **order_create, order_status, payment_record, recipe_save, stock_receive, waste_create**.

Own these **proposed new** sector files:

- `config/ascend-growth/cafe.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/cafe.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/cafe.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-cafe-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Maps/local discovery, social menu content, nearby office partnerships and first-party customer referrals.
- **Offer / next action:** Fast ordering from an actually available menu; a preconfigured bundle only if economical.
- **Deterministic fit:** Item/modifier, quantity, service mode, pickup time and availability; skip long qualification for simple purchases.
- **Verified conversion sequence:** Confirmed first order → fulfilled paid order.
- **Repeat/referral route:** Reorder shortcuts, actual purchase-based rewards and bounded lapsed-customer journeys.
- **First experiment:** Compare the current ordering path with a shorter menu-to-checkout path; judge fulfilled first orders and subsequent contribution without changing menu prices. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L10, L11, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Restaurant/checkout evidence is an adjacent-sector basis; direct counter orders must not be forced into a B2B lead form.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| basket | array1..20 owned variants/modifiers and qty1..100 | reuse existing lines/modifierKeys |
| serviceMode / pickupAt | pickup/dine_in/delivery and UTC ms if scheduled | only ask fields necessary for fulfillment |
| locationRef / availabilityAt | owned outlet and server freshness timestamp | menu and opening hours authoritative |
| loyaltyRef / repeatPermission | optional program identity and consent evidence | no automatic enrollment from purchase |
| recipeRevision / allergenRequest | approved recipe version and stated request | substitution requires approved policy/customer acceptance |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'cafe'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Do not create a lengthy lead-qualification conversation for a coffee order. Validate menu/modifiers, prep capacity and opening hours, then use existing order transitions. Fulfilled paid first order is conversion; menu click and order intent are not.

**Mutation/event wiring:** First order→current queue updates; actual ready→pickup notification; completed purchase→optional feedback/reorder invitation under frequency cap. Expired same-day offer cannot remain in nurture. Bulk/corporate inquiries can use a separate intent within same contact.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `cafe.order_requested` | Validated menu lines and contact | MISSING_INPUT | Unavailable items need an accepted alternative |
| `cafe.order_confirmed` | Customer consent plus required payment condition | EV | Reject duplicate channel/POS representations |
| `cafe.preparing` | Kitchen accepts actual work | SLA | No staff click solely to authorize the message |
| `cafe.ready` | Kitchen marks order safely ready | EV; COLLECTION only within freshness/expiry policy | Expired food must not continue to be offered as ready |
| `cafe.stockout` | Authoritative item unavailable | EV; REVIEW | Never substitute allergens or charge extra without consent |
| `cafe.handover` | POS scan or actual staff handover | FEEDBACK optional | Stop pickup reminders; no assumption of satisfaction |
| `cafe.waste_recorded` | Count and reason captured | CHECKPOINT internal | Do not turn estimated waste into actual consumption |
| `cafe.loyalty_due` | Verified eligibility and permitted marketing purpose | RENEWAL or one configured expiry reminder | Stop on opt-out, redemption or expiry |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Take structured orders, answer menu questions from approved content, offer available alternatives with customer consent, provide actual preparation/pickup status and handle routine loyalty queries.
**Hasib:** Validate modifiers, price deterministically, reserve availability, route orders to the prep queue, reconcile payment/refunds, calculate ticket-time and item economics, and trigger permitted retention messages.
**Necessary human/source input:** Prepare/serve items; enter actual handover, waste and stock corrections when not integrated. Record allergen or safety uncertainty and exceptional refunds; ordinary orders need no staff retyping or messaging.

One-time standing configuration: menu availability/modifiers and prices; prep capacity; pickup windows; loyalty eligibility; substitution/refund limits; reservation rules where offered; promotion consent. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Prep time and repeat cohorts must use fulfilled timestamps. Meal/visit data is not an inferred demographic profile.**

## 5. Six-tab UI wiring

Keep Chats · **Orders / الطلبات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Live preparation queue**. Exactly these permanent Work secondary views: **Queue · Order history · Menu · Follow-ups**.

Primary action: **New order**. Main row shows **Order, pickup promise, preparation stage, elapsed time, pickup status**. Filters: **Preparing · Promise at risk · Ready · Bulk orders**. Details include **Order/modifiers; preparation events; recipe and waste; verified payment**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Hour/daypart; item/modifier; direct vs aggregator; bulk vs counter**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B13.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B13.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B13.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B13.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B13.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B13.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B13.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B13.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B13.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../cafe.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Order-ready time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Ready within promise | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Remake and spoilage cost | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Menu contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Ingredient shortages | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Remake rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Returning known customers | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Average order value | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per fulfilled first order; first-to-second purchase within W; reward-adjusted contribution; reorder interval**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Order has two drinks, total5000; one refunded1000 after fulfillment. Same contact places a second order the next day; duplicate ready event occurs.

**Assert exact business results:** One first-customer acquisition, two genuine purchase lifecycles, net revenue4000 for first order; one ready notification; no redundant budget questions; recipe consumption and refund policy remain correct.

Additional sector acceptance requirements from the operating specification:

1. Two concurrent orders for the last item cannot both receive availability confirmation.
2. Kitchen ready events trigger one update, and handover cancels pending pickup reminders.
3. Unconnected POS data shows unavailable ticket metrics, not zero or fabricated throughput.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-cafe-growth.test.mjs
node --test tests/hasib-cafe.test.mjs tests/hasib-food-correctness.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B13-cafe.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
