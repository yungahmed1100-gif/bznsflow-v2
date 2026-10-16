# Real estate: agent build specification

Task **B02** · sector ID `real-estate` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `property`; implementation family: **existing property pipeline**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Real estate product/dashboard specification](../real-estate.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing real-estate opportunity, property, viewing, offer and compliance tables in workflowSchema.ts remain pipeline authority. Growth opportunity is an attribution link/projection; no competing editable stage.

Existing files to inspect and extend only as required:

- [convex/hasib/realEstateState.js](../../convex/hasib/realEstateState.js)
- [convex/hasib/realEstateBoard.js](../../convex/hasib/realEstateBoard.js)
- [convex/hasib/realEstateTurn.js](../../convex/hasib/realEstateTurn.js)
- [convex/hasib/propertyState.js](../../convex/hasib/propertyState.js)
- [src/components/hasib/RealEstateDashboard.jsx](../../src/components/hasib/RealEstateDashboard.jsx)
- [src/components/hasib/realestate/DealDetail.jsx](../../src/components/hasib/realestate/DealDetail.jsx)

Existing operations / explicit gaps: **opportunity_save, opportunity_stage, match_generate, match_update, viewing_save, offer_save, offer_approve, compliance_update, deal_close, commission_record**.

Own these **proposed new** sector files:

- `config/ascend-growth/real-estate.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/real-estate.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/real-estate.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-real-estate-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Property-specific search/portal inquiries, verified listing content, past-client and partner referrals.
- **Offer / next action:** A shortlist of currently available properties or a viewing, matched to the stated requirement.
- **Deterministic fit:** Buy/rent/sell intent, area, property type, budget range, timeline and verified listing/resource availability; financing facts are customer-stated.
- **Verified conversion sequence:** Confirmed viewing → attended viewing → accepted transaction milestone.
- **Repeat/referral route:** Consent-based property alerts, lease/relationship milestones and referral links after completed service.
- **First experiment:** Compare a property-specific verified shortlist CTA with the existing generic inquiry CTA; judge attended viewings and matured transactions, not messages. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L05, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: No inferred wealth/protected-trait scoring, stale listing promises or assumption that a viewing is a sale.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| transactionType / propertyTypes / areas | enum buy/rent/sell; arrays≤10 strings≤80 | normalize to existing need and property preference fields |
| budgetMinMinor / budgetMaxMinor | integers≥0; min≤max; currency required | existing opportunity budget fields; optional if customer has not stated them |
| timeline / decisionMakerReadiness | bounded customer-stated values | existing fields; never infer wealth or approval authority |
| financeReadiness | enum unknown/cash_stated/finance_needed/preapproval_stated | map to existing field without treating statements as lender verification |
| propertyId / listingVerifiedAt | owned property ID and source timestamp | property availability/authority check before match or viewing |
| viewingAt / outcome | UTC ms; outcome from actual attendance evidence | existing viewing workflow; confirmed appointment is not attendance |
| agreementEvidence / completionEvidence | restricted verified references | existing compliance/close requirements, never message sentiment |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'real-estate'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Keep existing qualified-stage checks, property authority and available status. Viewing creation/changes use existing allowed transitions and resource availability. A won conversion is emitted only by successful deal_close with current required compliance, not opportunity_stage. Commission paid and property value are different revenue concepts.

**Mutation/event wiring:** Append attribution when opportunity_save creates or links a need. Emit viewing_confirmed/attended/missed/cancelled from viewing_save evidence, deal_won from deal_close, and commission_received from commission_record. Cancel reminders on property withdrawal or reschedule. New matching listings can reactivate only consented alerts with current availability.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `real-estate.inquiry` | New inquiry and verified contact channel | MISSING_INPUT | A second real property need is not merged into an unrelated opportunity |
| `real-estate.requirements_complete` | Customer confirms requirements and permissions | EV; QUOTE-like bounded inquiry follow-up if requested | No stale availability or invented amenities |
| `real-estate.viewing_selected` | Customer chooses a valid available slot | EV plus PRE_EVENT | Conflict causes alternative slots, not double booking |
| `real-estate.viewing_rescheduled` | Authorized new slot replaces old booking | EV plus regenerated PRE_EVENT | Old reminders must not dispatch |
| `real-estate.viewing_attended` | Agent/check-in captures actual attendance | FEEDBACK | No attendance inference from scheduled end |
| `real-estate.offer_submitted` | Authorized party submits complete current offer | REVIEW | Binding concessions outside authority go to agent |
| `real-estate.deal_closed` | Verified close evidence | EV plus BALANCE | Agreed is not closed; unpaid commission is not collected |
| `real-estate.listing_changed` | Authoritative availability/price change | EV once per material revision | Cancel obsolete matching reminders; no broad unauthorized blast |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect requirements, propose verified matches, coordinate viewing times, request feedback and answer factual status questions using current listing and deal evidence.
**Hasib:** Create/merge opportunities under verified identities, rank only objective requirement matches, reserve viewing resources, assign agents, track offer versions and commission obligations, and update cohort metrics.
**Necessary human/source input:** Enter availability or viewing attendance where no feed exists; conduct viewings and negotiations outside standing authority; verify transaction close and disputed commissions. Customer housing eligibility or selection is not delegated to an automated score.

One-time standing configuration: qualification fields; listing freshness; permitted factual property claims; matching rules; viewing calendars; agent routing; approved offer forms; commission terms; negotiations allowed only within explicit limits. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Qualified lead scoring uses explicit requirement/budget/timing fit. Show unknowns and reasons. Keep owner/seller authority evidence restricted and avoid protected-trait targeting or customer wealth inference.**

## 5. Six-tab UI wiring

Keep Chats · **Deals / الصفقات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Pipeline board**. Exactly these permanent Work secondary views: **Board · Viewings · Properties · Follow-ups**.

Primary action: **New inquiry**. Main row shows **Requirement, property, stage, agent, next viewing, next action**. Filters: **My deals · Unassigned · Awaiting response · Viewing due**. Details include **Requirements and matches; viewing/offer history; commission and approvals**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Rental vs sale; property type; lead source; assigned agent**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B02.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B02.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B02.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B02.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B02.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B02.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B02.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B02.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B02.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../real-estate.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Qualified-to-viewing conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Viewing attendance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Unanswered qualified inquiries | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Commission overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Qualified-to-close conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Time to viewing | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Listing freshness | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Offer decision backlog | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per attended viewing; matured inquiry-to-viewing and viewing-to-close rates; acquired-customer contribution; referral share**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Two inquiries for the same buyer need arrive with one portal event duplicated. A confirmed viewing is rescheduled, attended and then a deal closes after required checks; a second viewing is cancelled. Property value=50000000, earned commission=500000 minor units.

**Assert exact business results:** One active need for duplicate inquiry; only latest viewing reminder; attended-viewing denominator excludes cancelled according to metric contract; one deal close; commission revenue500000, never50000000; an unavailable listing cannot produce a confirmed viewing.

Additional sector acceptance requirements from the operating specification:

1. Complete requirements → fresh matches → selected viewing → confirmation/reminder occurs without staff re-entering the inquiry.
2. A withdrawn listing invalidates queued availability claims before dispatch.
3. Duplicate attendance/close events update one opportunity and one commission obligation.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-real-estate-growth.test.mjs
node --test tests/hasib-real-estate-ascend.test.mjs tests/real-estate-journeys.test.mjs tests/hasib-property.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B02-real-estate.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
