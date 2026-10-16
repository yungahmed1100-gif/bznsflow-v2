# Dental clinics — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/dental.md). Read this product specification alongside that build file.

عيادات الأسنان · Sector ID: `dental` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Reduce unused appointment capacity and improve administrative follow-through without turning the dashboard into a clinical record.

Dental visits use Hasib orders, with services, providers and recorded charges. The generic missed-visit and unpaid-visit calculations read booking records, while the dental pack disables generic appointments: an adapter and reconciliation are required before publishing these metrics. Manual follow-up tasks already exist.

## Industry evidence and recommended practice

ADA guidance supports reviewing a small practice KPI set. Its older US figures are not suitable default targets for an Omani clinic. Proposed priorities here are attendance, reception responsiveness and verified balances; treatment acceptance and clinical outcomes are outside this administrative pack. Sources: [ADA practice measurement guide](https://www.ada.org/resources/practice/practice-management/measuring-success20160428t155202). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Visits · Customers · Broadcasts · Insights · Settings**.

**Visits / الزيارات** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Visits, retaining the conversation return context. |
| Visits | Day schedule. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **Add visit**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Visits; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Visits: daily execution

**Secondary views:** Schedule · Visit list · Services · Follow-ups. These remain within the single `work` destination. Default: **Day schedule**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Visit time, patient reference, provider, administrative status, next action. **Quick filters:** Today · Unconfirmed · Missed · Follow-up due. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Administrative visit details; attendance; approved charges; staff-set follow-ups. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Visit attendance · Missed visits · Administrative follow-ups due · Overdue visit balances**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Provider; service group; new vs returning patient; time of day. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Visits and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **booking**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights` |
| Planned | `demand`, `digest`, `batches` |
| Off for this pack | `appointments`, `plans`, `recipes`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| `visit_date` | Visit date / تاريخ الزيارة | date | No additional limit declared in this pack configuration; domain validation still applies |
| `branch` | Branch / الفرع | text | Maximum 40 characters |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `supplies` (Supplies); `lab_fees` (Dental lab fees); `equipment` (Equipment maintenance); `marketing` (Marketing); `utilities` (Utilities); `fees` (Bank and payment fees); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** `sensitive=true`, `noOrderNotes=true`, `internalStock=true`, `serviceItems=true`, `fulfilment=in_store`.

The current source presentation uses work **Visits / الزيارات**, stock **Services / الخدمات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Administrative inquiry → staff-confirmed visit → confirmation → arrived → completed / missed / cancelled → staff-set administrative follow-up.

**Required record fields:** Visit/order ID; patient contact reference; provider; scheduled start/end; attendance status and timestamps; cancellation reason/time; charge adjustments; allocated payments; staff-set recall date and approved neutral reminder text. No clinical notes.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Visit attendance | Arrived or completed visits ÷ eligible visits due in the period × 100; completed is not counted again after arrived. | N: dental order-to-visit adapter and attendance states. | Reception lead · daily; recover unfilled slots. |
| **Headline** · Missed visits | Count eligible past visits explicitly marked missed; unresolved attendance appears as unknown. | N: reconcile dental orders, not empty generic booking tables. | Reception lead · daily; verify status before contacting anyone. |
| **Headline** · Administrative follow-ups due | Count open dental follow-up tasks whose dueAt is at or before now. | D: generic tasks linked to validated dental visits. | Reception lead · daily; handle staff-set recalls and rescheduling. |
| **Headline** · Overdue visit balances | Sum positive approved visit-charge balances whose recorded due dates have passed. | D/N: dental charges, due dates, adjustments and payment allocation. | Practice manager · daily; resolve recorded balances privately. |
| Diagnostic · Available-chair utilization | Occupied appointment minutes ÷ staffed bookable chair minutes × 100, bounded by actual resource overlap. | N/I: chair calendar, closures and attendance duration. | Practice manager · weekly; change scheduling capacity, not treatment duration. |
| Diagnostic · Late-cancellation rate | Visits cancelled inside the configured cutoff ÷ visits that were booked for the period × 100. | N: cancellation history and stable scheduled cohort. | Reception lead · weekly; inspect reminders and booking friction. |
| Diagnostic · Recall completion | Staff-set recalls followed by a completed visit inside W ÷ recalls with matured W-day window × 100. | N: recall event, linked completed visit; no AI-generated recall dates. | Practice manager · monthly; inspect uncontactable or declined recalls. |
| Diagnostic · Charge collection | Payments allocated to a matured charge cohort ÷ net collectible charges in that cohort × 100; show write-offs separately. | D/N: allocation and charge-cohort reporting. | Finance owner · monthly; reconcile accounts before reminders. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Visits

The canonical queue lives in **Visits → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Visit confirmation | Staff-confirmed appointment reaches configured offset. | Cancel or replace on reschedule; suppress clinical/service-sensitive wording; reception owns exceptions. |
| Missed visit recovery | Staff marks visit missed; create rescheduling task after clinic-defined delay. | Stop on rebooking, decline, reply or clinician instruction; never infer urgency. |
| Recall or balance | Use only a staff-entered recall due date or an approved current outstanding charge. | Stop when completed, paid, disputed, revoked or rescheduled; recipient must be verified. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Handle administrative inquiry, book permitted slots, confirm/reschedule, recover missed appointments and remind on clinician-set dates using neutral wording.

**Hasib:** Map dental order-backed visits correctly, reserve chair/provider resources, deduplicate attendance, create administrative tasks, allocate verified payments and calculate reception metrics.

**Minimum human involvement:** Record arrival/completion when no check-in integration exists; clinicians perform care and decide treatment/recall/urgency. Reception handles ambiguous identity, exceptional scheduling and disputes only.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Seed visits in dental orders with zero generic bookings: attendance must reflect the dental adapter or show unavailable, never a false zero.
2. An arrived-to-completed transition counts one attended visit; a cancelled visit follows the defined denominator policy.
3. A changed recall date or reversed charge invalidates its pending reminder; patient data is inaccessible across tenants.
4. Verify all six primary destinations, the sector Work label, Visits → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **administrative service catalog; provider/chair capacity; appointment duration; cancellation/no-show rules; neutral templates; clinician-set recall sources; fee schedules and billing authority.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Scheduling preferences/contact → Layla; available resources → practice calendar; arrival/completion → receptionist check-in or practice system; recall date → clinician-authorized record; charges/payments → billing source.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Handle administrative inquiry, book permitted slots, confirm/reschedule, recover missed appointments and remind on clinician-set dates using neutral wording.

**Hasib's work:** Map dental order-backed visits correctly, reserve chair/provider resources, deduplicate attendance, create administrative tasks, allocate verified payments and calculate reception metrics.

**Human work only where needed:** Record arrival/completion when no check-in integration exists; clinicians perform care and decide treatment/recall/urgency. Reception handles ambiguous identity, exceptional scheduling and disputes only.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

requested → booked → confirmed → arrived → completed; cancelled/missed are explicit outcomes. Recall and charge balances are separate lifecycles. Treatment decisions are not dashboard states for AI to infer.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Dental orders/charges exist, but generic booking-based metrics need reconciliation with dental visits. An order-to-visit adapter, authorized scheduling and automatic neutral reminders are not proven by an enabled registry flag.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| administrative_request | Verified scheduling intent | Create request and resolve allowed service/provider | Collect minimum booking fields; route clinical questions | MISSING_INPUT | No clinical note extraction into ordinary tasks |
| slot_selected | Valid slot and customer acceptance | Reserve required provider/chair resources | Send neutral confirmation | EV plus PRE_EVENT | Resource conflict yields alternate slots |
| reschedule | Verified customer requests an allowed change | Release old slot and reserve new slot in one validated operation | Confirm new date | EV plus regenerated PRE_EVENT | Cancel old reminder version |
| arrival_or_completion | Practice system or staff records factual visit outcome | Update visit adapter and appointment metrics | Acknowledge administrative next steps where configured | EV optional | No AI diagnosis or treatment-completion assumption |
| missed_visit | Staff or authoritative attendance process confirms missed status | Close original appointment obligation and offer permitted alternatives | Send one neutral recovery invitation | RECOVERY | Stop on booking, reply, decline or staff hold |
| recall_due | Clinician-authorized recall date exists | Create due enrollment linked to current recall revision | Offer eligible appointment options | RENEWAL at 14 and 3 days before the clinician-recorded recall date | No invented treatment interval or medical urgency |
| charge_due | Authorized charge and due date with current unpaid balance | Reconcile allocations and schedule reminder | Communicate neutral verified balance privately | BALANCE | Pause on dispute/payment reversal; avoid clinical details |
| customer_reply | Verified response on active administrative task | Resolve matching request and cancel no-response steps | Continue booking workflow automatically where unambiguous | EV or cancelled sequence | Do not cancel every unrelated future appointment |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Visits and capacity | Map dental order records to the administrative visit lifecycle before attendance reporting; reserve provider/chair/duration and buffer together. Appointment confirmation never means treatment completion. |
| Patient and guardian | Use verified patient/guardian contact links, administrative service code and contact preferences. Keep clinical findings and sensitive attachments outside ordinary reminder text. |
| Recall and treatment-related scheduling | Only a clinician-recorded recall date or approved administrative schedule starts recall. Layla can arrange that visit and chase the customer's decision; it cannot choose a treatment interval or recommend care. |
| Charges and corrections | Use approved charge items, verified receipts and credited/refunded amounts. Correct attendance through an audited event and cancel associated wrong reminders; professional clinical work is distinct from administrative automation. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Visits retains conversation context |
| Visits | Default **Day schedule** with **Visit time, patient reference, provider, administrative status, next action**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **Add visit** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Provider; service group; new vs returning patient; time of day**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Schedule · Visit list · Services · Follow-ups. Keep quick filters **Today · Unconfirmed · Missed · Follow-up due**. The record workspace includes **Administrative visit details; attendance; approved charges; staff-set follow-ups**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Visits, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Book and reschedule an administrative visit through Layla; no separate staff task creation or reminder approval occurs within policy.
2. The dental order adapter produces correct attendance with an empty generic bookings table.
3. A clinical question reaches qualified staff without creating a guessed recall date or clinical recommendation.
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
| Acquisition routes to test | Local service discovery, accurate practice listings and patient-initiated referrals |
| Offer / next-step promise | An administrative appointment for a service the practice actually offers |
| Fit and readiness | Service, branch, provider availability, requested time and verified patient/guardian contact; clinical suitability stays with clinicians |
| Verified conversion path | Confirmed new-patient visit → verified attendance |
| Layla + Hasib automatic journey | Ask missing administrative details, reserve a permitted slot, send reminders and recover a verified missed visit; no manual reception copying |
| Repeat / referral loop | Clinician-set recall, permitted reactivation and voluntary referrals after service |
| Acquisition KPI focus | Cost per attended new-patient visit; booking/attendance rates; recall return rate; permitted aggregate acquisition cost |
| Evidence mapping | [L06](lead-generation-evidence.md#l06); [P01](lead-generation-evidence.md#p01); [P03](lead-generation-evidence.md#p03) |

**Sector limits:** Do not send health-related conversion data to prohibited ad destinations or rank access by expected treatment spend.

**First proposed experiment:** Compare the existing contact path with an explicit administrative service/branch/available-time path; judge attended new-patient visits and booking abandonment. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Visits links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
