# Construction — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/construction.md). Read this product specification alongside that build file.

المقاولات · Sector ID: `construction` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Expose schedule slippage, unapproved scope and collectible certified balances before they damage project margin.

Dedicated construction projects, milestones, procurement, variations and certified receivables exist. Owner metrics include schedule risk, submitted variation exposure and overdue certified receivables. Forecast-at-completion and formal approval-cycle metrics need versioned baseline and cost inputs.

## Industry evidence and recommended practice

Procore guidance highlights information and approval turnaround in contractor performance. It does not establish a universal schedule or margin target. Proposed practice: freeze the original baseline, record approved changes, and separate submitted variations from approved revenue. Sources: [Procore performance metrics for general contractors](https://www.procore.com/library/performance-metrics-insights-general-contractors). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Projects · Customers · Broadcasts · Insights · Settings**.

**Projects / المشاريع** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Projects, retaining the conversation return context. |
| Projects | Project risk list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New project**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Projects; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Projects: daily execution

**Secondary views:** Projects · Milestones · Procurement · Follow-ups. These remain within the single `work` destination. Default: **Project risk list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Project, next milestone, schedule risk, approval exposure, project manager. **Quick filters:** At risk · Approvals overdue · Materials due · Receivables overdue. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Approved baseline; variations; commitments; certificates and retention. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Milestones on time · Unapproved variation exposure · Overdue certified receivables · Forecast gross contribution**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Project type; milestone phase; procurement cause; approved vs original baseline. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Projects and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **project**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

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

The current source presentation uses work **Projects / المشاريع**, stock **Procurement / المشتريات**, workflow key **`construction`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Approved scope/budget → baseline milestones → procurement and execution → inspection/acceptance → certification → invoice/collection; variations run through separate approval.

**Required record fields:** Project ID; original and current approved milestone baseline; actual dates; budget revision; actual and committed costs; remaining-cost forecast; variation submitted/approved/rejected dates; certificate, invoice, retention and payment references.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Milestones on time | Milestones achieved by current approved due date ÷ milestones due in period × 100; show original-baseline comparison separately. | D/N: milestone history and dated approved extensions. | Project manager · weekly; resolve dependencies before due dates. |
| **Headline** · Unapproved variation exposure | Sum submitted nonapproved variation values; display associated actual costs separately. | D: variation register; preserve currencies and revisions. | Commercial lead · daily; obtain approval before further discretionary work. |
| **Headline** · Overdue certified receivables | Sum unpaid certified invoice balances past approved payment due date, excluding not-yet-due retention. | D: certificates, invoices, payments and retention terms. | Finance lead · daily; resolve payment and certificate disputes. |
| **Headline** · Forecast gross contribution | Approved contract value minus actual costs minus outstanding commitments minus uncommitted forecast-to-complete costs; no overlap. | N/I: reconciled costs, commitments and remaining-work forecast. | Project director · weekly; review erosion and contingency. |
| Diagnostic · Approval turnaround | Median and p90 elapsed time from complete RFI/submittal submission to final response; open requests show current age. | N: approval request events and completeness status. | Project manager · weekly; escalate aged blockers. |
| Diagnostic · Procurement on-time delivery | Required deliveries received in full by approved needed date ÷ deliveries due in period × 100. | D/N: purchase requirements and goods receipt. | Procurement lead · weekly; resolve critical-path shortages. |
| Diagnostic · Rework cost share | Verified rework direct cost ÷ total direct cost for the same period/project × 100. | N: rework cause and cost coding. | Quality lead · monthly; fix repeated defects. |
| Diagnostic · Retention due | Sum unreleased retention balances whose contract-specific release conditions are staff-verified and due. | N: retention schedule and evidence of eligibility. | Commercial lead · monthly; request eligible releases. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Projects

The canonical queue lives in **Projects → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Approval blocker | RFI, submittal or variation reaches its staff-set response deadline. | Stop on final response, superseding version or withdrawal; internal escalation is the default. |
| Milestone dependency | A required procurement or approval event remains unresolved before the milestone offset. | Stop when resolved or baseline formally changes; never silently extend contractual dates. |
| Certified balance | Approved certified invoice becomes due and remains unpaid. | Stop on payment, dispute, credit, changed certificate or retention restriction. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Request missing project inputs, coordinate routine supplier/client decisions, communicate verified progress and issue approved administrative reminders.

**Hasib:** Generate milestone/dependency tasks, monitor approved baselines, reconcile commitments and receipts, register variation versions, assemble certified balances and produce automated exception digests.

**Minimum human involvement:** Site staff report physical progress, inspections and receipts when systems do not. Engineers/authorized signatories certify work and decide technical/contractual changes outside standing authority.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. An unapproved variation raises exposure but does not increase approved revenue or collectible balance.
2. A formal extension changes the approved-baseline result while preserving the original schedule result.
3. Actual costs already included in a commitment are not subtracted twice in forecast contribution.
4. Verify all six primary destinations, the sector Work label, Projects → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **approved project baseline; task/dependency templates; delegated commercial limits; supplier terms; standard notice templates; approved cost codes; certification/retention rules; role authority.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Approved contract/baseline → project records; actual progress/inspection → site/authorized systems; procurement/receipt → vendor/warehouse; approvals/certificates → authorized parties; costs/payments → verified accounting import.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Request missing project inputs, coordinate routine supplier/client decisions, communicate verified progress and issue approved administrative reminders.

**Hasib's work:** Generate milestone/dependency tasks, monitor approved baselines, reconcile commitments and receipts, register variation versions, assemble certified balances and produce automated exception digests.

**Human work only where needed:** Site staff report physical progress, inspections and receipts when systems do not. Engineers/authorized signatories certify work and decide technical/contractual changes outside standing authority.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

approved_baseline → planned → executing → inspected → certified → invoiced → paid/retention_due → closed. Variation, procurement and milestone children have independent versioned states.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Project/milestone/procurement/variation/certified-receivable foundations exist. Automatic document/version ingestion, dependency scheduler, trusted progress integrations and authorized notification engine remain additions.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| project_approved | Authoritative signed/approved scope and baseline | Instantiate milestones, dependencies, budgets and supplier tasks | Collect remaining administrative onboarding inputs | MISSING_INPUT | AI extraction cannot silently approve a contract baseline |
| milestone_progress | Site/system reports verified actuals | Update progress and downstream risk; retain original baseline | Send configured material progress summary | CHECKPOINT | Elapsed time cannot mark physical work complete |
| procurement_needed | Approved requirement hits lead-time threshold | Prepare/reserve procurement under delegated policy and check stock | Request supplier confirmation using authorized terms | REVIEW | Purchase commitment outside authority becomes exception |
| goods_received | Warehouse/site verifies quantity and condition | Match receipt to purchase item; release eligible dependencies | Confirm receipt or request discrepancy resolution | EV optional | Partial/damaged receipt cannot satisfy full delivery |
| variation_requested | Versioned extra scope entered | Price from authorized rates; track exposure and affected tasks | Request required counterpart decision | REVIEW | Submitted is not approved revenue; formal change authority remains |
| approval_overdue | RFI/submittal/variation deadline passes | Rank critical-path blocker and escalate automatically | Issue approved administrative reminder | REVIEW | Do not emit binding legal notices without authorized template/authority |
| certificate_due | Authorized inspection/certificate evidence exists | Prepare valid invoice/retention schedule and reconcile allocations | Send approved balance reminder | BALANCE | No invoice for unverified certification |
| project_closed | Required completion/sign-off facts received | Close eligible tasks, retain retention/warranty obligations | Send approved completion package | EV; RENEWAL only if contract requires | Closure never discards retention or unresolved defects |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Baseline and milestones | Store original/approved dates, project scope, dependencies, measured quantities and responsible parties. An automatically calculated risk is not proof that work progressed. |
| Variations and procurement | Track change request, agreed amount/time effect and exact acceptance; identify unapproved exposure separately. Purchase approval authority and supplier commitments determine what can auto-order. |
| Certificates and retention | Keep completed work, certified value, invoice, cash and retained amounts separate. Reminder dates come from the applicable recorded contract/certificate, not model guesses. |
| Site quality and safety | Record professional inspection and acceptance evidence once; generate corrective tasks automatically. Do not let elapsed time, photographs alone or a target KPI auto-certify structural/safety work. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Projects retains conversation context |
| Projects | Default **Project risk list** with **Project, next milestone, schedule risk, approval exposure, project manager**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New project** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Project type; milestone phase; procurement cause; approved vs original baseline**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Projects · Milestones · Procurement · Follow-ups. Keep quick filters **At risk · Approvals overdue · Materials due · Receivables overdue**. The record workspace includes **Approved baseline; variations; commitments; certificates and retention**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Projects, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Approved baseline automatically creates dependencies, due tasks and reminders without a planner re-entering every milestone.
2. Unapproved variation costs surface as exposure while approved revenue remains unchanged.
3. A certification correction cancels stale payment reminders and recalculates only affected balances.
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
| Acquisition routes to test | Project-type case studies, architect/consultant partnerships, referrals and permitted tender/RFQ feeds |
| Offer / next-step promise | A scoped site survey or project consultation with relevant proof |
| Fit and readiness | Project type, site, scope, drawings availability, budget band, start date, procurement process and delivery capacity |
| Verified conversion path | Qualified opportunity → completed site survey → accepted contract |
| Layla + Hasib automatic journey | Collect brief/documents, score explicit fit, route the right estimator, schedule survey and manage versioned proposal decisions |
| Repeat / referral loop | Milestone-based relationship contact, related project referrals and contracted maintenance where offered |
| Acquisition KPI focus | Cost per qualified project; survey-to-proposal; matured proposal win rate; expected versus realized contribution; sales cycle |
| Evidence mapping | [L03](lead-generation-evidence.md#l03); [L18](lead-generation-evidence.md#l18) |

**Sector limits:** Long sales cycles need mature cohorts; a submitted bid is not won revenue and generic contractor data is only a proxy.

**First proposed experiment:** Compare generic company proof with project-type-matched case evidence before the same site-survey CTA; judge qualified surveys and mature accepted proposals. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Projects links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
