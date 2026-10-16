# Legal services: agent build specification

Task **B23** · sector ID `legal` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **restricted consultation + engagement case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Legal services product/dashboard specification](../legal.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New restricted legal intake/consultation/engagement case and conflict-clearance artifacts. Explicitly extend scheduling adapter with legal gates; no generic public matter record.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order/payment ledger; generic booking operations currently reject legal despite pack module flags; proposed case scheduling bridge**.

Own these **proposed new** sector files:

- `config/ascend-growth/legal.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/legal.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/legal.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-legal-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Practice-specific educational content, trusted professional referrals and relevant local search.
- **Offer / next action:** An administrative consultation/intake within the firm's service scope.
- **Deterministic fit:** Practice area, jurisdiction/service scope, contact and requested time; restricted conflict intake in its own workflow.
- **Verified conversion sequence:** Attended consultation → conflict-cleared accepted engagement.
- **Repeat/referral route:** Professional relationship referrals and permitted client check-ins tied to actual service needs.
- **First experiment:** Compare the current general contact flow with practice-area-specific administrative intake; judge eligible accepted engagements, preserving conflict and privacy gates. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L04, P03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Professional conflict decisions and advice remain explicit; confidential case data stays out of ad audiences and model lead-value guesses.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| practiceArea / jurisdiction | approved service catalog and jurisdiction enum | scope-fit only, no legal merits scoring |
| contactRef / preferredWindow | verified contact and UTC interval | administrative appointment scheduling |
| conflictPartyRefs | restricted references, not marketing fact strings | authorized conflict process only |
| conflictStatus / reviewerEvidence | pending/cleared/declined plus professional reference | AI cannot clear conflicts |
| engagementScope / termsRevision | versioned service scope and fee terms | accepted current engagement |
| deadlineRef / responsibleProfessional | verified source deadline and assigned authorized person | no AI-derived statutory deadline authority |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'legal'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed inquiry→conflict_pending→consultation_ready→consultation_attended→engagement_offered→engaged→active→closed; declined/withdrawn supported. Preliminary scheduling must not disclose matter details. Conflict clearance and signed engagement required for engaged conversion; professional advice remains outside marketing automation.

**Mutation/event wiring:** Admin inquiry→minimal missing facts; conflict process completion→consultation offer; attended consultation→engagement terms; client acceptance→onboarding/document checklist; verified tasks→reminders; matter closed→permitted general feedback without confidential detail.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `legal.intake_received` | Verified prospective-client identity and limited scope | MISSING_INPUT | Do not expose another client or matter |
| `legal.conflict_cleared` | Authorized professional's recorded disposition | QUOTE or REVIEW | No professional work allocation before required gates |
| `legal.engagement_accepted` | Current signed terms and required verification | EV | Client acceptance cannot substitute for professional review |
| `legal.document_due` | Authorized matter checklist/deadline | REVIEW | Stop on verified receipt or superseding requirement |
| `legal.deadline_changed` | Authoritative calendar entry with approving professional/source | SLA; CHECKPOINT | Unverified date conflicts escalate; never silently overwrite |
| `legal.filing_status` | Professional/system supplies accepted filing/status | EV | Submitted is not accepted or successful |
| `legal.invoice_due` | Approved ordinary invoice and current balance | BALANCE | Trust/client funds stay distinct; disputes suspend collection sequence |
| `legal.resolved_closed` | Professional records resolution and closure requirements | EV; FEEDBACK optional | Do not infer outcome or delete active obligations |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Handle administrative intake, appointments, document requests and source-backed matter status; relay approved professional communications without generating autonomous legal judgments.
**Hasib:** Maintain client/matter permissions, validate required onboarding gates, schedule authoritative deadlines with escalation, track documents and tasks, reconcile operational billing and calculate matter performance without exposing restricted data.
**Necessary human/source input:** Qualified professionals conduct conflict decisions, legal analysis, advice, filings and representation. They record/approve those professional facts once; routine administrative record creation, scheduling, chasing and reporting then execute automatically.

One-time standing configuration: service scope and fee schedules; authorized professional assignments; conflict/identity verification rules; court/calendar system of record; client access; document approval; billing and trust-fund separation. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Automation handles scheduling, documents and administrative chasing. Conflict judgment, advice and authoritative legal deadlines require responsible professional evidence.**

## 5. Six-tab UI wiring

Keep Chats · **Engagements / الارتباطات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Administrative engagement list**. Exactly these permanent Work secondary views: **Engagements · Consultations · Tasks · Follow-ups**.

Primary action: **New intake**. Main row shows **Restricted matter reference, intake stage, administrative blocker, owner, next action**. Filters: **Intake pending · Consultation due · Documents missing · Review needed**. Details include **Minimal intake metadata; staff-approved engagement; task dates; authorized billing reference**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Practice group; intake source; engagement type; administrative blocker**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B23.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B23.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B23.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B23.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B23.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B23.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B23.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B23.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B23.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../legal.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Intake response SLA | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Consultation-to-engagement conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Administrative blockers overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Approved receivables overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Billable utilization — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Realization — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Collection — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Unbilled work age — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per accepted eligible engagement; consultation-to-engagement; intake abandonment; collection-adjusted acquisition economics**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Contact requests two different matters, one conflicts and one clears. A consultation is attended but engagement terms remain unsigned. Intake includes opposing-party name.

**Assert exact business results:** Two restricted needs correctly scoped; no engagement conversion until cleared/signed; conflict detail never enters source/ads/log payload; no promotional follow-up for declined conflict; staff cannot read restricted case without assignment.

Additional sector acceptance requirements from the operating specification:

1. A deadline imported with a conflicting date cannot silently replace an approved calendar entry.
2. A prospective client cannot access matter documents before authorization.
3. Invoice payment cannot change a trust ledger or imply legal resolution.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-legal-growth.test.mjs
node --test tests/hasib-plans.test.mjs tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B23-legal.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
