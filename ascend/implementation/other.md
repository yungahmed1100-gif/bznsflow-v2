# Other services — explicit fallback: agent build specification

Task **B25** · sector ID `other` · status **not_started** · source inspection 2026-10-10.
Current registry: **pending**; current owner workflow `orders`; implementation family: **bounded configurable service case**.
Dependencies: **F01–F06 + F08 synthetic ingress + F07**. Follow the [queue](README.md), [foundation contracts](shared-foundation.md), [test runbook](agent-runbook.md) and [engineering gates](engineering-pack.md).

Read [Other services — explicit fallback product/dashboard specification](../other.md) in full before editing. Its existing operational controls, KPI formulas, follow-up scenarios, eight event rules and four additional workflow areas remain requirements. This file adds engineering instructions; it does not replace those details or claim implementation.

## 1. Scope, current code and ownership

New bounded service-case template only when a named existing sector does not fit. Do not route unknown/misspelled industry IDs here silently.

Existing files to inspect and extend only as required:

- [convex/hasib/ordersState.js](../../convex/hasib/ordersState.js)
- [config/hasib-packs.js](../../config/hasib-packs.js)
- [config/layla-qualification.js](../../config/layla-qualification.js)

Existing operations / explicit gaps: **Existing catalog/order/payment; proposed typed case operations under an explicitly selected subtype**.

Own these **proposed new** sector files:

- `config/ascend-growth/other.js`: field metadata, intent identity, fit/offer rules, event/profile bindings, KPI IDs; complete EN/AR labels.
- `convex/hasib/growthAdapters/other.js`: domain bridge, evidence guards and conversion predicates.
- `tests/fixtures/ascend/other.mjs`: two-tenant fixture factory using fake clock and owned IDs.
- `tests/ascend-other-growth.test.mjs`: API/domain/queue/metric integration scenarios below.

Use shared components and rules rather than creating another dashboard or scheduler. Touch shared registry/schema/validators/role policy only to register this adapter and its typed fields. Preserve unrelated edits and retain regressions for already completed sectors. Current pack access is restricted: use the existing synthetic preview harness for tests; do not flip the live registry flag to make tests pass.

## 2. Acquisition setup and first usable release

- **Where leads originate:** Select channels from the actual buying process: local intent, catalog commerce, professional relationship or account/RFQ.
- **Offer / next action:** One explicit, feasible next action tied to the configured service.
- **Deterministic fit:** Named subtype, real need, fit, timing and capacity; choose only essential questions.
- **Verified conversion sequence:** A configured verified business milestone followed by completed paid service.
- **Repeat/referral route:** Only repeat/referral journeys that match the real business and permission.
- **First experiment:** Choose one explicit subtype and test one meaningful offer/destination change against its verified outcome; do not combine unrelated industries into one result. This is a proposed test, not authority to buy ads or contact real people.

Start with current inbound source metadata, declared/manual source and fake signed form/provider events. Store source/medium/campaign/ad/creative/offer/referral IDs when actually supplied. Missing identifiers remain unknown. No connector is assumed from the strategy above. Reuse the shared source adapter interface; a new real provider is an additional gated F08 task.

Practice basis: evidence IDs **L03, P01** in [lead-generation evidence](../lead-generation-evidence.md), plus the original sector's research links. These references inform the workflow; local baselines and experiments determine targets. Limit: Other is not an automatic all-industry lead engine; establish a subtype and local evidence before claiming best practice.

## 3. Field contract and mapping

Below are logical fields; map existing columns first and add only missing typed fields. Common validated primitives, bounds, currency, UTC, tenant ownership, artifact references and API rules are in the foundation. Nullable unknowns remain unknown; a field becomes mandatory at the specified transition, not automatically at first contact.

| Logical field | Type and validation | Existing mapping / use |
|---|---|---|
| subtype / templateVersion | manager-selected approved service subtype and schema version | required before enabling automation |
| intent / requiredFacts | bounded descriptor-defined typed fields≤12 | no arbitrary unvalidated JSON |
| serviceId / capacityPolicy | owned catalog ref and explicit resource/lead-time rule | cannot infer service duration/capacity |
| quotePolicy / acceptanceEvidence | versioned limits and current customer acceptance | standing policy for ordinary work |
| conversionDefinition / completionEvidence | approved milestone predicate and source reference | no default won-on-reply rule |
| repeatInterval / channelPurpose | optional integer1..365 and consent purpose | disabled until meaning is configured |

Descriptor implementation must explicitly list for each field: stable key, EN/AR label, type, maximum size, source, visibility role, required-at transition and retention class. Add a discriminated `sectorId:'other'` validator branch to growth facts/case payload; reject payloads for another sector. Evidence fields accept owned references with actor/time/version, not arbitrary strings that bypass guards.

Intent identity is contact + sector + the distinguishing service/product/project/date/device fields above. Provider-event dedupe and opportunity dedupe are separate. One person can have multiple genuine needs. A repeated provider event returns the same record; changed amount/fields under the same request ID returns conflict.

## 4. Workflow, queue hooks and human boundary

**Authoritative transition rules:** Proposed inquiry→needs_input→eligible→quoted→accepted→scheduled→completed→closed, with declined/cancelled. Manager config must define mandatory facts, safe price bounds, capacity, actual completion evidence and KPI denominator. Sensitive/regulated subtype blocks general template until dedicated policy reviewed.

**Mutation/event wiring:** Generate only configured event profiles: missing fields, quote decision, appointment/work milestone, completion/balance and eligible repeat. An unmapped event or unknown subtype becomes an exception rather than generic promotional messaging.

Implement events after validation and alongside successful state writes in the same transaction. Register exact event names in the descriptor; map aliases from existing domain code to the product event IDs below once. The outbox key includes tenant, lifecycle, event, step and relevant source version. UI polling must never emit business events.

| Required event ID | Evidence prerequisite | Cadence selection | Stop/invalidation assertion |
|---|---|---|---|
| `other.inquiry` | Verified contact and configured requirements | MISSING_INPUT | Unsupported service goes to scoped clarification |
| `other.qualified` | All configured eligibility conditions satisfied | QUOTE | Do not invent qualification rules |
| `other.accepted` | Exact current scope accepted and required conditions met | EV | No double allocation or unapproved price |
| `other.started` | Authoritative real-world start fact | EV optional; SLA | Time passing alone cannot start work |
| `other.blocked` | Verified blocker and dependency | CHECKPOINT; EV | No guessed ETA |
| `other.changed` | Authorized scope/promise revision | REVIEW | Old consent does not cover material new terms |
| `other.completed` | Required trusted completion evidence | EV; COLLECTION if relevant | No auto-completion merely to improve KPI |
| `other.closed` | Verified fulfillment and current balance/dispute state | BALANCE; FEEDBACK; RENEWAL | No generic campaign without defined purpose and permission |

Each row needs an independently named assertion in the sector test file: event without evidence refuses advancement; qualifying event queues the correct step; replay adds no duplicate; stop condition suppresses a queued step. Resolve each referenced cadence using the existing [16-profile contract](../automation-contract.md); new one-time reminders use an explicit policy checkpoint plus EV, not an undocumented profile name.

**Layla:** Collect structured requirements, explain only the configured catalog, request missing facts, communicate verified work status and handle routine follow-ups for the defined business subtype.
**Hasib:** Validate the configured adapter, enforce its states and authority, create durable obligations, reconcile integration facts and calculate only metrics whose inputs and meanings have been defined.
**Necessary human/source input:** Supply missing physical or professional facts and decide exceptions outside explicit standing policy. The subtype must define these before enabling automatic execution; unspecified authority is not unrestricted authority.

One-time standing configuration: explicit business subtype; approved service/product catalog; capacity and promise rules; lifecycle meaning; authoritative integrations; contact consent; pricing/exception authority; KPI definitions and required professional gates. Expose missing setup as a specific blocker with owner and next input. Routine quote calculation, reminders, routing, record creation and reporting run automatically inside those bounds. Don't add a manager approval button to every step.

Sector-specific implementation constraint: **Ship Other last. Its flexibility must not become a bypass for missing sector adapters, approvals, source evidence or consent.**

## 5. Six-tab UI wiring

Keep Chats · **Work / الأعمال** · Customers · Broadcasts · Insights · Settings. Default Work view: **Confirmed service-work list**. Exactly these permanent Work secondary views: **Work list · Schedule · Services · Follow-ups**.

Primary action: **New request**. Main row shows **Request/work item, approved stage, owner, promise, next action**. Filters: **Unassigned · Quote pending · Due today · Blocked**. Details include **Confirmed business model; approved quote; work timeline; authorized costs/balances**. Put opportunity/attribution as record drawer sections and customer history; do not add another primary tab or fifth permanent Work view.

- Chats: latest known intake facts, linked work and next permitted action; no fabricated live status.
- Customers: source, fit reasons, distinct opportunities, marketing eligibility, completed and repeat history.
- Broadcasts: approved audience/offer and campaign delivery state; channel eligibility checked at send.
- Insights: source → eligible → verified milestone → paid/repeat funnel, costs and existing sector KPIs; breakdowns **Configured service type; lead source; work cohort; blocker cause**.
- Settings: sources, offers, hours, capacity/price policy, cadence, consent/templates, field visibility and connector health. Managers set policies; staff see assigned operational inputs.
- Follow-ups: current source state/version, next due action, why queued/suppressed, receipt state, owner only for exceptions and last successful refresh. Use shared 10s visible polling with stale indication; no “live” claim without source updates.

## 6. Build steps — execute in order

| Step | Edit / behavior | Completion evidence |
|---|---|---|
| B25.1 | Inspect files above; record existing statuses, operations and missing fields; select descriptor's exact intent discriminator | Source symbol map and gap list; dependencies passed |
| B25.2 | Add sector fixture and failing field/fit/guard tests, then descriptor/validator branch | Invalid fields and foreign IDs refused; unknown vs ineligible distinguished |
| B25.3 | Register adapter through shared registry, API shaper, entry validator, dispatcher and staff policy | Actual createHasibApi → hasibArgs → executeHasib path passes; no direct mutation bypass |
| B25.4 | Implement create/link work and required operational guards using existing domain authority or typed case runner | One work record per request; concurrent/stale writes safe; accepted price/scope preserved |
| B25.5 | Wire every event row atomically to shared jobs, conversion evidence and suppression | Named assertions for all 8 primary events; no duplicate delivery authority |
| B25.6 | Add sector Work mapping, customer drawer, source/settings controls and Follow-ups timeline | Six-tab EN/AR views, roles, deep links, loading/error/stale states |
| B25.7 | Implement exact 8 operational KPI contracts plus acquisition/source economics | Golden fixture values, reversal, unknown cost and denominator tests; drill-down IDs owned |
| B25.8 | Exercise original 3 follow-up scenarios, extra workflow controls, new scenario below and shared failure matrix | Dated automated report; all unfinished requirements listed |
| B25.9 | Run regression/type/build/browser checks as applicable; rehearse shadow mode and feature disable | No regressions in completed sectors/Catalyst; evidence and next task recorded |

Don't stop at the acquisition slice if operational evidence needed for conversion is missing. Explicitly build or report that dependency; synthetic green tests cannot make an absent carrier, supplier, clinical or production source live.

## 7. KPI and conversion acceptance

Keep all eight formulas in [the sector specification](../other.md); their source/clock/cohort definitions take precedence over convenient UI averages. Store metric definition version; calculations come from typed events/domain rows and reversible payment evidence.

| Metric requirement | Existing named KPI | Implementation assertion |
|---|---|---|
| K01 | **Headline** · Qualified-to-accepted conversion | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K02 | **Headline** · Work completed on time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K03 | **Headline** · Overdue actions | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K04 | **Headline** · Approved balances overdue | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K05 | Diagnostic · Quote decision time | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K06 | Diagnostic · Known-cost contribution | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K07 | Diagnostic · Repeat business | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |
| K08 | Diagnostic · Unresolved service issues | Implement the exact numerator/denominator, timing and data-quality rules in the product spec; assert success, empty data and correction/reversal. |

Acquisition additions: **One verified acquisition outcome, its cost, mature conversion, contribution and repeat outcome**. Identify paid-spend completeness and the exact maturity/cohort window. Do not mix booking, attendance, sale, cash receipt, contract value and contribution. Counts use event time in the tenant timezone; original timestamps are retained. Minimum acquisition arithmetic fixture is in the foundation; add sector evidence predicates before reusing it.

## 8. Exact synthetic journey and failure assertions

Fixture clock2026-10-12T05:00:00Z; currency/precision set explicitly; fake contacts and transports only. Seed manager/staff/Catalyst/foreign tenant and current policy with `mode:'shadow'` first.

**Arrange and drive through real handlers:** Subtype A has a required siteRef; subtype B does not. Unknown sector ID is submitted; one accepted case has no completion evidence. A repeated contact request has genuinely different date.

**Assert exact business results:** A remains needs_input; B can proceed; unknown sector ID rejected; no completed conversion without source evidence; distinct date creates new need, duplicate same intent does not; repeat sequence off when interval absent.

Additional sector acceptance requirements from the operating specification:

1. Automatic mode stays unavailable until the subtype declares sources, lifecycle and authority.
2. Unsupported domain judgments cannot be inferred from a generic service request.
3. A completion event lacking configured evidence cannot close work or trigger a success message.

For every recorded conversion assert `opportunityId, domainLink, milestone, sourceEventId, occurredAt, attributionModelVersion`; replay produces the same key. A queued job must expose policy/source version and stop reason. A conversion with no verified evidence must be refused. Test gate-off, cross-tenant IDs, role leakage, customer opt-out after enqueue, takeover, delayed provider result, stale approval, payment correction and deletion using the common runbook.

## 9. Commands, completion and rollback

After creating the proposed test file:

```sh
node --test tests/ascend-other-growth.test.mjs
node --test tests/hasib-packs-gate.test.mjs tests/blue-qualification.test.mjs
npm run typecheck:convex
```

Also run shared foundation tests and the relevant browser/build checks in [agent-runbook.md](agent-runbook.md). Existing regressions are baseline coverage, not proof of these new features. Network is stubbed and unexpected fetch fails; no live send/receipt tests.

Write proposed evidence `ascend/implementation/evidence/B25-other.md`: requirement→source→assertion mapping, dated commands/results, actual limitations, migration compatibility and next task. Status may become verified_locally only after required tests pass. Deployment, provider eligibility, production authentication/load and actual conversion performance remain separately evidenced.

Disable only this sector's growth policy to stop new work/messages; cancel or suppress unsent jobs with a reason. Preserve existing orders/work, payments, source history and receipts. Keep additive data compatible with old readers. A UI rollback restores original navigation through the feature gate. Do not reverse a completed external effect by deleting its record, loosen existing pack gates or deploy from this checklist.
