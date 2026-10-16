# Automotive — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/automotive.md). Read this product specification alongside that build file.

السيارات · Sector ID: `automotive` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Move vehicles through approved, profitable repairs with reliable handover promises and low comeback rates.

Dedicated workshop work orders, vehicle records, estimates, parts and collection states exist. Current owner metrics include approvals waiting, vehicles past promise and ready for collection. Benchmark-grade labor, parts margins and comeback cohorts need complete cost/time capture.

## Industry evidence and recommended practice

Tekmetric publishes average and top-25% metrics from 10,000+ North American shops through June 2026. These support tracking repair-order value, parts margin and labor realization; its USD values are not Omani targets, and higher ticket size alone is not quality. Sources: [Tekmetric Shop Index](https://tours.tekmetric.com/answers/tekmetric-shop-index). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Workshop · Customers · Broadcasts · Insights · Settings**.

**Workshop / الورشة** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Workshop, retaining the conversation return context. |
| Workshop | Vehicle stage board. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New work order**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Workshop; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Workshop: daily execution

**Secondary views:** Board · Schedule · Parts · Follow-ups. These remain within the single `work` destination. Default: **Vehicle stage board**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Vehicle, current stage, estimate approval, promised ready, parts blocker, advisor. **Quick filters:** Awaiting approval · Parts needed · Past promise · Ready. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Vehicle/inspection; approved estimate; repair/quality events; invoice and collection. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Vehicles past promise · Estimates awaiting approval · First-time repair success · Work-order contribution**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Repair type; customer/warranty work; parts category; comeback reason. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Workshop and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **booking**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `appointments`, `plans`, `jobCards` |
| Planned | `demand`, `digest` |
| Off for this pack | `recipes`, `batches`, `shelfLife`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| `plate` | Plate number / رقم اللوحة | text | Maximum 20 characters |
| `mileage` | Mileage (km) / العداد (كم) | number | No additional limit declared in this pack configuration; domain validation still applies |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `supplies` (Supplies); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Workshop / الورشة**, stock **Parts & supplies / القطع والمستلزمات**, workflow key **`automotive`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Vehicle intake → inspection → versioned estimate → customer approval → parts/resources confirmed → repair → quality check → ready → collected.

**Required record fields:** Vehicle/work-order IDs; mileage with source; estimate versions/decisions; promised completion; actual repair/ready/collection times; parts revenue/cost; sold and worked labor hours; comeback linkage/reason; invoice/payment references.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Vehicles past promise | Count unfinished noncancelled work orders whose committed ready time is before now. | D: dedicated work-order states and promises. | Workshop lead · daily; clear blockers and communicate verified updates. |
| **Headline** · Estimates awaiting approval | Count current sent estimates without decision; show median and oldest age. | D/N: existing approval state plus sent timestamp. | Service advisor · daily; obtain customer decisions. |
| **Headline** · First-time repair success | Completed work orders without a verified same-issue comeback within W ÷ completed orders with matured W-day window × 100. | N: vehicle/issue linkage and quality outcome. | Workshop manager · weekly; investigate quality and diagnosis. |
| **Headline** · Work-order contribution | Net repair revenue minus parts, loaded direct labor and subcontract cost; show missing-cost coverage. | D/N: work orders and complete cost capture. | Owner · weekly; review job type and pricing. |
| Diagnostic · Average repair order | Net invoiced repair revenue ÷ finalized repair invoices in period; exclude tax and separate warranty-only jobs. | D/N: invoice finalization and credits. | Owner · monthly; compare comparable job mix. |
| Diagnostic · Parts gross margin | Net parts revenue minus matched parts cost ÷ net parts revenue × 100. | D/N: line-level parts cost and returns. | Parts lead · weekly; inspect sourcing and discounting. |
| Diagnostic · Effective labor rate | Net labor revenue ÷ sold labor hours; zero hours means unavailable. | N/I: approved sold hours and labor lines. | Owner · monthly; distinguish from revenue per clocked hour. |
| Diagnostic · Ready-to-collection time | Median and p90 time from quality-approved ready to collection; show age of vehicles still awaiting collection. | D/N: ready/collection events. | Service advisor · daily; free space and resolve payment issues. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Workshop

The canonical queue lives in **Workshop → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Estimate decision | Current approved estimate is sent and unanswered for chosen business-hours delay. | Stop on reply, decision, revision or expiry; never approve extra work automatically. |
| Promise risk | Parts or repair blockers threaten the recorded handover time. | Create advisor task; stop when resolved or customer-approved promise is revised. |
| Collection/service due | Verified ready state or staff-set service date is reached. | Stop on collection, new booking, cancelled task or disputed balance; do not invent service intervals. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect vehicle concerns, explain mechanic-recorded findings, request estimate consent, provide status/delay updates and coordinate collection.

**Hasib:** Create linked work orders, validate current estimate approval, reserve bays/parts, track repair/test/ready events, maintain costs and queue all authorized reminders.

**Minimum human involvement:** Mechanics inspect, repair and certify relevant checks; enter actual findings/work/handover only when no source supplies them. Exceptions cover unsafe conditions, nonstandard repair authorization and disputed warranty/refund decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Revising an estimate cancels the old approval link and its pending reminder.
2. A comeback on the same vehicle for an unrelated issue does not automatically mark the first repair defective.
3. A warranty repair without revenue cannot create infinite or misleading margin percentages.
4. Verify all six primary destinations, the sector Work label, Workshop → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **service/inspection menus; labor/parts price rules; technician/bay capacity; customer authorization limits; parts substitutions; handover/test checklist; promised-date rules; warranty and comeback routing.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Vehicle/plate/mileage → customer/scan; concern → Layla; inspection/test findings → mechanic or workshop system; parts availability → inventory; approvals → authorized customer; handover/payment → verified receipt.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect vehicle concerns, explain mechanic-recorded findings, request estimate consent, provide status/delay updates and coordinate collection.

**Hasib's work:** Create linked work orders, validate current estimate approval, reserve bays/parts, track repair/test/ready events, maintain costs and queue all authorized reminders.

**Human work only where needed:** Mechanics inspect, repair and certify relevant checks; enter actual findings/work/handover only when no source supplies them. Exceptions cover unsafe conditions, nonstandard repair authorization and disputed warranty/refund decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

intake → inspection → awaiting_approval → approved → in_progress → quality_check → ready → collected → closed; parts_hold/cancelled as permitted. Explicit customer authorization stays separate from staff fact capture.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Dedicated workshop/estimate/parts foundations exist. Automatic event enrollment, current-estimate customer consent capture, cross-resource scheduling and status-notification dispatch need verified implementation.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| intake | Verified vehicle/contact and concern | Create work order and standard inspection checklist | Send intake receipt and reference | EV plus MISSING_INPUT | No repair authorization inferred from intake |
| inspection_complete | Mechanic supplies finding/service lines | Price known labor/parts under limits; create estimate revision | Explain finding and request approval | QUOTE | Technical ambiguity routes to mechanic |
| estimate_accepted | Authorized customer accepts exact scope/version | Save authorization and reserve available parts/bay | Confirm expected work and promise | EV | New extra work requires corresponding authorization |
| parts_or_schedule_hold | Authoritative shortage or capacity conflict | Record blocker and next verified checkpoint | Notify material delay with known facts | EV plus NO_PROGRESS | No guessed ready time |
| in_progress | Verified mechanic start | Start job clock and track approved tasks | Answer status inquiries automatically | EV optional | Do not duplicate unchanged updates |
| quality_passed | Required mechanic/test evidence complete | Mark ready and calculate verified balance | Send ready-for-collection update | EV plus COLLECTION | Failed quality checks block ready notification |
| collected | Verified handover | Close pickup jobs and update work/invoice state | Send receipt and approved service summary | EV plus BALANCE if applicable | Outstanding payment survives collection as its own obligation |
| comeback_or_due | Verified repeat concern or recorded next-service date | Link comeback or enroll next service without guessed intervals | Arrange suitable next step | RECOVERY or RENEWAL | Human decides roadworthiness and disputed cause |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Intake and inspection | Store VIN/registration reference, mileage, complaint, intake condition and inspection evidence; keep customer belongings/access details appropriately restricted. |
| Estimates and authorization | Version labor/part lines, diagnostic fees, customer decision and allowed price rules. New work outside accepted scope stops affected work and requests customer approval; unrelated approved work can continue. |
| Parts and courtesy resources | Reserve exact parts and any authorized bay/courtesy vehicle capacity. Track ordered, received, returned and consumed separately; unavailable resources cannot be promised. |
| Quality, collection and comeback | Technician/quality evidence gates ready. Link invoice, handover, warranty and same-issue return; ready, collected and paid are separate states with separately canceled follow-ups. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Workshop retains conversation context |
| Workshop | Default **Vehicle stage board** with **Vehicle, current stage, estimate approval, promised ready, parts blocker, advisor**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New work order** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Repair type; customer/warranty work; parts category; comeback reason**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Board · Schedule · Parts · Follow-ups. Keep quick filters **Awaiting approval · Parts needed · Past promise · Ready**. The record workspace includes **Vehicle/inspection; approved estimate; repair/quality events; invoice and collection**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Workshop, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Inspection entry → automatically priced estimate → customer consent → repair/test facts → ready update requires no advisor to copy the estimate or create reminders.
2. An estimate revision invalidates old acceptance and all queued approval messages.
3. Collection before a scheduled reminder cancels it while preserving a separately verified debt.
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
| Acquisition routes to test | Repair/service-specific local search, customer referrals, fleet partnerships and verified service history |
| Offer / next-step promise | A diagnostic/service appointment or a sourced estimate for a known service |
| Fit and readiness | Vehicle/service, location, urgency stated by customer, bay/technician capacity and available parts where needed |
| Verified conversion path | Attended appointment → authorized completed work order |
| Layla + Hasib automatic journey | Book capacity, present technician-backed inspection evidence/options, obtain current estimate approval and chase relevant declined work |
| Repeat / referral loop | Service-due reminders, fleet agreements and permitted referrals |
| Acquisition KPI focus | Cost per completed acquired-customer job; estimate acceptance; declined-work recovery; repeat contribution |
| Evidence mapping | [L09](lead-generation-evidence.md#l09); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** No invented fault, fear-based upsell or claim that all declined recommendations must be purchased.

**First proposed experiment:** Compare a generic quote request with a vehicle/service-specific diagnostic booking; judge completed authorized work, with repair complexity matched. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Workshop links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
