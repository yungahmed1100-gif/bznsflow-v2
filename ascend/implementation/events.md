# Events & weddings: agent build specification

Task **B17** · sector ID `events` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new event case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Events & weddings product/dashboard specification](../events.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New typed event case, resource/vendor holds, versioned proposal and payment milestones; linked order ledger.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order_create/payment_record; proposed case/artifact/reservation operations**.

Own these **proposed new** sector files:

- `config/ascend-growth/events.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/events.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/events.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-events-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Portfolio by event type, venue/planner partnerships, referrals and high-intent date/location search.
- **Offer / next action:** A date-feasible proposal or discovery/site meeting.
- **Deterministic fit:** Date, location, guest count, event type, scope, budget band, decision process and resource availability.
- **Verified conversion sequence:** Completed consultation/site visit → accepted event with required deposit.
- **Repeat/referral route:** Anniversary/corporate-calendar inquiries chosen by the client and venue/partner referrals.
- **First experiment:** Compare generic portfolio entry with event-type/date-specific evidence and a feasible next step; judge accepted deposit-backed events. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L16** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Venue survey evidence is a proxy; no unverified resource hold or generic deadline pressure.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| eventType / eventAt / endsAt | approved type and UTC interval | required before venue/resource fit |
| venueRef / guestCount | verified venue reference; integer1..10000 | capacity and access constraints |
| scope / budgetMinor | bounded package lines and stated integer≥0 | scope revision and standing price policy |
| vendorHolds | array≤20 supplier/hold/expiry refs | confirmation is provider/source evidence |
| decisionMakerRef / depositEvidence | verified approver and payment ledger ref | current quote acceptance |
| runSheet / completionEvidence | versioned tasks and actual event evidence | don't auto-complete because event date passed |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'events'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed transitions inquiry→qualified→proposal→accepted→booked→planning→ready→in_progress→completed→closed; cancelled/on_hold supported. Booked requires current proposal, required deposit and critical vendor/venue confirmations. Ready requires checklist completion, not just calendar proximity.

**Mutation/event wiring:** Inquiry completeness→QUOTE; consultation/site visit attendance→first milestone; proposal accepted→resource holds; PRE_EVENT reminders from current run sheet; missing critical vendor→exception; completed→balance/feedback/referral.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `events.brief_complete` | Validated date, scope and budget | MISSING_INPUT; QUOTE | Unsupported scope routes only that decision to planner |
| `events.confirmed` | Accepted scope and required deposit | EV | Unconfirmed vendor capacity remains a visible blocker |
| `events.vendor_due` | Contracted vendor obligation and checkpoint | CHECKPOINT; SLA | No claim of booking until vendor accepts |
| `events.client_decision` | Required menu/design/guest-list version due | REVIEW | Reply resolves or clarifies; obsolete versions stop |
| `events.scope_changed` | Requested change beyond current baseline | QUOTE; REVIEW | Do not overwrite accepted event scope silently |
| `events.readiness` | Actual checklist completion or failed check | CHECKPOINT; EV | Elapsed time cannot auto-pass safety/quality checks |
| `events.event_completed` | Verified venue/production completion | FEEDBACK | Keep disputed or missing deliverables open |
| `events.reconciled` | Approved actual costs and final obligations | BALANCE | Deposits and supplier commitments cannot be counted twice |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect the brief, explain package choices, coordinate client decisions, send verified planning milestones and chase missing inputs automatically within the agreed timeline.
**Hasib:** Version the event plan and budget, validate resources, generate vendor/client tasks, track dependencies and commitments, reconcile changes/payments and compute event margin and delivery KPIs.
**Necessary human/source input:** Perform creative/site work and safety checks, enter actual readiness/quality facts and decide nonstandard vendor or contingency issues. Routine package quotes, checklists and deadline reminders run automatically.

One-time standing configuration: event packages and minimum lead time; venue/vendor availability; deposits and milestone payments; guest/capacity limits; change-order authority; production checklist and contingency thresholds. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Vendor confirmations and actual event delivery may require human data entry or connectors. Automated admin must not invent supplier availability.**

## 5. Six-tab UI wiring

Keep Chats · **Events / المناسبات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Event countdown list**. Exactly these permanent Work secondary views: **Events · Calendar · Vendors · Follow-ups**.

Primary action: **New event brief**. Main row shows **Event/date, next critical decision, readiness, vendor hold, producer**. Filters: **Date hold · Decision overdue · Vendor pending · Event this week**. Details include **Brief/scope; run sheet; vendor commitments; budget/installments**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Private vs conference; size; event type; vendor category**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B17.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B17.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B17.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B17.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B17.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B17.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B17.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B17.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B17.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../events.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Event readiness | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Overdue client/vendor decisions | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Confirmed-event conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Forecast event contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Vendor confirmation coverage | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Change-cost recovery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Installments overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Attendance or satisfaction — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per confirmed event; consultation-to-proposal; deposit-backed win rate; contribution and cancellation rate**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Two weddings request same venue/date. First deposits50000 on200000 contract; vendor hold expires before second confirmation. Guest count revision changes scope.

**Assert exact business results:** One resource commitment; no booked status on expired vendor hold; revised scope needs versioned acceptance; balance150000 before further receipts; event completion requires evidence; cancellation stops countdown messages.

Additional sector acceptance requirements from the operating specification:

1. Changing guest count recalculates affected cost/capacity and invalidates obsolete approval jobs.
2. An incomplete required site check prevents ready status even on event day.
3. Margin stays incomplete until required vendor costs are reconciled.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-events-growth.test.mjs
node --test tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B17-events.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
