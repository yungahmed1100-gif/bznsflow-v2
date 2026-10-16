# Manufacturing — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/manufacturing.md). Read this product specification alongside that build file.

التصنيع · Sector ID: `manufacturing` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Pending**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Convert complete RFQs into reliable, quality-approved output while exposing capacity, scrap and delivery risk.

Generic stock/order foundations are reusable where appropriate, but manufacturing RFQs, specification versions, routings, production orders, inspection and equipment events are not an enabled pack. OEE requires machine/time data that conversations cannot supply.

## Industry evidence and recommended practice

Vorne provides the OEE measurement method, while SCOR supports balanced fulfillment measures. Neither justifies a universal 85% OEE target here. Proposed practice: establish accurate production and quality events first, then compare similar equipment and product families. Sources: [Vorne calculating OEE](https://www.oee.com/calculating-oee/); [ASCM SCOR performance framework](https://scor.ascm.org/performance/introduction). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Production · Customers · Broadcasts · Insights · Settings**.

**Production / التصنيع** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Production, retaining the conversation return context. |
| Production | Production-order schedule. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New RFQ**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Production; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Production: daily execution

**Secondary views:** Orders · RFQs · Quality · Follow-ups. These remain within the single `work` destination. Default: **Production-order schedule**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Order/spec revision, release state, material blocker, inspection state, due date. **Quick filters:** RFQ incomplete · Sample pending · Material shortage · Quality hold. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Specification/BOM revision; approval evidence; production/inspection; lot costs. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **On-time in-full orders · First-pass yield · Production orders past due · Order contribution**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Product family; process/equipment; order type; defect/scrap cause. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Production and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **project**; registry status: **pending**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `plans`, `quotes` |
| Planned | `demand`, `digest` |
| Off for this pack | `appointments`, `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `materials` (Materials); `subcontract` (Subcontractors); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** RFQ/specification → manufacturability review → quote → purchase-order acceptance → material/capacity plan → production → inspection → released dispatch → delivery.

**Required record fields:** RFQ and spec revision; approved sample; BOM/routing version; purchase-order due date; material lots; production order; planned/actual run times; ideal cycle time; total/good/rework/scrap counts; quality release; dispatch and delivery evidence; cost allocation.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · On-time in-full orders | Customer orders fully delivered by approved promise ÷ eligible customer orders due in period × 100. | N/I: production, shipment and delivery linkage. | Operations lead · weekly; address material/capacity constraints. |
| **Headline** · First-pass yield | Units passing first inspection without rework ÷ units entering that process inspection × 100. | N/I: unit/batch inspection and rework events. | Quality lead · daily; investigate recurring defects. |
| **Headline** · Production orders past due | Count unreleased noncancelled production orders beyond approved completion date. | N/I: production schedule and quality-release state. | Production planner · daily; resolve bottlenecks. |
| **Headline** · Order contribution | Net order revenue minus attributable materials, direct labor, subcontract and production overhead under explicit policy. | N/I: BOM consumption, time and cost ledger. | Owner · weekly; improve pricing and yield. |
| Diagnostic · RFQ conversion | Complete valid RFQs awarded within W ÷ complete RFQs with matured W-day window × 100. | N: completeness, quote and award events. | Sales engineer · monthly; inspect price/specification losses. |
| Diagnostic · Scrap cost rate | Verified scrap cost ÷ total production input cost for same process/period × 100; rework cost shown separately. | N/I: scrap disposition and cost basis. | Quality lead · weekly; target expensive failure causes. |
| Diagnostic · Overall equipment effectiveness — optional | Availability × performance × quality; A=run/planned time, P=ideal cycle×total count/run time, Q=good/total count; ratios multiplied ×100. | I: trustworthy machine events, planned-time policy and cycle standards. | Production lead · weekly; compare one equipment/process context. |
| Diagnostic · Production cycle time | Median/p90 elapsed time from order release to quality-approved completion; open work age separate. | N/I: production-order events. | Planner · weekly; reduce queue and process delay. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Production

The canonical queue lives in **Production → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| RFQ missing details | Required specification, quantity or tolerance awaits customer confirmation. | Stop on validated details, withdrawn RFQ or reply; no automatic technical assumption. |
| Sample/spec approval | Named specification or sample version awaits authorized approval before production release. | Stop on decision, replacement version or cancellation; old approvals cannot release new specifications. |
| Material/delivery risk | Recorded shortage or quality hold threatens a promise. | Internal planner task; stop on verified resolution or formally revised promise; customer updates use approved facts. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect order requirements, explain authorized quotations and verified production/delivery milestones, request customer specification decisions and handle routine order-status questions.

**Hasib:** Validate BOM/version/capacity, create production and procurement obligations, reconcile inventory and WIP, monitor schedule/quality gates, queue material exceptions and calculate covered production KPIs.

**Minimum human involvement:** Operate equipment and make engineering/quality judgments; enter actual counts, tests, downtime causes and inspection facts where no trusted system captures them. Only out-of-policy substitutions and release exceptions need decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. A revised specification invalidates old sample approval before a production release is allowed.
2. Reworked units are not counted as first-pass successes, even if they later become saleable.
3. Missing or impossible cycle-time data marks OEE unavailable/invalid instead of manufacturing a score above 100%.
4. Verify all six primary destinations, the sector Work label, Production → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **approved product/BOM/routing versions; production capacity; material reservation; quality sampling and release authority; supplier terms; lead-time commitments; scrap/rework rules; order change controls.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** ERP/MES → demand, BOM, stock, machine events, labor and costs; customer → specification and dates; supplier → confirmed receipts/promises; operator/quality professional → physical counts and tests when sensors cannot capture them.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect order requirements, explain authorized quotations and verified production/delivery milestones, request customer specification decisions and handle routine order-status questions.

**Hasib's work:** Validate BOM/version/capacity, create production and procurement obligations, reconcile inventory and WIP, monitor schedule/quality gates, queue material exceptions and calculate covered production KPIs.

**Human work only where needed:** Operate equipment and make engineering/quality judgments; enter actual counts, tests, downtime causes and inspection facts where no trusted system captures them. Only out-of-policy substitutions and release exceptions need decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

demand → planned → materials_reserved → released → in_production → quality_hold/passed → finished_goods → shipped → closed; procurement, machine downtime and rework are distinct linked records. Quality release requires authorized evidence.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Manufacturing is pending; ERP/MES/BOM/routing, traceability and quality adapters need implementation. Generic jobs cannot establish OEE or actual manufacturing costs without captured denominators.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| order_requirement | Accepted product specification and demand | Check approved BOM/routing, capacity and allowed price | Clarify missing specification and issue valid quote | MISSING_INPUT; QUOTE | No unsupported lead-time promise |
| production_planned | Confirmed order and feasible capacity | Create work order and material reservations | Confirm accepted promise | EV; DELIVERY_DUE | Reservation conflict blocks unsupported confirmation |
| material_shortage | Authoritative stock/receipt gap | Create procurement/expedite obligation within policy | Notify client only when promise materially affected | CHECKPOINT; EV if affected | No silent unapproved material substitution |
| released_started | Authorized release and actual machine/operator start | Track WIP and actual operation timing | Answer recorded production stage | NO_PROGRESS at operation checkpoint | Planned release is not physical start |
| downtime | Machine signal or operator reason-coded stop | Record duration and apply authorized maintenance escalation | Send material-impact update if relevant | SLA; CHECKPOINT | Unknown reason stays unknown, not inferred root cause |
| quality_result | Traceable inspection result and lot | Quarantine failed units; route rework; release only passed scope | Explain verified order impact | EV for customer impact | Elapsed time or target output cannot auto-pass inspection |
| finished_shipped | Finished-goods receipt and dispatch proof | Reconcile batch/lot quantities and delivery obligation | Send exact shipped quantities/status | EV; DELIVERY_DUE | Partial shipment retains remaining obligation |
| closed_reconciled | Actual yield, labor/material and delivery evidence | Reconcile scrap/rework/costs and close work order | Send final recorded completion or balance notice | BALANCE; FEEDBACK optional | Incomplete costs leave margin visibly incomplete |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| BOM and work orders | Version specification, BOM, routing, units, lot/serial and approved substitutes; reserve materials once and preserve traceability through partial production. |
| Procurement and RFQs | Track supplier quotation, sample acceptance, purchase authority, expected/actual receipt and inspection. Unapproved substitutes or late parts create scoped exceptions. |
| Quality and OEE inputs | Capture first-attempt inspection, rework/scrap quantity, planned production time, actual runtime, ideal cycle and good output where OEE is requested. Missing denominators prohibit an invented performance rate. |
| Shipment and costing | Keep WIP, finished stock, partial dispatch and actual delivery distinct. Allocate actual materials/labor/subcontract cost and retain rework costs rather than hiding them in a new order. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Production retains conversation context |
| Production | Default **Production-order schedule** with **Order/spec revision, release state, material blocker, inspection state, due date**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New RFQ** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Product family; process/equipment; order type; defect/scrap cause**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Orders · RFQs · Quality · Follow-ups. Keep quick filters **RFQ incomplete · Sample pending · Material shortage · Quality hold**. The record workspace includes **Specification/BOM revision; approval evidence; production/inspection; lot costs**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Production, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Failed lot inspection blocks shipment readiness and preserves traceability.
2. A partial shipment cannot mark the remaining order fulfilled.
3. Duplicate machine events do not double-count downtime, output or material consumption.
4. Exercise every event row with fake time and simulated transport: exact enrollment count, due time, cap, expiry, dispatch eligibility and stop condition; verify downstream records and KPI effects.
5. Run the normal lifecycle with no staff message approval, manual follow-up creation, repeated data entry or manual KPI calculation after the required physical/professional facts are recorded.
6. Test cancellation, rejection, reschedule, partial outcome, revised scope, stale/duplicate/out-of-order event, missing source, failed save and exception recovery. No stale job or unearned completion may survive.
7. Verify all six destinations in EN/AR at 320, 768 and 1440 px: keyboard/focus, direct link/reload, customer/work identity, role/tenant isolation, provider-state wording and Insights drill-down/back consistency.
8. Verify the real authenticated wrappers with synthetic test records and simulated providers before release; a local browser demo or registry flag does not prove backend automation, authentication or production readiness.

These are **acceptance requirements, not tests executed by this documentation edit**. Keep per-rule implementation/source/test evidence and remaining gaps before enabling real automatic execution. Testing remains automated-only; this document does not authorize live messages or deployment.

## Lead generation and acquisition

Proposed extension, researched 2026-10-10. Keep the existing intake foundation and apply the [shared lead-generation design](lead-generation.md). Source evidence is classified in the [lead-generation evidence register](lead-generation-evidence.md); the workflow below is a BznsFlow recommendation to test, not a claim of proven local uplift.

| Element | Sector-specific requirement |
| --- | --- |
| Acquisition routes to test | Capability/product search pages, industrial directories, distributor partnerships and permissioned RFQ feeds |
| Offer / next-step promise | A feasibility-qualified RFQ response with specification, lead time and terms |
| Fit and readiness | Material/process, drawing/spec revision, quantity/MOQ, tolerances/certifications, delivery location/date and available capacity |
| Verified conversion path | Complete feasible RFQ → accepted purchase order → delivered order |
| Layla + Hasib automatic journey | Parse structured RFQ, request missing technical facts, check catalog/BOM/capacity, route novel engineering and follow quote/sample approval |
| Repeat / referral loop | Forecast/reorder signals agreed with the buyer, contract renewal and distributor referrals |
| Acquisition KPI focus | Cost per qualified RFQ; quote turnaround; quote-to-PO; delivered contribution; reorder rate |
| Evidence mapping | [L17](lead-generation-evidence.md#l17) |

**Sector limits:** No fabricated capability/certification or blind automatic quote for an unreviewed technical specification.

**First proposed experiment:** Compare general contact with capability-specific RFQ intake; judge feasible RFQs, accepted POs and delivered contribution. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Production links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
