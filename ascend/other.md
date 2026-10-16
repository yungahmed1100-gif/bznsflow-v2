# Other services — explicit fallback — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/other.md). Read this product specification alongside that build file.

مجال آخر · Sector ID: `other` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Pending**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Offer a useful inquiry-to-delivery workflow for an unclassified service business while requiring a real operating model before showing specialist metrics.

Generic customer, communication, order and task records can be reused. Other must have an explicit presentation and workflow; it must not silently inherit retail stock, clinical booking or agency metrics. Sector-specific workflows remain intentionally unconfigured until identified.

## Industry evidence and recommended practice

Professional-services research can inform a service-business fallback, but 'Other' has no coherent peer group or universal benchmark. The proposed measures apply only after choosing a service/project model; inventory or appointment businesses should use the matching named pack. Sources: [SPI 2025 Professional Services Maturity Benchmark announcement](https://spiresearch.com/the-18th-annual-professional-services-maturity-benchmark-report-is-out-now/). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Work · Customers · Broadcasts · Insights · Settings**.

**Work / الأعمال** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Work, retaining the conversation return context. |
| Work | Confirmed service-work list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New request**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Work; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Work: daily execution

**Secondary views:** Work list · Schedule · Services · Follow-ups. These remain within the single `work` destination. Default: **Confirmed service-work list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Request/work item, approved stage, owner, promise, next action. **Quick filters:** Unassigned · Quote pending · Due today · Blocked. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Confirmed business model; approved quote; work timeline; authorized costs/balances. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Qualified-to-accepted conversion · Work completed on time · Overdue actions · Approved balances overdue**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Configured service type; lead source; work cohort; blocker cause. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Work and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **catalog**; registry status: **pending**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `demand` |
| Planned | `digest` |
| Off for this pack | `appointments`, `plans`, `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** `size` (Size / المقاس); `colour` (Colour / اللون).

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Qualified request → approved quote → acceptance → scheduled work → completed/accepted → invoiced/paid → optional renewal.

**Required record fields:** Confirmed business subtype; unit of work; qualification criteria; service catalog; quote and decision; owner/stage; original/current promise; completion/acceptance event; approved price; known direct costs; invoice/payment linkage.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Qualified-to-accepted conversion | Qualified opportunities accepted within W ÷ qualified opportunities with matured W-day window × 100. | N: chosen workflow and linked decision events. | Owner · weekly; improve qualification and proposals. |
| **Headline** · Work completed on time | Accepted work completed by approved promise ÷ work due in period × 100. | D/N: typed work records and completion history. | Operations lead · daily; clear delivery blockers. |
| **Headline** · Overdue actions | Count open assigned tasks with dueAt before now; separate customer and internal dependencies. | D/N: existing manual tasks plus assignment and explicit states. | Team lead · daily; resolve oldest actionable work. |
| **Headline** · Approved balances overdue | Sum positive net invoice balances past recorded due date, with disputes separate. | D/N: invoice/charge authority and allocations. | Owner · weekly; reconcile before reminders. |
| Diagnostic · Quote decision time | Median/p90 sent-to-decision time for decided quote groups; pending quote age separate. | N: quote event history. | Sales owner · weekly; improve responsiveness. |
| Diagnostic · Known-cost contribution | Net completed-work revenue minus explicitly scoped direct cost; incomplete costs produce a labeled partial amount or unavailable total. | D/N: work-to-order/cost mapping. | Owner · monthly; validate pricing. |
| Diagnostic · Repeat business | First-work customers completing another eligible work item within W ÷ matured first-work customer cohort × 100. | N: stable identity and work classification. | Owner · monthly; evaluate customer experience. |
| Diagnostic · Unresolved service issues | Count open verified complaints/defects with age and owner; resolution must be staff-recorded. | N: issue lifecycle and related work. | Team lead · daily; close the service loop. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Work

The canonical queue lives in **Work → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Quote decision | Approved sent quote remains open after configured delay. | Stop on reply, decision, expiry or revision. |
| Work readiness | Required customer detail is missing before the recorded work deadline. | Stop on verified detail, revised requirement or cancellation. |
| Completion/balance | Staff records accepted completion or an approved invoice reaches due date. | Stop on verified outcome/payment, dispute, cancellation or opt-out; do not infer completion from silence. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect structured requirements, explain only the configured catalog, request missing facts, communicate verified work status and handle routine follow-ups for the defined business subtype.

**Hasib:** Validate the configured adapter, enforce its states and authority, create durable obligations, reconcile integration facts and calculate only metrics whose inputs and meanings have been defined.

**Minimum human involvement:** Supply missing physical or professional facts and decide exceptions outside explicit standing policy. The subtype must define these before enabling automatic execution; unspecified authority is not unrestricted authority.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Selecting Other never displays retail stock metrics or industry-specific data-entry fields by accidental fallback.
2. A missing business model keeps specialist KPIs unavailable rather than populating sample production figures.
3. Changing to a named industry preserves history through an explicit mapping instead of reinterpreting old records silently.
4. Verify all six primary destinations, the sector Work label, Work → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **explicit business subtype; approved service/product catalog; capacity and promise rules; lifecycle meaning; authoritative integrations; contact consent; pricing/exception authority; KPI definitions and required professional gates.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Customer → requirements and contact preferences; configured system of record → work/payment/resource facts; staff/domain professional → real-world outcomes not captured elsewhere. No unsupported specialist fields are inferred..

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect structured requirements, explain only the configured catalog, request missing facts, communicate verified work status and handle routine follow-ups for the defined business subtype.

**Hasib's work:** Validate the configured adapter, enforce its states and authority, create durable obligations, reconcile integration facts and calculate only metrics whose inputs and meanings have been defined.

**Human work only where needed:** Supply missing physical or professional facts and decide exceptions outside explicit standing policy. The subtype must define these before enabling automatic execution; unspecified authority is not unrestricted authority.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

inquiry → qualified → quoted → confirmed → in_progress → verified_complete → closed, with cancellation and exception states. Replace this generic lifecycle with approved subtype states before launch; acceptance/payment/completion stay separate.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Other is a pending fallback, not a universal fully configured pack. It needs a named subtype, typed adapter, input/output permissions, verified metric definitions and sector-specific acceptance evidence.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| inquiry | Verified contact and configured requirements | Create one scoped work request | Ask only required missing facts | MISSING_INPUT | Unsupported service goes to scoped clarification |
| qualified | All configured eligibility conditions satisfied | Match authorized catalog/capacity | Explain available permitted option | QUOTE | Do not invent qualification rules |
| accepted | Exact current scope accepted and required conditions met | Commit resources and create execution obligations | Confirm recorded terms and next steps | EV | No double allocation or unapproved price |
| started | Authoritative real-world start fact | Advance work and monitor configured promise | Answer status from record | EV optional; SLA | Time passing alone cannot start work |
| blocked | Verified blocker and dependency | Route recovery within policy and set next checkpoint | Send useful verified delay update | CHECKPOINT; EV | No guessed ETA |
| changed | Authorized scope/promise revision | Version affected records and replace stale jobs | Obtain any required customer consent | REVIEW | Old consent does not cover material new terms |
| completed | Required trusted completion evidence | Close work clock and reconcile remaining obligations | Send factual completion/collection details | EV; COLLECTION if relevant | No auto-completion merely to improve KPI |
| closed | Verified fulfillment and current balance/dispute state | Close obsolete jobs and compute matured outcomes | Send receipt/feedback/renewal only where configured | BALANCE; FEEDBACK; RENEWAL | No generic campaign without defined purpose and permission |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Subtype definition | Name the actual business and service/product mix; select supported work, resource and payment models. Do not enable all specialist modules by default. |
| Authority map | Declare each source field, action/tool, decision owner, professional gate and maximum permitted financial/resource effect before automatic operation. |
| Reporting model | Choose eight meaningful sector metrics with exact populations, time basis and source coverage; generic fallback labels remain provisional until mapped. |
| Unsupported requests | A request outside the configured subtype generates a precise clarification or exception. The system must not borrow clinical, legal, inventory or manufacturing authority from another pack. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Work retains conversation context |
| Work | Default **Confirmed service-work list** with **Request/work item, approved stage, owner, promise, next action**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New request** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Configured service type; lead source; work cohort; blocker cause**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Work list · Schedule · Services · Follow-ups. Keep quick filters **Unassigned · Quote pending · Due today · Blocked**. The record workspace includes **Confirmed business model; approved quote; work timeline; authorized costs/balances**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Work, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Automatic mode stays unavailable until the subtype declares sources, lifecycle and authority.
2. Unsupported domain judgments cannot be inferred from a generic service request.
3. A completion event lacking configured evidence cannot close work or trigger a success message.
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
| Acquisition routes to test | Select channels from the actual buying process: local intent, catalog commerce, professional relationship or account/RFQ |
| Offer / next-step promise | One explicit, feasible next action tied to the configured service |
| Fit and readiness | Named subtype, real need, fit, timing and capacity; choose only essential questions |
| Verified conversion path | A configured verified business milestone followed by completed paid service |
| Layla + Hasib automatic journey | Use the nearest supported funnel adapter and define every rule/source before activation |
| Repeat / referral loop | Only repeat/referral journeys that match the real business and permission |
| Acquisition KPI focus | One verified acquisition outcome, its cost, mature conversion, contribution and repeat outcome |
| Evidence mapping | [L03](lead-generation-evidence.md#l03); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** Other is not an automatic all-industry lead engine; establish a subtype and local evidence before claiming best practice.

**First proposed experiment:** Choose one explicit subtype and test one meaningful offer/destination change against its verified outcome; do not combine unrelated industries into one result. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Work links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
