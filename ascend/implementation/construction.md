# Construction: agent build specification

Task **B11** · sector ID `construction` · status **not_started** · source inspection 2026-10-10.
Current registry: **enabled (source flag; not a new production audit)**; current owner workflow `construction`; implementation family: **existing project controls**.
Dependencies: **F01–F06 + F08 synthetic ingress**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Construction product/dashboard specification](../construction.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

Existing constructionProjects, milestones, progress, costs, variations, commitments, claims, retention and quality/risk records remain authoritative.

Existing files to inspect and extend only as required:

- [convex/hasib/constructionState.js](../../convex/hasib/constructionState.js)
- [convex/hasib/workflowSchema.ts](../../convex/hasib/workflowSchema.ts)
- [src/components/hasib/ConstructionDashboard.jsx](../../src/components/hasib/ConstructionDashboard.jsx)

Existing operations / explicit gaps: **construction_project_save, construction_baseline_approve, construction_milestone_save, construction_progress_save, construction_variation_save, construction_variation_status, construction_claim_save, construction_claim_status, construction_retention_release**.

Own these **proposed new** sector files:

- `config/ascend-growth/construction.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/construction.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/construction.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-construction-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Keep the currently enabled pack functional when the new growth gate is off.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Project-type case studies, architect/consultant partnerships, referrals and permitted tender/RFQ feeds.
- **Offer / next action:** A scoped site survey or project consultation with relevant proof.
- **Deterministic fit:** Project type, site, scope, drawings availability, budget band, start date, procurement process and delivery capacity.
- **Verified conversion sequence:** Qualified opportunity → completed site survey → accepted contract.
- **Repeat/referral route:** Milestone-based relationship contact, related project referrals and contracted maintenance where offered.
- **First experiment:** Compare generic company proof with project-type-matched case evidence before the same site-survey CTA; judge qualified surveys and mature accepted proposals. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03, L18** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Long sales cycles need mature cohorts; a submitted bid is not won revenue and generic contractor data is only a proxy.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| projectType / siteRef / scope | approved category; verified site; bounded scope summary | growth intake then existing project fields |
| drawingRevision / surveyAt | artifact version and verified survey event | RFQ/site-survey completeness |
| budgetBand / startAt / tenderDueAt | stated minor-unit range and UTC dates | unknown budget remains unknown |
| procurementRoute / decisionProcess | enum tender/direct/framework and bounded roles | no assumption contact can sign contract |
| baselineVersion / contractEvidence | current approved baseline and signed scope reference | existing contract amounts/dates |
| variation / progressEvidence | approved change and source-certified progress refs | not elapsed-time progress |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'construction'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Accepted contract and approved baseline establish won outcome, not sent estimate. Costs, commitments, approved variations and claims stay distinct. Only authorized accepted change adjusts contract/budget; issued claim is not cash. Retention release uses contract condition and evidence.

**Mutation/event wiring:** Site survey completed→proposal follow-up; accepted contract→project creation/link; milestone evidence→client checkpoint; variation awaiting decision→versioned approval chase; overdue claim→BALANCE; defect→exception and promotional suppression.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `construction.project_approved` | Authoritative signed/approved scope and baseline | MISSING_INPUT | AI extraction cannot silently approve a contract baseline |
| `construction.milestone_progress` | Site/system reports verified actuals | CHECKPOINT | Elapsed time cannot mark physical work complete |
| `construction.procurement_needed` | Approved requirement hits lead-time threshold | REVIEW | Purchase commitment outside authority becomes exception |
| `construction.goods_received` | Warehouse/site verifies quantity and condition | EV optional | Partial/damaged receipt cannot satisfy full delivery |
| `construction.variation_requested` | Versioned extra scope entered | REVIEW | Submitted is not approved revenue; formal change authority remains |
| `construction.approval_overdue` | RFI/submittal/variation deadline passes | REVIEW | Do not emit binding legal notices without authorized template/authority |
| `construction.certificate_due` | Authorized inspection/certificate evidence exists | BALANCE | No invoice for unverified certification |
| `construction.project_closed` | Required completion/sign-off facts received | EV; RENEWAL only if contract requires | Closure never discards retention or unresolved defects |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Request missing project inputs, coordinate routine supplier/client decisions, communicate verified progress and issue approved administrative reminders.
**Hasib:** Generate milestone/dependency tasks, monitor approved baselines, reconcile commitments and receipts, register variation versions, assemble certified balances and produce automated exception digests.
**Necessary human/source input:** Site staff report physical progress, inspections and receipts when systems do not. Engineers/authorized signatories certify work and decide technical/contractual changes outside standing authority.

One-time standing configuration: approved project baseline; task/dependency templates; delegated commercial limits; supplier terms; standard notice templates; approved cost codes; certification/retention rules; role authority. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Preserve procurement/quality/risk controls from original spec. AI may consolidate reports and chase evidence; engineering certification, site measurement and scope authority remain factual/professional inputs.**

## 5. Six-tab UI wiring

Keep Chats · **Projects / المشاريع** · Customers · Broadcasts · Insights · Settings. Default Work view: **Project risk list**. Exactly these permanent Work secondary views: **Projects · Milestones · Procurement · Follow-ups**.

Primary action: **New project**. Main row shows **Project, next milestone, schedule risk, approval exposure, project manager**. Filters: **At risk · Approvals overdue · Materials due · Receivables overdue**. Details include **Approved baseline; variations; commitments; certificates and retention**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Project type; milestone phase; procurement cause; approved vs original baseline**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B11.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B11.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B11.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B11.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B11.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B11.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B11.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B11.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B11.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../construction.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Milestones on time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Unapproved variation exposure | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Overdue certified receivables | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Forecast gross contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Approval turnaround | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Procurement on-time delivery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Rework cost share | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Retention due | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per qualified project; survey-to-proposal; matured proposal win rate; expected versus realized contribution; sales cycle**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Base contract1000000, unapproved variation100000, approved variation50000, claim200000 with retention10000, receipt190000.

**Assert exact business results:** Contract value1050000, never1150000; claim cash190000 and retained10000 tracked separately; no won conversion before accepted baseline/contract; progress unchanged without site evidence; duplicate claim event does not duplicate receipt.

Additional sector acceptance requirements from the operating specification:

1. Approved baseline automatically creates dependencies, due tasks and reminders without a planner re-entering every milestone.
2. Unapproved variation costs surface as exposure while approved revenue remains unchanged.
3. A certification correction cancels stale payment reminders and recalculates only affected balances.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-construction-growth.test.mjs
node --test tests/hasib-construction.test.mjs tests/hasib-construction-load.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B11-construction.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
