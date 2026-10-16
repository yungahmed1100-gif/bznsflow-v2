# Cakes — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/cakes.md). Read this product specification alongside that build file.

الكيك · Sector ID: `cakes` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Preview**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Deliver the approved cake on the promised occasion date while controlling production capacity, deposits and spoilage.

Custom order fields, recipes, prep batches, shelf life and waste records exist in preview. Existing sold-versus-baked compares period quantities by variant, not a fully traced batch cohort; accurate batch sell-through needs allocation. Design approval and production-slot capacity need explicit records.

## Industry evidence and recommended practice

ReFED favors granular company-specific waste measurement that supports root-cause action. The recommendations here adapt that principle to custom and batch baking; no verified top-quartile cake-business benchmark was found. Sources: [ReFED food-waste measurement practices](https://foodwastepact.refed.org/resources/food-waste-measurement-and-reporting-best-practices-for-businesses/). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Cake orders · Customers · Broadcasts · Insights · Settings**.

**Cake orders / طلبات الكيك** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Cake orders, retaining the conversation return context. |
| Cake orders | Due-date production list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New cake order**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Cake orders; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Cake orders: daily execution

**Secondary views:** Orders · Production · Products · Follow-ups. These remain within the single `work` destination. Default: **Due-date production list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Occasion date, order, approved design, deposit state, production slot, owner. **Quick filters:** Due soon · Design pending · Deposit due · Ready. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Approved design/version; ingredients and staff-reviewed requests; capacity; collection. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Ready on time · Unapproved designs due soon · Deposits outstanding · Waste cost**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Custom vs batch; design complexity; product size; occasion lead time. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Cake orders and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **catalog**; registry status: **preview**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `demand`, `recipes`, `batches`, `shelfLife` |
| Planned | `digest`, `plans` |
| Off for this pack | `appointments`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** `size` (Size / الحجم); `flavour` (Flavour / النكهة).

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| `inscription` | Cake message / العبارة على الكيك | text | Maximum 120 characters |
| `filling` | Filling / الحشوة | text | Maximum 120 characters |
| `design_notes` | Design notes / ملاحظات التصميم | text | Maximum 240 characters |
| `allergen_request` | Allergen request / طلب متعلق بالحساسية | text | Maximum 160 characters |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `aggregator_fees` (Delivery app commission); `waste` (Waste); `custom_materials` (Custom cake materials); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Occasion brief → approved design/version → quote and deposit → reserved production slot → bake/decorate → quality check → ready → collected/delivered.

**Required record fields:** Occasion and promised-ready timestamps; servings/size/flavor; approved design version; allergen request for staff review; deposit due/paid; production slot; batch ID and allocations; recipe yield/cost; waste reason; ready/collection events.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Ready on time | Noncancelled cake orders ready by promised-ready time ÷ cake orders due in period × 100. | N: ready event and versioned promise. | Production lead · daily; prioritize orders at risk. |
| **Headline** · Unapproved designs due soon | Count orders inside production lead-time horizon without approval of the current design version. | N: design versions, approvals and production deadlines. | Order coordinator · daily; obtain the required decision. |
| **Headline** · Deposits outstanding | Sum required deposits due minus verified allocations, floored at zero per order; exclude cancelled/refunded obligations. | D/N: orders plus deposit schedule and allocation. | Owner · daily; resolve payment before staff-authorized production release. |
| **Headline** · Waste cost | Sum recorded ingredient/output cost for spoilage, unsold or production-error waste in period; show missing-cost coverage. | D: waste/recipe records; cost scope must be reconciled. | Production lead · weekly; adjust batch size and process. |
| Diagnostic · Batch sell-through | Units sold from a named matured batch ÷ saleable units produced in that batch × 100; returns reverse allocated sales. | N: stock-to-batch allocation; do not reuse period sales divided by production. | Owner · weekly; adjust product mix and quantities. |
| Diagnostic · Order contribution | Net order revenue minus ingredients, packaging, direct decoration labor and delivery cost; known costs only. | D/N: recipes plus custom materials/labor. | Owner · weekly; price complex designs properly. |
| Diagnostic · Approved-scope change rate | Orders changed after design approval ÷ approved orders in same cohort × 100; classify billable vs absorbed changes. | N: versioned change/approval events. | Order coordinator · weekly; improve briefs and change approvals. |
| Diagnostic · Production capacity load | Committed standard production minutes ÷ staffed available production minutes for selected day × 100. | N: resource calendar and task-duration estimates. | Production lead · daily; move or decline work before overload. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Cake orders

The canonical queue lives in **Cake orders → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Design approval | Current design awaits customer decision before staff-set production cutoff. | Stop on approval, replacement, cancellation or reply; escalate expired cutoff to staff. |
| Deposit due | Approved order deposit deadline approaches with verified unpaid amount. | Stop on verified payment, dispute, credit or cancelled order; chat payment claims require verification. |
| Pickup | Staff marks cake ready and pickup window is current. | Stop on collection/delivery or changed window; no premature ready notification. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect the occasion and missing details, show available catalog choices, quote permitted designs, obtain design/version confirmation, explain recorded allergens and coordinate pickup or delivery.

**Hasib:** Calculate the configured recipe/size price, reserve kitchen capacity, maintain the accepted design version, generate production tasks and delivery obligations, reconcile deposits and ingredient/order costs.

**Minimum human involvement:** Enter unusual design feasibility, substitutions/allergen judgments and physical production/quality facts when no system captures them; bakers perform the work. Only nonstandard designs, unsafe ingredient uncertainty or policy exceptions need specialist decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Sales from yesterday's batch cannot inflate today's batch sell-through above its own produced units.
2. A design revision invalidates the previous approval and blocks a stale production instruction.
3. A cake ready after its original due time remains late even if the pickup was later postponed.
4. Verify all six primary destinations, the sector Work label, Cake orders → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **standard sizes/flavors/design tiers and prices; kitchen and delivery capacity; order cutoffs; allergen wording; deposit and change deadlines; design acceptance and refund limits.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Customer → date, servings, flavor, inspiration and delivery details; catalog → price and declared ingredients; production team → actual bake/decorate/quality/pack events; payment/courier → settlement and handover.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect the occasion and missing details, show available catalog choices, quote permitted designs, obtain design/version confirmation, explain recorded allergens and coordinate pickup or delivery.

**Hasib's work:** Calculate the configured recipe/size price, reserve kitchen capacity, maintain the accepted design version, generate production tasks and delivery obligations, reconcile deposits and ingredient/order costs.

**Human work only where needed:** Enter unusual design feasibility, substitutions/allergen judgments and physical production/quality facts when no system captures them; bakers perform the work. Only nonstandard designs, unsafe ingredient uncertainty or policy exceptions need specialist decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

inquiry → requirements_complete → quote_issued → confirmed → in_production → quality_checked → ready → handed_over/delivered → closed. Deposit, design acceptance and delivery are separate states; revisions create a new accepted specification.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Booking/order foundations can support intake and order records. Recipe capacity, accepted design versions, production checkpoints and automatic customer updates require a sector adapter and event pipeline.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| inquiry | Requested date and servings | Check cutoff, catalog and capacity | Ask only missing order details | MISSING_INPUT | Stop on completed requirements, decline or expiry |
| quote_issued | Validated catalog combination or approved custom design | Calculate quote and reserve provisional capacity with explicit expiry | Send design summary, total and deposit terms | QUOTE | Revision invalidates old quote and reminders |
| confirmed | Required design consent and verified deposit/credit policy | Commit capacity and production checklist | Confirm the exact design/date and collection window | EV; PRE_EVENT | A payment screenshot alone cannot confirm settlement |
| design_change | Customer requests a material amendment | Reprice and check cutoff/capacity; retain original promise | Show revised scope and obtain consent | REVIEW | Do not change accepted production silently |
| production_started | Kitchen saves verified start | Track recipe and milestone timing | Answer status with actual recorded stage | NO_PROGRESS at production checkpoint | No invented progress from elapsed time |
| quality_checked | Authorized checklist pass and actual completion | Record quality result and package/handover task | Notify ready only after packaging/readiness facts | EV; COLLECTION for pickup | Failed check holds ready notification and creates corrective work |
| delivery_changed | Carrier scan or confirmed delivery change | Reconcile route/promise and update affected jobs | Send verified delivery exception and options | DELIVERY_DUE; EV material change | No delivery claim without accepted evidence |
| closed | Pickup receipt or delivered proof | Close production and fulfillment; reconcile balance and costs | Send receipt and optional feedback request | BALANCE if due; FEEDBACK | Complaint suspends promotional/repeat-order sequence |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Design and ingredients | Store size/servings, flavor, design revision, references, declared ingredient/allergen information and accepted substitutions. Reference images are not automatic promises of feasibility or rights. |
| Capacity and recipe | Reserve preparation/decorating slots and required ingredients against the accepted order version. Batch recipe allocations distinguish actual yield, sold quantity and waste. |
| Pickup and freshness | Store ready time, storage/freshness cutoff, pickup identity and handover proof. Collection reminders expire at the safe/approved pickup limit; stale goods need a disposition decision. |
| Changes and remake | Reprice changes after cutoff under configured authority; record canceled production and remake costs. A late accepted design change preserves both original and revised promises. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Cake orders retains conversation context |
| Cake orders | Default **Due-date production list** with **Occasion date, order, approved design, deposit state, production slot, owner**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New cake order** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Custom vs batch; design complexity; product size; occasion lead time**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Orders · Production · Products · Follow-ups. Keep quick filters **Due soon · Design pending · Deposit due · Ready**. The record workspace includes **Approved design/version; ingredients and staff-reviewed requests; capacity; collection**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Cake orders, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. A catalog order reserves capacity only once after its configured confirmation conditions.
2. A design change cancels obsolete production reminders and requires consent to the new version.
3. Failed quality checks prevent a ready message; delivery proof does not imply invoice payment.
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
| Acquisition routes to test | Visual occasion/product content, local search, planner/venue partners and existing-customer referrals |
| Offer / next-step promise | An available date and clear catalog/design option with total and deposit terms |
| Fit and readiness | Occasion date, servings, design tier, delivery area, budget fit and kitchen capacity |
| Verified conversion path | Accepted design and verified required deposit → completed order |
| Layla + Hasib automatic journey | Check slot before promising, issue standard quotes, obtain design/version consent, recover an eligible unfinished decision and reserve production |
| Repeat / referral loop | Customer-chosen occasion reminders, referral links and opted-in seasonal preorder offers |
| Acquisition KPI focus | Cost per deposit-backed order; quote-to-deposit; contribution after promotion; completed repeat occasion orders |
| Evidence mapping | [L11](lead-generation-evidence.md#l11); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** Checkout evidence is from packaged food, not a custom-cake benchmark; no invented occasion dates or universal discounts.

**First proposed experiment:** Compare a generic inquiry with date-and-servings-first intake showing feasible catalog choices; judge deposit-backed completed orders. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Cake orders links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
