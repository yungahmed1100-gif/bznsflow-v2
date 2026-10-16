# Medical clinics — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/clinic.md). Read this product specification alongside that build file.

العيادات الطبية · Sector ID: `clinic` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Preview; governance-gated**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Make reception access, scheduling reliability and waiting-list work visible while keeping clinical decision-making outside Ascend.

Preview booking/service/resource records and administrative metrics exist. Source preview status does not open clinical collection or establish production readiness. Access-time sampling, queue states and waiting-list offer lifecycle need new capture.

## Industry evidence and recommended practice

IHI describes third-next-available appointment as an access measure. This is a measurement method, not a current benchmark. The proposed clinic dashboard pairs access with attendance and waiting time so fast booking does not hide overloaded reception. Sources: [IHI Whole System Measures white paper](https://www.ihi.org/sites/default/files/lms/legacy/education/IHIOpenSchool/Courses/Documents/CourseraDocuments/07_IHIWholeSystemMeasuresWhitePaper2007.pdf). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Visits · Customers · Broadcasts · Insights · Settings**.

**Visits / الزيارات** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Visits, retaining the conversation return context. |
| Visits | Reception queue. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **Book visit**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Visits; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Visits: daily execution

**Secondary views:** Queue · Schedule · Waiting list · Follow-ups. These remain within the single `work` destination. Default: **Reception queue**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Scheduled time, patient reference, provider, arrival state, waiting duration. **Quick filters:** Arrived · Unconfirmed · Access pending · Waiting-list offers. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Administrative booking; reception timestamps; slot offer history; approved balances. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Attendance · Unconfirmed upcoming visits · Median reception wait · Waiting-list fill rate**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Provider/service; appointment type; access delay; appointment lead time. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Visits and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **booking**; registry status: **preview**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `appointments`, `plans` |
| Planned | `demand`, `digest`, `batches` |
| Off for this pack | `recipes`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `supplies` (Supplies); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Visits / الزيارات**, stock **Supplies / المستلزمات**, workflow key **`bookings`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Administrative request → resource-safe booking → confirmed → arrived → reception handoff → completed / missed; separate waiting-list offer → accepted / expired.

**Required record fields:** Administrative request timestamp; service/provider; routine appointment inventory snapshot; booking and attendance timestamps; arrival/handoff timestamps; waiting-list permission and offer expiry; staff-set due dates; charge/payment references.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Attendance | Arrived or completed visits ÷ eligible scheduled visits due in the period × 100. | D/N: booking outcomes; missing attendance shown separately. | Reception lead · daily; correct status and recover capacity. |
| **Headline** · Unconfirmed upcoming visits | Count scheduled future visits requiring confirmation within the selected horizon. | D: booking states; add horizon boundary to source query. | Reception lead · daily; contact eligible patients. |
| **Headline** · Median reception wait | Median and p90 minutes from recorded arrival to reception handoff for completed queue episodes. | N: queue timestamps, not inferred from chat. | Clinic manager · daily; adjust reception staffing. |
| **Headline** · Waiting-list fill rate | Vacated slots filled by accepted waiting-list offers ÷ eligible vacated slots offered × 100. | N: slot IDs, offers, expiry and atomic acceptance. | Reception lead · weekly; improve matching without double booking. |
| Diagnostic · Third-next-available routine appointment | At a fixed daily sample time, count calendar days to each provider/service's third available routine slot; show provider distribution. | N/I: trustworthy availability snapshots; no slot means unavailable/censored. | Clinic manager · weekly; review routine access capacity. |
| Diagnostic · Late cancellations | Count cancellations inside configured cutoff; report rate against booked visits in that due-period cohort. | D/N: booking change history. | Reception lead · weekly; examine causes by service. |
| Diagnostic · Administrative request resolution | Requests completed within agreed business-hours SLA ÷ requests whose SLA deadline falls in period × 100. | N: request types, owner, deadline and completion event. | Operations lead · weekly; clear document or scheduling blockers. |
| Diagnostic · Overdue approved charges | Sum positive unpaid, undisputed charge balances beyond staff-recorded due dates; disputed total shown separately. | D/N: booking-linked orders and allocation. | Finance owner · daily; verify before reminders. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Visits

The canonical queue lives in **Visits → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Appointment reminder | Confirmed administrative visit reaches configured offset. | Replace on reschedule; stop on cancellation and avoid health details. |
| Waiting-list offer | Staff releases an eligible slot and approves a matching recipient. | Expire at recorded deadline; first valid acceptance reserves atomically; withdraw competing offers. |
| Missed administrative request | Required nonclinical detail remains incomplete past the configured delay. | Stop on receipt, reply or closure; route any medical question to staff. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Resolve administrative requests, book permitted visits, send confirmations and waiting-list offers, collect missing nonclinical details and answer reception-status questions.

**Hasib:** Reserve resources, maintain queue timestamps, allocate waiting-list offers atomically, calculate access/attendance measures and expire obsolete tasks.

**Minimum human involvement:** Enter physical arrival/handoff facts if not captured electronically. Qualified staff decide clinical urgency, suitability and medical actions. Reception handles identity conflicts and exceptional access only.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Two waiting-list acceptances for one slot result in one reservation and one visible unavailable response.
2. A calendar with fewer than three known available slots produces an unavailable access measure, not zero days.
3. Clinical text is excluded from KPI exports and reminder drafts; unrelated patient records are not exposed.
4. Verify all six primary destinations, the sector Work label, Visits → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **approved administrative service list; provider/room availability; reception queue rules; waiting-list permissions; routine access reporting; neutral templates; fee/identity rules; clinic governance gate.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Contact/preferences → Layla; appointment inventory → authoritative calendar; arrival/handoff/completion → reception/practice system; medical priority → qualified clinical staff; balances → approved billing source.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Resolve administrative requests, book permitted visits, send confirmations and waiting-list offers, collect missing nonclinical details and answer reception-status questions.

**Hasib's work:** Reserve resources, maintain queue timestamps, allocate waiting-list offers atomically, calculate access/attendance measures and expire obsolete tasks.

**Human work only where needed:** Enter physical arrival/handoff facts if not captured electronically. Qualified staff decide clinical urgency, suitability and medical actions. Reception handles identity conflicts and exceptional access only.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

request → booked → confirmed → arrived → handed_off → completed; cancelled/missed explicit. Waiting-list offer: eligible → offered → accepted/expired/withdrawn; only one acceptance can consume a slot.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Preview administrative booking foundations exist; clinic remains separately governance-gated. Queue timestamps, waiting-list lifecycle, automatic dispatch and integrated access-time measurement need implementation.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| request | Administrative request from verified contact | Create typed request and choose checklist | Collect only missing administrative details | MISSING_INPUT | Clinical intent is routed to staff, not autonomously triaged |
| booking | Customer selects available routine slot | Reserve correct room/provider | Send neutral confirmation | EV plus PRE_EVENT | No double booking or inferred service suitability |
| slot_cancelled | Valid cancellation releases capacity | Find waiting-list matches under consent and service constraints | Send a time-limited slot offer | SLOT_OFFER | Exclude clinical prioritization unless staff supplies it |
| offer_accepted | Verified acceptance before expiry | Atomically consume slot; withdraw other offers | Confirm successful reservation or explain slot unavailable | EV | One slot has one winning reservation |
| arrival | Check-in or receptionist event | Start reception wait clock | Acknowledge arrival where useful | EV optional | Arrival is not clinical handoff |
| handoff_completed | Authorized reception/practice events | Stop queue/visit timers and update metrics | Send administrative next steps only if configured | EV optional | No medical outcome inference |
| missing_document | Required administrative item remains absent | Track document-status metadata and route to correct owner | Request missing item through permitted channel | MISSING_INPUT | Do not request unnecessary health content |
| missed_or_rescheduled | Verified attendance outcome or allowed customer change | Replace obligations and cancel outdated jobs | Offer appropriate administrative recovery | RECOVERY or PRE_EVENT | Staff restrictions override automatic rebooking |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Reception and waiting | Store scheduledAt, arrivedAt, calledAt and service-start facts separately. Queue position is operational order, not medical urgency; clinical priority must be supplied by an authorized professional/system. |
| Waitlist allocation | Match provider, service, duration and authorized priority. One expiring offer reserves capacity atomically; a declined/expired offer advances fairly without double booking. |
| Documents and identity | Request only necessary administrative documents through authorized storage. Verify guardian/dependent authority and gate access before revealing visit history. |
| Governance and clinical scope | Keep the existing clinic gate. Layla handles scheduling and approved administrative content; clinical triage, diagnosis, treatment and emergency protocols remain with the authorized clinical workflow, never a generic follow-up model. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Visits retains conversation context |
| Visits | Default **Reception queue** with **Scheduled time, patient reference, provider, arrival state, waiting duration**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **Book visit** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Provider/service; appointment type; access delay; appointment lead time**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Queue · Schedule · Waiting list · Follow-ups. Keep quick filters **Arrived · Unconfirmed · Access pending · Waiting-list offers**. The record workspace includes **Administrative booking; reception timestamps; slot offer history; approved balances**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

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

1. Released slot → eligible offer → valid acceptance → confirmed appointment completes without reception copying records.
2. Simultaneous acceptances reserve the slot only once.
3. A medical-priority request stops administrative automation and creates a clinical handoff with minimal necessary context.
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
| Acquisition routes to test | Accurate provider/service discovery, appointment pages and authorized referral partners |
| Offer / next-step promise | Available administrative appointment options |
| Fit and readiness | Service/provider/location/time and authorized scheduling criteria; clinical priority is supplied professionally |
| Verified conversion path | Confirmed appropriate appointment → verified attendance |
| Layla + Hasib automatic journey | Answer access questions, allocate real capacity, offer released slots to eligible waitlists and cancel stale reminders |
| Repeat / referral loop | Approved recall/return scheduling and administrative continuity journeys |
| Acquisition KPI focus | Cost per attended new patient where measurable; access delay; inquiry-to-attendance; waitlist fill |
| Evidence mapping | [L07](lead-generation-evidence.md#l07); [P01](lead-generation-evidence.md#p01); [P03](lead-generation-evidence.md#p03) |

**Sector limits:** Keep the clinic gate; no symptom-based ad audiences, automated clinical triage or generic customer-data export.

**First proposed experiment:** Compare the current administrative booking request with verified available-time choices; judge access/attendance without changing clinical priority. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Visits links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
