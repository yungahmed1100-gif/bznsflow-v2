# Media & production: agent build specification

Task **B03** · sector ID `media` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new production case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Media & production product/dashboard specification](../media.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New hasibSectorCases media payload plus hasibGrowthArtifacts and hasibGrowthReservations; link one existing order per accepted commercial scope. Draft report examples remain synthetic.

Existing files to inspect and extend only as required:

- [config/hasib-packs.js](../../config/hasib-packs.js)
- [src/components/ascend-draft/WorkViews.jsx](../../src/components/ascend-draft/WorkViews.jsx)
- [src/components/ascend-draft/InsightsPreview.jsx](../../src/components/ascend-draft/InsightsPreview.jsx)
- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)

Existing operations / explicit gaps: **Existing order_create/payment_record for commercial ledger; proposed growth_work_create, growth_case_update and growth_artifact_decide for production**.

Own these **proposed new** sector files:

- `config/ascend-growth/media.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/media.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/media.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-media-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Relevant portfolio/case studies, venue/agency partnerships, client referrals and permitted company-specific prospecting.
- **Offer / next action:** A production brief and date-feasible package or discovery session.
- **Deterministic fit:** Production purpose, deliverables/formats, shoot location/date, usage rights, budget band and available crew/equipment.
- **Verified conversion sequence:** Complete brief → accepted scope and required deposit → delivered production.
- **Repeat/referral route:** Client campaign calendar, related production requests and agency/venue referrals.
- **First experiment:** Compare a generic showreel CTA with deliverable-specific proof plus date/budget/usage brief; judge deposit-backed productions and revision-adjusted contribution. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03, L16** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Both sources are cross-sector proxies; no verified media-producer top-decile acquisition benchmark was found.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| productionType / purpose | enum photo/video/podcast/social_package/live_capture; purpose string≤240 | select approved package and brief checklist |
| deliverables | array1..20 {format,aspectRatio,durationSeconds?,quantity,language}; quantity1..100 | typed formats and duration bounds; attach scope revision |
| shootStartsAt / shootEndsAt / locationRef | UTC interval end>start; verified location reference | crew/equipment hold checks include setup/travel buffers |
| budgetMinor / packageId | integer≥0; versioned approved package ID | price/deposit and revision allowance from standing policy |
| usageRights | {territory:string≤80,channels:enum[],termEndsAt?:ms,clearance:unknown/pending/cleared} | clearance evidence required before final public-use delivery |
| crew / equipment / locationPermission | owned resource refs≤20 and permission artifact | atomic reservations; no calendar slot is a supplier confirmation |
| revisionAllowance / currentCutRevision | nonnegative integers; exact-version artifact | included revision counter advances only on valid feedback cycle |
| clientApproverRef / assetsComplete | verified approver reference; derived checklist result | customer approval on cut N cannot approve cut N+1 |
| shootEvidence / handoffEvidence | restricted storage/crew evidence references | actual capture complete and accessible final link required |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'media'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed case transitions: brief_incomplete→quoted→awaiting_customer_acceptance→booked→preproduction→shooting→editing→review→accepted→delivered→closed. review→editing creates new revision; on_hold/cancelled retain costs. Book only current scope accepted, required deposit recorded and crew/equipment holds valid. Final handoff requires accepted exact cut, rights clearance and accessible authorized asset link.

**Mutation/event wiring:** Map brief_completed to QUOTE, booking_confirmed to PRE_EVENT, shoot_completed to edit milestone, cut_submitted to REVIEW, feedback_received to revision task, final_handoff to BALANCE/FEEDBACK as eligible. Version replacement cancels old review jobs atomically. Storage/review connector is optional; secure manual evidence input is first implementation.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `media.brief_received` | Customer message with project intent | MISSING_INPUT while incomplete | One request per project; replies update existing brief |
| `media.quote_ready` | Complete brief fits published package and capacity rules | QUOTE | Scope outside policy creates one priced exception draft |
| `media.booking_confirmed` | Current offer accepted and deposit verified where required | EV then PRE_EVENT | Supplier/venue holds must be verified; expired holds cannot be confirmed |
| `media.shoot_preparation` | Booked shoot approaches checklist cutoff | CHECKPOINT before shoot; PRE_EVENT | Critical missing permission blocks shoot-ready status |
| `media.shoot_completed` | Crew/production system records completion and media receipt | EV optional; DELIVERY_DUE monitor | No inference of shoot completion from elapsed time |
| `media.cut_submitted` | Storage/review connector supplies current version and named approver | REVIEW | New version invalidates previous pending review messages |
| `media.revision_or_acceptance` | Authorized feedback/decision on exact version | REVIEW for next version; QUOTE for extra scope | Old cut approval cannot approve new work; rights/public release conditions remain |
| `media.final_handoff` | Accepted deliverables and permitted storage links exist | EV plus BALANCE; FEEDBACK optional | Expired links are repaired before send; scope disputes pause collection |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Qualify the brief, collect missing assets, present authorized package quotes, confirm the schedule, consolidate version-specific feedback, chase decisions and deliver approved links.
**Hasib:** Build the production plan from a template, reserve resources atomically, create milestone dependencies, track deliverable versions, enforce revision limits, calculate balances/contribution and route exceptions.
**Necessary human/source input:** Record shoot completion/quality and exceptional actual costs where integrations are absent. Creative professionals produce and judge the work; the customer approves creative outputs. Manager decisions concern rights ambiguity, resource conflict without an authorized substitute and scope outside the price policy.

One-time standing configuration: production packages and quote limits; revision allowance; required brief fields; crew/equipment calendars; deposits; authorized client approvers; deliverable/usage terms; milestone templates; review response windows. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Build Media early as the reference missing-domain adapter. Keep Projects/Board, Shoot calendar, Resources and Follow-ups inside Productions. Record actual crew time, vendor cost and rights cost so contribution is not mistaken for contract revenue. Do not use the draft's12 completed report rows in operational metrics.**

## 5. Six-tab UI wiring

Keep Chats · **Productions / الإنتاج** · Customers · Broadcasts · Insights · Settings. Default Work view: **Production stage board**. Exactly these permanent Work secondary views: **Board · Shoot calendar · Resources · Follow-ups**.

Primary action: **New production brief**. Main row shows **Production/deliverable, current cut, shoot/delivery date, approval blocker, producer**. Filters: **Brief incomplete · Shoot at risk · Cut awaiting approval · Extra scope**. Details include **Approved brief/quote; crew/equipment holds; current cut/feedback; revisions and costs**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Production type; client cohort; deliverable format; crew/resource category**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B03.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B03.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B03.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B03.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B03.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B03.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B03.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B03.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B03.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../media.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time final delivery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Approval wait | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Revision overrun | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Project contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Quote-to-booked conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Shoot readiness | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Crew/resource committed utilization | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Unapproved extra-scope cost | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per deposit-backed production; brief-to-quote and quote-to-paid; revision-adjusted contribution; repeat-client revenue**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Package has2 included revision rounds, deposit20000 on100000 total, crew A and camera C. Two projects compete for same interval. Cut v1 enters review; v2 supersedes it before v1 approval. A third requested revision exceeds allowance.

**Assert exact business results:** Only one project confirms shared resources; v1 approval cannot accept v2; one current review chase; approved in-scope revisions scheduled automatically; third revision creates priced exception without unauthorized scope increase; final delivery requires rights/link evidence; balance80000 until additional payments.

Additional sector acceptance requirements from the operating specification:

1. An ordinary package brief becomes a confirmed production and review sequence without a manager preparing reminders or manually moving administrative stages.
2. A new cut invalidates queued v1 reminders and customer approval of v1 cannot release v2.
3. An included revision is scheduled automatically; an extra deliverable outside allowance creates one exception with proposed price and impact.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-media-growth.test.mjs
node --test tests/hasib-orders.test.mjs tests/hasib-industry-ui.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B03-media.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
