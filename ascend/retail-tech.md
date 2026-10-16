# Electronics and phone store — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/retail-tech.md). Read this product specification alongside that build file.

متجر الإلكترونيات والهواتف · Sector ID: `retail-tech` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Protect serialized inventory and repair promises while making device and service economics visible.

Serialized stock, sales, repair tickets, trade-ins and warranty records exist. Current measures include profit per device, aged stock and overdue repairs. Repair cycle/quality cohorts, complete repair costs and warranty outcomes require added reporting/events.

## Industry evidence and recommended practice

Shopify's inventory guidance supports stock efficiency measurement, but does not establish electronics-repair quality benchmarks. Proposed practice adds per-device traceability, estimate authorization and quality-approved handover; no universal margin target is adopted. Sources: [Shopify inventory metrics](https://www.shopify.com/blog/inventory-metrics). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Store & repairs · Customers · Broadcasts · Insights · Settings**.

**Store & repairs / المتجر والصيانة** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Store & repairs, retaining the conversation return context. |
| Store & repairs | Repair and collection list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New repair**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Store & repairs; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Store & repairs: daily execution

**Secondary views:** Repairs · Sales · Devices · Follow-ups. These remain within the single `work` destination. Default: **Repair and collection list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Ticket/device reference, estimate state, due time, parts blocker, collection state. **Quick filters:** Approval pending · Parts needed · Overdue · Ready for collection. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Intake condition; estimate/repair test; serialized stock; trade-in/warranty and costs. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Overdue repairs · Device contribution · Aged serialized stock · Repair-ready turnaround**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Device category; sale vs repair; warranty status; repair issue. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Store & repairs and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **catalog**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `demand`, `serials`, `repairs`, `tradeIns` |
| Planned | `digest` |
| Off for this pack | `appointments`, `plans`, `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `quotes` |

**Configured variants:** `model` (Model / الموديل); `storage` (Storage / السعة); `colour` (Colour / اللون); `condition` (Condition / الحالة).

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `repair_parts` (Repair parts); `warranty_claims` (Warranty claims and shipping); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Sale: serial verified → reserved → sold → handed over; repair: intake → diagnosis → estimate approval → parts → repair/test → ready → collected.

**Required record fields:** Item/variant/serial or IMEI reference; receipt and landed cost; reservation/sale/return; repair ticket and condition record; approved estimate version; promised ready date; ready/collection times; parts/labor cost; warranty terms; repeat-repair link. Never store customer device passwords in chat/tasks.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Overdue repairs | Count unfinished repairs whose approved due time is past; ready and collected repairs excluded. | D: existing repair due/state calculation. | Repair lead · daily; resolve parts/approval delays. |
| **Headline** · Device contribution | Net device revenue minus matched landed device cost and explicitly included direct fees; display per unit and coverage. | D/N: existing device profit; fees/cost scope reconciled. | Owner · weekly; examine model and sourcing. |
| **Headline** · Aged serialized stock | Count in-stock devices whose receivedAt predates configured age cutoff; value where landed cost known. | D: existing per-serial aging logic. | Buyer · weekly; review old models and trade-ins. |
| **Headline** · Repair-ready turnaround | Median/p90 intake-to-quality-approved-ready duration; still-open repair age shown separately. | N: intake and verified-ready events. | Repair lead · weekly; remove diagnostic/parts bottlenecks. |
| Diagnostic · Repair first-time success | Collected repairs without verified same-issue return within W ÷ collected repairs with matured W-day window × 100. | N: serial/issue-linked repeat repairs. | Repair lead · monthly; investigate quality failures. |
| Diagnostic · Estimate acceptance | Repair estimates approved within W ÷ issued estimates with matured W-day window × 100. | N: estimate version groups and approval history. | Service advisor · weekly; clarify cost/parts options. |
| Diagnostic · Awaiting collection | Count ready but uncollected repairs; show current age and verified outstanding balance. | D/N: repair states, ready timestamp and charge linkage. | Service advisor · daily; free storage and close tickets. |
| Diagnostic · Repair contribution | Net repair revenue minus parts, direct technician and subcontract costs; warranty/corrective work costs retained. | N: repair-level revenue and cost allocation. | Owner · monthly; review service pricing and rework. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Store & repairs

The canonical queue lives in **Store & repairs → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Repair approval | Current policy-issued or exception-approved estimate remains unanswered after chosen delay. | Stop on reply, approval, rejection, revision or expiry; no repair work implied before authorization. |
| Collection | Verified testing is complete and device is marked ready. | Stop on collected, re-opened, disputed or cancelled ticket; disclose only necessary device details. |
| Requested model in stock | A waiting product request matches a saleable unreserved device. | Stop on fulfilled/declined request or stock change; check reservation atomically before promising availability. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect the device/fault details, explain the intake receipt, deliver policy-priced estimates, obtain version-specific customer consent, answer repair-status questions from the live record, communicate verified delays and arrange collection.

**Hasib:** Create one customer-linked repair and linked order, validate serial uniqueness, calculate authorized quotes, reserve parts only at the defined commitment point, enforce approval/state transitions, enqueue updates, reconcile payment and stock, and calculate repair metrics.

**Minimum human involvement:** Scan a device if the customer cannot provide its identity; record physical intake/condition, diagnosis, repair/test outcome and handover when no trusted integration captures them. A technician performs the repair. Manager input is limited to warranty disputes, nonstandard price/scope, exceptional refunds and other out-of-policy decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. One IMEI cannot be sold to two customers; a return restores the correct serial and cost history.
2. Marking a repair ready removes it from overdue repair work and places it in awaiting collection without losing its late history.
3. An unverified warranty claim cannot trigger an automatic free replacement or erase repair cost.
4. Verify all six primary destinations, the sector Work label, Store & repairs → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **repair service menu and price bands; diagnostic fees; warranty eligibility evidence; technician skills; part availability; repair/test checklist; promised-time rules; pickup hours; collection cadence; trade-in valuation limits; return/refund exception policy.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Customer/verified channel → Layla; device model and stated fault → customer conversation; IMEI/serial and accessories/condition → scan/intake form; diagnosis and test results → technician or authorized diagnostic system; parts/cost/stock → inventory connector; receipt/payment/collection → verified source.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect the device/fault details, explain the intake receipt, deliver policy-priced estimates, obtain version-specific customer consent, answer repair-status questions from the live record, communicate verified delays and arrange collection.

**Hasib's work:** Create one customer-linked repair and linked order, validate serial uniqueness, calculate authorized quotes, reserve parts only at the defined commitment point, enforce approval/state transitions, enqueue updates, reconcile payment and stock, and calculate repair metrics.

**Human work only where needed:** Scan a device if the customer cannot provide its identity; record physical intake/condition, diagnosis, repair/test outcome and handover when no trusted integration captures them. A technician performs the repair. Manager input is limited to warranty disputes, nonstandard price/scope, exceptional refunds and other out-of-policy decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

Existing repair states: received → diagnosing → waiting_parts or repairing → ready → collected; cancelled is a terminal alternative. Quote approval is a separate state. Current code also permits diagnosing → ready when valid; the target adds verified quality-check evidence before any ready transition. Reopening is a proposed audited new lifecycle, not a currently supported reverse transition.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Existing repair mutations save history and refresh the edited record/list; the service list polls at 20 seconds. Generic follow-ups are manual, sorted by due time, and do not send; their direct link types do not include repair. Add a typed repair adapter, durable event/outbox enrollment, qualified ready/collection triggers, status-answer retrieval and verified provider receipts. The local six-tab draft is browser-only and stage movement does not create notifications.

### Verified repair behavior in the current code

- [Repair state machine](../convex/hasib/repairMachine.js): received → diagnosing/cancelled; diagnosing → waiting_parts/repairing/ready/cancelled; waiting_parts → repairing/cancelled; repairing → ready/cancelled; ready → collected/cancelled; collected and cancelled are terminal. Approval is separate; current repair/ready guards must be preserved, including the defined free-warranty exception.
- [Repair state executor](../convex/hasib/repairsState.js) saves transitions/history. It does not establish the proposed status-notification outbox. The target quality-evidence gate before ready is additional work; do not label every existing ready ticket “tests verified” without that evidence.
- [Service list](../src/components/hasib/ServiceView.jsx) polls every 20 seconds and refreshes after its own edits. [Repair details](../src/components/hasib/RepairDialogs.jsx) load/refresh on their own operations; this is not proof of a push subscription to another technician's changes.
- [Manual follow-up executor](../convex/hasib/followupsState.js) stores due tasks with open/completed states, orders them by due time and does not send. Its direct link types do not include repair. [Follow-up view](../src/components/hasib/FollowupView.jsx) polls every 30 seconds and starts with a bounded page; full target queue pagination and a typed repair link remain requirements.
- Therefore a current stage change can update stored repair status without automatically enrolling or delivering a customer notification. Reopening a terminal repair requires a newly designed audited lifecycle, not an unsupported reverse transition.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| received | Validated device intake and contact association | Create ticket/order, checklist and diagnosis assignment | Send receipt and repair reference | EV once; NO_PROGRESS after 1 business day without diagnosis | Stop intake task on diagnosis/cancellation; do not claim a fault is diagnosed |
| diagnosing | Technician saves diagnosis or diagnostic system supplies verified result | Resolve service code and calculate quote within authorized catalog rules | Explain diagnosis as recorded and request consent to the current quote | QUOTE on quote_issued (+1 and +3 business-day reminders) | Cancel old sequence on quote revision/decision; uncertain diagnosis goes to technician |
| quote_accepted | Authorized customer accepts exact quote revision | Save approval evidence and commit eligible parts/capacity | Confirm scope and recorded estimate for completion | EV once; no extra staff approval within policy | A different quote version requires new customer consent; silence never approves |
| waiting_parts | Inventory reservation fails or technician records shortage | Track part requirement and supplier-confirmed expected date | Send one useful delay update with the verified date or an honest unknown | EV when material change; NO_PROGRESS at recorded supplier due time | No guessed ETA; new parts/status supersede the old delay message |
| repairing | Approved scope plus verified technician start event | Start work duration; refresh workload and readiness checks | Answer customer status requests; send start update only if configured | EV optional, coalesced; SLA at promised ready time | Do not send repetitive unchanged progress; pause on scope/approval mismatch |
| ready | Technician/test system confirms required tests passed and device is ready | Close repair-work clock, reconcile parts/order state, open collection obligation | Send ready-for-collection notice with hours and verified balance | EV once then COLLECTION | Cancel collection messages if reopened/cancelled; ready is not collected or paid |
| collected | Verified handover receipt or staff scan | Complete linked order where valid; close collection queue and measure outcome | Send handover confirmation and approved warranty summary | EV once; FEEDBACK optional | Stop all obsolete pickup reminders; unpaid balance remains a separate obligation |
| sale_return_tradein | Authoritative serialized sale, return or accepted trade-in event | Update the exact unit and cost ledger; evaluate policy eligibility | Confirm the recorded transaction and explain next steps | EV once; BACK_IN_STOCK for waiting permitted requests | No duplicate IMEI sale; disputed coverage/valuation or exceptional refund is an exception |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Serialized sales and reservations | Store device/variant/serial or IMEI, ownership/stock state, cost and reservation expiry. Atomically prevent double sale; current repaired customer property is not saleable shop stock. |
| Repairs and parts | Keep diagnosis, estimate version, customer approval, part reservation/receipt/consumption, technician work and quality checks distinct. New scope needs new customer consent; a parts ETA requires supplier evidence. |
| Warranty, trade-in and returns | Link original sale/repair, warranty terms, condition/valuation evidence and exact unit. Execute deterministic eligible policy outcomes; disputed coverage, exceptional refund or unverified valuation is a scoped decision. |
| Device privacy and collection | Do not put PINs/passwords or personal device contents in chats/tasks. Verify handover recipient and actual collection. Collection reminders stop after handover; outstanding verified balance follows a separate obligation. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Store & repairs retains conversation context |
| Store & repairs | Default **Repair and collection list** with **Ticket/device reference, estimate state, due time, parts blocker, collection state**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New repair** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Device category; sale vs repair; warranty status; repair issue**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Repairs · Sales · Devices · Follow-ups. Keep quick filters **Approval pending · Parts needed · Overdue · Ready for collection**. The record workspace includes **Intake condition; estimate/repair test; serialized stock; trade-in/warranty and costs**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Store & repairs, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Create a ticket → quote → customer approval → verified start → passed tests → ready → collection using fake time; no staff communication or manual follow-up creation is required after fact capture.
2. Replay ready twice, then collect before dispatch: one enrollment exists and the stale pickup message is cancelled.
3. Ask Layla for status on the correct and a different customer's device; only the verified owner's current record is returned with source time.
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
| Acquisition routes to test | Model/repair-specific local search, accurate listings, device content, local partners and customer referrals |
| Offer / next-step promise | A clear eligible repair estimate/diagnostic booking, available device, or condition-dependent trade-in option |
| Fit and readiness | First distinguish repair/buy/sell/trade-in; then model, stated issue/variant, location, desired timing and actual service/stock fit |
| Verified conversion path | Repair: verified intake then accepted repair and collection; retail: fulfilled paid device sale |
| Layla + Hasib automatic journey | Capture source once, ask model/fault, quote within policy, reserve eligible part/slot, recover unanswered estimates and run the documented repair-status journey |
| Repeat / referral loop | Warranty/service support, specifically requested stock alerts, consent-based referrals and relevant repeat needs |
| Acquisition KPI focus | Cost per completed paid repair or net new device buyer; estimate-to-intake/approval; contribution by intent/source; return/comeback rate |
| Evidence mapping | [L12](lead-generation-evidence.md#l12); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** Add an explicit retail-tech qualification adapter: calling the current helper with that ID falls back to Other. Do not scrape consumer numbers or infer a diagnosis from a price inquiry.

**First proposed experiment:** Compare the current generic inquiry with intent-first repair/buy/trade-in intake and a model-specific feasible next step; judge completed paid repairs or fulfilled device sales separately. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Store & repairs links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
