# Finance & accounting: agent build specification

Task **B24** · sector ID `finance` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **restricted recurring service case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Finance & accounting product/dashboard specification](../finance.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New finance/accounting engagement and period case. Select service subtype explicitly; no automated lending, investment suitability or regulatory advice engine.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)

Existing operations / explicit gaps: **Existing order/payment ledger; proposed case/artifact scheduling bridge; finance is not in current generic booking allowlist**.

Own these **proposed new** sector files:

- `config/ascend-growth/finance.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/finance.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/finance.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-finance-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Niche educational content, business/professional referrals, partner networks and service-specific search.
- **Offer / next action:** A scoped business/accounting consultation or accepted standard package.
- **Deterministic fit:** Business/service type, period/deadline, scope, jurisdiction and permitted capacity; initial intake avoids financial distress details.
- **Verified conversion sequence:** Attended consultation → accepted engagement → first completed billed service.
- **Repeat/referral route:** Recurring engagement renewal, permitted related-service needs and professional referrals.
- **First experiment:** Compare generic firm content with one actual client-segment/service problem and scoped consultation; judge accepted engagements and completed first service. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03, P03** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Do not upload sensitive financial circumstances to ad systems or infer creditworthiness/investment suitability.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| serviceType / jurisdiction | enum bookkeeping/accounting/tax_admin/payroll/advisory_admin; permitted jurisdiction | policy scope, not blanket financial-services support |
| businessType / periodStart / periodEnd | approved customer type and valid dates | monthly/quarterly/year scope |
| volumeBand / deadlineEvidence | declared transaction band and verified deadline ref | pricing/workload fit; deadlines supplied by professional/source |
| engagementRevision / approverRef | current accepted scope and authorized client | standing service policy |
| documentChecklist / verificationStatus | restricted evidence refs and pending/complete/review | AI extraction is provisional |
| professionalSignoff / filingReceipt | authorized evidence references | completed service is not filed until receipt exists |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'finance'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed inquiry→scoped→consultation→offered→engaged→collecting→processing→review→delivered→closed; missing_documents/on_hold visible. Accepted engagement and required verification precede work; professional signoff precedes final release where needed. Filing completion needs actual receipt, not date or generated document.

**Mutation/event wiring:** Fit inquiry→consultation/proposal; accepted engagement→period checklist; missing input→consolidated document reminder; current professional review→exception only if judgment required; verified filing/delivery→service conversion; next period→new lifecycle by unique client+period+service key.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `finance.engagement_request` | Verified client and service/period | MISSING_INPUT; QUOTE | Unsupported services require professional scope decision |
| `finance.engagement_active` | Accepted terms and required verification | EV | No assumed filing deadline from unverified model memory |
| `finance.records_missing` | Checklist compared with received source records | REVIEW | New receipt cancels the corresponding request |
| `finance.reconciliation_exception` | Deterministic mismatch with source references | CHECKPOINT | Do not fabricate a balancing entry |
| `finance.review_ready` | Required processing and validation complete | SLA internal | Automated checks cannot impersonate reviewer approval |
| `finance.client_authorization` | Current completed deliverable needs client consent | REVIEW | Revision invalidates obsolete authorization |
| `finance.submitted_delivered` | Authorized submission and system receipt | EV; CHECKPOINT | Submitted is not accepted or funds settled |
| `finance.closed_billed` | Approved deliverable and invoice state | BALANCE; FEEDBACK | Dispute or correction opens linked lifecycle without rewriting history |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect administrative requirements, request missing source documents, explain recorded engagement progress and send approved deadline/billing communications without unsupported financial advice.
**Hasib:** Create engagement and period records, import/deduplicate transactions, run deterministic reconciliation checks, track deliverables/deadlines, maintain review evidence and calculate operational KPIs.
**Necessary human/source input:** Qualified professionals resolve accounting judgments, certify/sign submissions and make regulated or consequential advice decisions. Staff enter only unavailable source facts; routine ingestion, document chasing, arithmetic and status communication are automated.

One-time standing configuration: service catalog and engagement limits; client verification/access; document and reconciliation rules; filing authority; approved deadline sources; fee/billing policy; separation of preparer, reviewer and client authorization where required. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Do not market credit or financial distress using intake facts. If customer selects a regulated subtype outside approved scope, block that automation and require a dedicated extension.**

## 5. Six-tab UI wiring

Keep Chats · **Engagements / الارتباطات** · Customers · Broadcasts · Insights · Settings. Default Work view: **Period-work board**. Exactly these permanent Work secondary views: **Board · Period calendar · Documents · Follow-ups**.

Primary action: **New engagement**. Main row shows **Client/period, work stage, readiness, review owner, approved due date**. Filters: **Documents missing · Ready to prepare · Review due · Delivery overdue**. Details include **Scope/period; checklist statuses; preparation/review history; WIP/billing**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Service type; reporting period; client cohort; internal vs client delay**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B24.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B24.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B24.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B24.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B24.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B24.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B24.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B24.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B24.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../finance.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · On-time engagement delivery | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Document readiness | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Work awaiting review | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Engagement contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Ready-to-delivery cycle | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · First-pass review acceptance | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Unbilled approved work | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Overdue receivables | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **Cost per retained engagement; consultation-to-accepted; first-service completion; mature contribution/payback**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Monthly engagement has12 periods; scheduler retries March creation. Documents for March arrive after a reminder is queued; draft return generated but no filing receipt.

**Assert exact business results:** One March case; satisfied reminder suppressed; no filed status/conversion from draft; professional review required only at appropriate judgment step; bank/account data excluded from ads/source metadata; twelve period charges are not twelve acquired clients.

Additional sector acceptance requirements from the operating specification:

1. Duplicate bank imports create no duplicate transactions or reminders.
2. An unresolved reconciliation gap cannot be hidden by a generated journal entry.
3. Filing submission and authority acknowledgment remain separate outcomes; revision requires current authorization.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-finance-growth.test.mjs
node --test tests/hasib-plans.test.mjs tests/hasib-orders.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B24-finance.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
