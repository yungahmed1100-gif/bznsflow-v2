# Technology & software: agent build specification

Task **B19** · sector ID `technology` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **new project/service case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Technology & software product/dashboard specification](../technology.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New typed technology case for project or support contract; versioned scope/milestones/acceptance. No assumption GitHub, monitoring or helpdesk connector exists.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order_create/payment_record; proposed case/artifact/reservation operations**.

Own these **proposed new** sector files:

- `config/ascend-growth/technology.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/technology.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/technology.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-technology-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Problem-specific technical content, verifiable case studies, integration partners and permitted account-based outreach.
- **Offer / next action:** A relevant demo, discovery or scoped technical assessment under published terms.
- **Deterministic fit:** Business problem, environment/integration requirements, budget band, authority/timeline and implementation capacity.
- **Verified conversion sequence:** Attended relevant demo/discovery → accepted contract → activated service.
- **Repeat/referral route:** Contract renewals, usage-backed expansion where connected and customer referrals.
- **First experiment:** Compare generic demo signup with use-case-matched proof and relevant technical intake; judge accepted and activated accounts. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Professional-services evidence is a proxy, not product-led SaaS proof; a demo booking is not activation.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| intent / problem | enum implementation/integration/support/managed_service; text≤500 | route to relevant technical brief |
| environment / integrationRefs | bounded platform names and owned connection refs | never ingest passwords/API keys into lead facts |
| budgetBand / deadline / approverRef | stated range, UTC ms, verified authority | feasibility not guaranteed by AI |
| scopeRevision / acceptanceCriteria | integer≥1; array≤20 testable requirements | signed change control |
| milestones / supportSeverity | typed due/evidence links; severity from agreed policy | no uptime/security claim without measurements |
| activationEvidence / renewalAt | verified provisioning/acceptance ref; UTC ms | contract won and service activated separate |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'technology'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed discovery→scoped→proposed→accepted→implementation→validation→activated→closed; support issues have open→triaged→working→resolved→accepted subrecords. Scope acceptance and test evidence are required; auto-closing on unanswered messages is not resolution.

**Mutation/event wiring:** Demo attended→proposal follow-up; acceptance→milestones; missing access→secure input request; test result→validation; customer/system activation→conversion; SLA breach→exception; renewal uses contract dates.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `technology.request_received` | Verified customer and issue context | EV; MISSING_INPUT | Never ask for passwords/tokens in chat |
| `technology.incident_detected` | Authorized monitoring signal and correlation | EV; SLA | No root cause claim without evidence |
| `technology.triaged` | Validated severity and product/environment | CHECKPOINT | Customer urgency alone cannot rewrite contract severity silently |
| `technology.work_progress` | Engineer/tool supplies meaningful milestone | EV on material change; NO_PROGRESS internal | Elapsed time does not imply progress |
| `technology.change_ready` | Validated change with required checks/authority | REVIEW only if required; PRE_EVENT | No automatic production deployment outside configured authority |
| `technology.deployed` | CI/deployment system confirms version/environment | EV; CHECKPOINT | Failed health checks invoke only approved rollback runbook |
| `technology.resolved` | Verified recovery/fix and defined acceptance condition | REVIEW; FEEDBACK | Silence closure policy cannot fabricate customer satisfaction |
| `technology.renewal_due` | Current contract and usage/billing facts | RENEWAL; BALANCE | Dispute/security hold suppresses unrelated commercial sequences |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect reproducible support details without secrets, answer knowledge-backed questions, provide verified incident/release status and coordinate customer validation and renewal communication.
**Hasib:** Deduplicate/link tickets and incidents, apply SLA clocks, route technical tasks, run only authorized bounded runbooks, track releases and customer acceptance, calculate operational delivery/support metrics.
**Necessary human/source input:** Engineers solve novel defects and review changes where release policy requires; enter technical findings missing from tools. Routine ticket intake, routing, status updates and reminder/reporting work should be automatic.

One-time standing configuration: service catalog and SLAs; support severity definitions; customer environments/access; release authority and change windows; rollback/runbook rules; subscription terms and permitted renewals. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **AI may summarize diagnostics and propose runbooks; production credential or deployment changes require scoped authorization in that customer's environment.**

## 5. Six-tab UI wiring

Keep Chats · **Projects / المشاريع** · Customers · Broadcasts · Insights · Settings. Default Work view: **Delivery and support list**. Exactly these permanent Work secondary views: **Projects · Support · Milestones · Follow-ups**.

Primary action: **New project**. Main row shows **Project/service, milestone or support issue, due/SLA, client blocker, owner**. Filters: **Requirements missing · Awaiting acceptance · SLA risk · Renewal due**. Details include **Approved scope; versioned acceptance; support history; contract/cost**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Service/application; contract type; ticket priority; deployment-caused incidents**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B19.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B19.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B19.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B19.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B19.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B19.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B19.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B19.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B19.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../technology.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Accepted milestones on time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Support SLA attainment | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Client-blocked work | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Project/contract contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Contract renewal | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Change lead time / deployment frequency — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Failed deployment recovery time — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Change fail / deployment rework rate — optional | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per accepted/activated account; demo-to-contract; contribution-based payback; retained accounts at W**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Contract100000 has two milestones. A failed integration test arrives after an optimistic status message; client approves scope v1 but v2 adds work. Support incident is reopened after apparent fix.

**Assert exact business results:** No activated conversion while required test fails; v1 approval doesn't authorize v2; invoice/payment follow actual milestone terms; reopened issue preserves history and prevents false first-time resolution KPI.

Additional sector acceptance requirements from the operating specification:

1. A merge event cannot mark a customer incident resolved before deployment/recovery evidence.
2. Duplicate monitoring alerts become one incident with linked tickets.
3. An agent without release authority cannot deploy even if a customer asks in chat.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-technology-growth.test.mjs
node --test tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B19-technology.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
