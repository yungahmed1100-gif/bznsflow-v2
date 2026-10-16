# Education & training — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/education.md). Read this product specification alongside that build file.

التعليم والتدريب · Sector ID: `education` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Preview**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Turn inquiries into sustained participation and verified course completion while making learning progress visible separately from attendance.

Lessons, enrollment, booking credits and unpaid fees exist in preview. Assessment results, completion criteria and cohort histories need explicit models. Attendance alone cannot establish learning or employment outcomes.

## Industry evidence and recommended practice

ATD's explanation of the Kirkpatrick framework distinguishes reaction, learning, behavior and results. This informs the proposed separation of attendance from demonstrated learning; it is not a ranking or a universal course-completion target. Sources: [ATD explanation of Kirkpatrick evaluation](https://www.td.org/content/press-release/new-atd-book-updates-kirkpatricks-four-levels-of-training-evaluation). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Learning · Customers · Broadcasts · Insights · Settings**.

**Learning / التعليم** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Learning, retaining the conversation return context. |
| Learning | Cohort and session schedule. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New enrollment**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Learning; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Learning: daily execution

**Secondary views:** Schedule · Enrollments · Courses · Follow-ups. These remain within the single `work` destination. Default: **Cohort and session schedule**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Learner/cohort, next session, attendance, credits, document/fee state. **Quick filters:** Intake pending · Absent · Credits low · Completion due. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Verified guardian link; enrollment; session/credit ledger; staff-approved assessment. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Inquiry-to-enrollment conversion · Learner attendance · Course completion · Fees overdue**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Course/cohort; intake source; learning coverage; progression level. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Learning and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **project**; registry status: **preview**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `appointments`, `plans`, `enrolments`, `quotes` |
| Planned | `demand`, `digest` |
| Off for this pack | `recipes`, `batches`, `shelfLife`, `jobCards`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `materials` (Materials); `subcontract` (Subcontractors); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Lessons / الدروس**, stock **Supplies / المستلزمات**, workflow key **`lessons`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Inquiry → placement/trial if needed → enrollment → payment/credits → scheduled sessions → attendance → assessment → completion → next level.

**Required record fields:** Course and cohort; learner and verified guardian relationship if applicable; enrollment events; session roster/capacity; attendance status; credit ledger; staff-approved assessment rubric/result; completion criteria version; fee/payment allocation.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Inquiry-to-enrollment conversion | Qualified course inquiries enrolling within W ÷ qualified inquiries with matured W-day window × 100. | N: qualification and enrollment linkage. | Admissions lead · weekly; resolve incomplete applications. |
| **Headline** · Learner attendance | Attended learner-session opportunities ÷ eligible scheduled learner-session opportunities × 100. | D/N: roster and booking outcomes; cancelled sessions excluded. | Course coordinator · weekly; follow up on absences. |
| **Headline** · Course completion | Learners meeting published criteria by deadline plus grace ÷ enrolled learners whose completion window has matured × 100. | N: versioned criteria, withdrawal policy and completion events. | Academic lead · per cohort; inspect support needs. |
| **Headline** · Fees overdue | Sum positive approved enrollment-fee balances beyond recorded due dates. | D/N: existing unpaid fees plus due dates and allocation. | Finance owner · weekly; resolve payment plans. |
| Diagnostic · Verified learning attainment | Assessed learners meeting staff-approved rubric ÷ assessed learners × 100; also show assessed ÷ eligible learners. | N/I: trusted assessment data and rubric. | Academic lead · per cohort; revise teaching support. |
| Diagnostic · Remaining lesson credits | Sum valid unused credits, with expiry and disputed balances separated. | D: existing enrollment/credit ledger. | Coordinator · daily; schedule eligible lessons. |
| Diagnostic · Cohort seat utilization | Active enrollments ÷ staffed course capacity × 100, by cohort; not room attendance. | N: cohort capacity and active enrollment definition. | Owner · weekly; plan additional cohorts. |
| Diagnostic · Continuation to next level | Eligible completers enrolling in the next appropriate offering within W ÷ matured eligible completers × 100. | N: course progression mapping and explicit eligibility. | Owner · termly; inspect progression barriers. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Learning

The canonical queue lives in **Learning → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Enrollment documents | Administrative checklist remains incomplete before intake deadline. | Stop on verified receipt, withdrawal or reply; request only necessary information. |
| Absence support | Teacher records absence and chooses appropriate recipient. | Stop on contact, reschedule or withdrawal; verify guardian authority before contacting a minor's guardian. |
| Course/credit renewal | Staff-approved next course or credit expiry enters the chosen horizon. | Stop on enrollment, exhausted/expired credits or decline; never promise grades or job placement. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Explain approved programs, collect enrollment details, schedule trial/admission sessions, send class/assignment reminders and share authorized learner progress already recorded by instructors.

**Hasib:** Validate prerequisites, guardian relationships and capacity, create enrollment/cohort links, schedule class tasks, reconcile attendance/fees and calculate completion and retention with defined populations.

**Minimum human involvement:** Teach and assess learning; decide accommodations and admissions exceptions. Enter actual assessment/attendance only where the learning system cannot provide it; AI does not invent grades or replace professional safeguarding decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. A missed session rescheduled as a replacement consumes credits under one consistent policy, not twice.
2. A student absent from assessment does not silently appear as a successful learner; coverage stays visible.
3. Changing a course's completion rubric does not retroactively alter completed cohorts without an audited migration.
4. Verify all six primary destinations, the sector Work label, Learning → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **course catalog and fees; admission prerequisites; instructor/room capacity; attendance rules; guardian authorization for minors; renewal/payment rules; approved learning communications.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Learner/verified guardian → course interest and available times; LMS/SIS → enrollment, assignment, assessment and attendance facts; instructor → verified learning outcomes; billing → payment; staff → missing attendance where needed.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Explain approved programs, collect enrollment details, schedule trial/admission sessions, send class/assignment reminders and share authorized learner progress already recorded by instructors.

**Hasib's work:** Validate prerequisites, guardian relationships and capacity, create enrollment/cohort links, schedule class tasks, reconcile attendance/fees and calculate completion and retention with defined populations.

**Human work only where needed:** Teach and assess learning; decide accommodations and admissions exceptions. Enter actual assessment/attendance only where the learning system cannot provide it; AI does not invent grades or replace professional safeguarding decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

inquiry → eligible → trial/application → enrolled → active → completed/withdrawn; session attendance and assignment status are separate records. Enrollment payment, prerequisite verification and learning achievement remain distinct.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Generic booking/customer records do not supply LMS evidence or guardian permissions. Add enrollment/cohort, instructor assessment, attendance and billing adapters.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| program_request | Verified course interest and age/guardian relationship if needed | Check catalog/prerequisites and available cohorts | Ask missing enrollment facts | MISSING_INPUT | No sensitive learner detail before recipient authorization |
| trial_application | Eligible application and available resource | Book intake/trial and checklist | Confirm requirements and visit details | PRE_EVENT | Reschedule cancels old reminders |
| enrolled | Accepted terms, prerequisites and payment conditions | Reserve cohort capacity and create schedule | Send onboarding and class plan | EV | Do not infer prerequisite completion from free text |
| class_changed | Authorized schedule change | Rebook valid resources and update all affected jobs | Notify authorized learner/guardian of exact change | EV; PRE_EVENT | Suppress obsolete room/time instructions |
| attendance | Instructor/LMS verified status | Update session record and exception thresholds | Send permitted missed-session recovery | RECOVERY on verified absence | Unknown attendance is not absence |
| assignment_due | LMS assignment and actual deadline | Track submission obligation and current completion | Send approved deadline reminder | REVIEW | Submission, extension or withdrawal supersedes reminder |
| progress_published | Instructor-approved assessment/report | Publish authorized summary and link source | Explain recorded progress without inventing judgment | EV | Only appropriate guardian/learner access; corrections preserve history |
| term_completed | Verified completion or upcoming enrollment expiry | Compute cohorts and authorized next-course eligibility | Offer renewal/next course where permitted | RENEWAL; FEEDBACK | Failed/withdrawn outcomes cannot become completed automatically |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Cohorts and courses | Version course, prerequisites, instructor/room capacity, schedule and assessment rubric. Transfers preserve old cohort history and recalculate future obligations. |
| Learners and guardians | Verify relationship, permissions and preferred contact for each learner; siblings are distinct records. Delivery to a guardian does not mean learner attendance or task completion. |
| Credits and assessment | Keep enrollment credits, session attendance, assignment submission, assessed result and earned completion distinct. Instructors provide professional learning judgments. |
| Fees and progression | Allocate payments to correct learner/term and apply accepted installment terms. Offer the next eligible course only from recorded prerequisites, not a guessed ability level. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Learning retains conversation context |
| Learning | Default **Cohort and session schedule** with **Learner/cohort, next session, attendance, credits, document/fee state**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New enrollment** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Course/cohort; intake source; learning coverage; progression level**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Schedule · Enrollments · Courses · Follow-ups. Keep quick filters **Intake pending · Absent · Credits low · Completion due**. The record workspace includes **Verified guardian link; enrollment; session/credit ledger; staff-approved assessment**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Learning, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. An unrelated adult cannot receive a minor's report through a matching surname.
2. A revised class time invalidates every affected old reminder.
3. Unmarked attendance remains incomplete and does not trigger a false absence warning.
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
| Acquisition routes to test | Program-specific search/content, information sessions, school/employer partners and verified learner referrals |
| Offer / next-step promise | Relevant course information plus an available trial, assessment or information session |
| Fit and readiness | Program interest, level/prerequisites, format, start date, availability and guardian authority where relevant |
| Verified conversion path | Attended information/trial session → accepted paid enrollment |
| Layla + Hasib automatic journey | Match eligible program/cohort, collect missing application records, schedule sessions and follow enrollment deadlines |
| Repeat / referral loop | Course progression, opt-in next-term enrollment and learner/employer referrals |
| Acquisition KPI focus | Cost per enrolled learner; session-to-enrollment; start/attendance rate; matured continuation |
| Evidence mapping | [L13](lead-generation-evidence.md#l13) |

**Sector limits:** University case evidence is a proxy for training SMEs; a downloaded prospectus or submitted form is not enrollment.

**First proposed experiment:** Compare a generic prospectus CTA with a program-specific information/session path; judge actual enrollments and course starts. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Learning links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
