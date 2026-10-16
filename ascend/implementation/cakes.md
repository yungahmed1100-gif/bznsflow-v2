# Cakes: agent build specification

Task **B12** · sector ID `cakes` · status **not_started** · source inspection 2026-10-10.
Current registry: **preview**; current owner workflow `orders`; implementation family: **date-bound food production**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Cakes product/dashboard specification](../cakes.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing orders/custom fields, recipes, batches and stock; add typed design approval and production-capacity policy, no parallel recipe engine.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [convex/hasib/restaurantState.js](../../convex/hasib/restaurantState.js)
- [src/components/hasib/OrdersView.jsx](../../src/components/hasib/OrdersView.jsx)
- [src/components/hasib/RestaurantControls.jsx](../../src/components/hasib/RestaurantControls.jsx)

Existing operations / explicit gaps: **order_create, order_preparation, baking_suggestions, order_status, payment_record, recipe_save, batch_create**.

Own these **proposed new** sector files:

- `config/ascend-growth/cakes.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/cakes.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/cakes.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-cakes-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Visual occasion/product content, local search, planner/venue partners and existing-customer referrals.
- **Offer / next action:** An available date and clear catalog/design option with total and deposit terms.
- **Deterministic fit:** Occasion date, servings, design tier, delivery area, budget fit and kitchen capacity.
- **Verified conversion sequence:** Accepted design and verified required deposit → completed order.
- **Repeat/referral route:** Customer-chosen occasion reminders, referral links and opted-in seasonal preorder offers.
- **First experiment:** Compare a generic inquiry with date-and-servings-first intake showing feasible catalog choices; judge deposit-backed completed orders. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L11, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Checkout evidence is from packaged food, not a custom-cake benchmark; no invented occasion dates or universal discounts.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| occasionAt / fulfilmentAt | UTC ms with approved lead time | existing order due/custom fields |
| servings / designTier | integer1..1000 and catalog tier | pricing/capacity rule |
| flavour / designRevision | catalog option and approved artifact version | reference images stored securely |
| allergenRequest | bounded declared preference/evidence; restricted operational handling | never promise allergen-free without approved kitchen policy |
| deliveryArea / depositEvidence | served area and payment ledger reference | distance/time and deposit guards |
| productionUnits | derived workload units by design/servings | reserve kitchen capacity per due window |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'cakes'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Order confirmation requires current design accepted, feasible lead time/capacity and required deposit. Revised design beyond allowance gets a new quote and acceptance. Ingredient stock, recipe units, batch expiry and waste use existing food controls; no unsafe substitution inference.

**Mutation/event wiring:** Incomplete brief→MISSING_INPUT; design ready→QUOTE/REVIEW; confirmed order→PRE_EVENT; actual preparation/ready→EV; fulfilled→BALANCE/FEEDBACK; occasion repeat only consented and with appropriate date context.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `cakes.inquiry` | Requested date and servings | MISSING_INPUT | Stop on completed requirements, decline or expiry |
| `cakes.quote_issued` | Validated catalog combination or approved custom design | QUOTE | Revision invalidates old quote and reminders |
| `cakes.confirmed` | Required design consent and verified deposit/credit policy | EV; PRE_EVENT | A payment screenshot alone cannot confirm settlement |
| `cakes.design_change` | Customer requests a material amendment | REVIEW | Do not change accepted production silently |
| `cakes.production_started` | Kitchen saves verified start | NO_PROGRESS at production checkpoint | No invented progress from elapsed time |
| `cakes.quality_checked` | Authorized checklist pass and actual completion | EV; COLLECTION for pickup | Failed check holds ready notification and creates corrective work |
| `cakes.delivery_changed` | Carrier scan or confirmed delivery change | DELIVERY_DUE; EV material change | No delivery claim without accepted evidence |
| `cakes.closed` | Pickup receipt or delivered proof | BALANCE if due; FEEDBACK | Complaint suspends promotional/repeat-order sequence |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect the occasion and missing details, show available catalog choices, quote permitted designs, obtain design/version confirmation, explain recorded allergens and coordinate pickup or delivery.
**Hasib:** Calculate the configured recipe/size price, reserve kitchen capacity, maintain the accepted design version, generate production tasks and delivery obligations, reconcile deposits and ingredient/order costs.
**Necessary human/source input:** Enter unusual design feasibility, substitutions/allergen judgments and physical production/quality facts when no system captures them; bakers perform the work. Only nonstandard designs, unsafe ingredient uncertainty or policy exceptions need specialist decisions.

One-time standing configuration: standard sizes/flavors/design tiers and prices; kitchen and delivery capacity; order cutoffs; allergen wording; deposit and change deadlines; design acceptance and refund limits. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Keep simple first-order acquisition short. Customer photos are brief evidence, not automatically reusable marketing assets; publish only with separate rights/consent.**

## 5. Six-tab UI wiring

Keep Chats · **Cake orders / طلبات الكيك** · Customers · Broadcasts · Insights · Settings. Default Work view: **Due-date production list**. Exactly these permanent Work secondary views: **Orders · Production · Products · Follow-ups**.

Primary action: **New cake order**. Main row shows **Occasion date, order, approved design, deposit state, production slot, owner**. Filters: **Due soon · Design pending · Deposit due · Ready**. Details include **Approved design/version; ingredients and staff-reviewed requests; capacity; collection**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Custom vs batch; design complexity; product size; occasion lead time**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B12.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B12.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B12.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B12.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B12.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B12.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B12.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B12.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B12.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../cakes.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Ready on time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Unapproved designs due soon | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Deposits outstanding | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Waste cost | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Batch sell-through | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Order contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Approved-scope change rate | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Production capacity load | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per deposit-backed order; quote-to-deposit; contribution after promotion; completed repeat occasion orders**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Daily capacity10 production units; two orders need6 each. First quote requires10000 deposit on40000 total; design v2 changes servings after v1 approval.

**Assert exact business results:** Only one order fits original day unless owner changes real capacity; deposit is not additional revenue; old design approval invalid; zero ready message until preparation evidence; ingredient stock and waste recorded once.

Additional sector acceptance requirements from the operating specification:

1. A catalog order reserves capacity only once after its configured confirmation conditions.
2. A design change cancels obsolete production reminders and requires consent to the new version.
3. Failed quality checks prevent a ready message; delivery proof does not imply invoice payment.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-cakes-growth.test.mjs
node --test tests/hasib-bakery.test.mjs tests/hasib-food-correctness.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B12-cakes.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
