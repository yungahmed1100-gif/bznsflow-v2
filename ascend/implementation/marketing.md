# Marketing & agencies: agent build specification

Task **B18** · sector ID `marketing` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new retainer/deliverable case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Marketing & agencies product/dashboard specification](../marketing.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New marketing case with retainer periods, deliverables and exact-version approvals; campaign client outcomes are separate from Ascend's own acquisition ledger.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order_create/payment_record; proposed case/artifact operations**.

Own these **proposed new** sector files:

- `config/ascend-growth/marketing.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/marketing.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/marketing.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-marketing-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Niche proof/case studies, educational content, partner referrals and permitted target-account outreach.
- **Offer / next action:** A scoped discovery or assessment of a stated marketing problem; no invented free deliverable.
- **Deterministic fit:** Business fit, actual need, current channels, budget band, decision process, timeline and delivery capacity.
- **Verified conversion sequence:** Attended discovery → accepted paid project/retainer.
- **Repeat/referral route:** Retainer renewal, expansion from demonstrated needs and client referrals.
- **First experiment:** Compare broad agency positioning with one niche/problem and verified relevant case; judge paid projects/retainers after attended discovery. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Do not promise attributable revenue from impressions or self-reported platform ROAS.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| engagementType / serviceLines | enum project/retainer/audit and approved services≤20 | scope template |
| clientGoal / channels | bounded stated objective and approved channel enum[] | no guaranteed return promises |
| budgetBand / authorityRef / startAt | stated range, verified approver, UTC ms | fit from actual capacity and approved minimums |
| deliverables / approvalSlaHours | typed items/revisions/dueAt; integer1..720 | current version and approver |
| retainerPeriod / allowance | UTC start/end; bounded units by service | usage tied to actual work evidence |
| clientAdConnectionRef | optional owned credential reference | never use BznsFlow ad account for client |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'marketing'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed discovery→proposal→accepted→active→review→delivered→closed with recurring period lifecycle. Only accepted current scope/deposit activates work. Approval of one creative revision cannot approve another. Publishing requires separately authorized connector/action; case completion cannot claim ad result.

**Mutation/event wiring:** Discovery attended→proposal; accepted retainer→deliverable plan; ready creative→REVIEW; overdue client input→MISSING_INPUT; accepted output→handoff; period consumption/expiry→renewal. Excess scope creates priced exception.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `marketing.brief_accepted` | Complete goals, scope and authority | MISSING_INPUT; QUOTE | No invented performance guarantee |
| `marketing.assets_due` | Plan-specific missing approved asset | REVIEW | Received or replaced asset cancels old request |
| `marketing.creative_review` | Current draft passes configured checks | REVIEW | Standing preapproved variants need no repeated staff approval |
| `marketing.approved_scheduled` | Accepted version and authorized budget/channel | EV; CHECKPOINT | Revised content invalidates former approval |
| `marketing.live` | Platform confirms actual publication/delivery | EV | Scheduled is not published |
| `marketing.performance_checkpoint` | Fresh platform and CRM data with coverage | CHECKPOINT internal; scheduled client report | Missing attribution cannot become claimed causal lift |
| `marketing.budget_exception` | Actual spend/error exceeds configured bound | SLA | No autonomous expansion of budget or unsupported claims |
| `marketing.period_closed` | Matured reporting window and accepted deliverables | RENEWAL; BALANCE | Open dispute pauses commercial chasing |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Gather briefs/assets, coordinate client decisions, send factual campaign/project updates and explain verified reports using defined attribution language.
**Hasib:** Version scopes/budgets, create delivery tasks, check assets and approvals, schedule authorized launches, reconcile spend/results and produce source-linked reporting and renewal obligations.
**Necessary human/source input:** Create or professionally approve novel claims/strategy where policy requires; approve material budget/scope changes outside standing authority; enter offline outcomes unavailable through CRM. Routine reporting, scheduling and client chasing are automated.

One-time standing configuration: service packages and deliverables; approved brand/claims; client budget and platform authority; audience consent; creative approval boundaries; experiment guardrails; attribution model and reporting windows. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Acquisition follows evidence-led case studies and discovery fit, but public case study needs client permission and accurate outcome evidence.**

## 5. Six-tab UI wiring

Keep Chats · **Client work / أعمال العملاء** · Customers · Broadcasts · Insights · Settings. Default Work view: **Deliverable approval board**. Exactly these permanent Work secondary views: **Board · Calendar · Retainers · Follow-ups**.

Primary action: **New client brief**. Main row shows **Client/deliverable, current version, due date, approval age, account owner**. Filters: **Assets missing · Ready for review · Approval overdue · Renewal due**. Details include **Approved scope; deliverable versions; change requests; retainer and cost**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Engagement type; client cohort; deliverable type; connected campaign source**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B18.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B18.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B18.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B18.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B18.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B18.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B18.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B18.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B18.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../marketing.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time accepted deliverables | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Client approval backlog | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Engagement contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Retainer renewal | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Scope overrun | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Proposal conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Qualified client leads — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Attributed ROAS / CAC — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per qualified opportunity; attended-discovery-to-paid; retained gross contribution; sales cycle**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Retainer includes8 deliverables. Client accepts7 and requests3 extra. Creative v2 supersedes v1 while approval reply references v1.

**Assert exact business results:** Usage7 accepted out of8 included; extras do not silently become free or billed; stale approval rejected; one active review reminder; retainer cash is not attributed client ad revenue.

Additional sector acceptance requirements from the operating specification:

1. Replacing approved creative prevents the old version from publishing.
2. Duplicate platform events do not double-count spend or conversions.
3. A disconnected analytics source marks the report incomplete instead of claiming zero results.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-marketing-growth.test.mjs
node --test tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B18-marketing.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
