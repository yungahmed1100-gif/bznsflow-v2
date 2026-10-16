# Technology & software — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/technology.md). Read this product specification alongside that build file.

التقنية والبرمجيات · Sector ID: `technology` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Pending**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Deliver accepted client outcomes reliably, resolve support obligations and retain suitable contracts without confusing activity with software quality.

Catalyst customer communication is reusable. Discovery/project/support records, acceptance versions and renewals need a new adapter. Repository, deployment, incident and subscription data are external integrations; the current dashboard does not measure DORA performance.

## Industry evidence and recommended practice

DORA's January 2026 guide uses five software-delivery measures and recommends application/service-level context. SPI offers broader services context. Proposed Ascend starts with client delivery and support; DORA diagnostics appear only after authoritative engineering data is connected. Sources: [DORA software delivery performance metrics](https://dora.dev/guides/dora-metrics/); [SPI 2025 Professional Services Maturity Benchmark announcement](https://spiresearch.com/the-18th-annual-professional-services-maturity-benchmark-report-is-out-now/). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Projects · Customers · Broadcasts · Insights · Settings**.

**Projects / المشاريع** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Projects, retaining the conversation return context. |
| Projects | Delivery and support list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New project**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Projects; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Projects: daily execution

**Secondary views:** Projects · Support · Milestones · Follow-ups. These remain within the single `work` destination. Default: **Delivery and support list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Project/service, milestone or support issue, due/SLA, client blocker, owner. **Quick filters:** Requirements missing · Awaiting acceptance · SLA risk · Renewal due. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Approved scope; versioned acceptance; support history; contract/cost. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Accepted milestones on time · Support SLA attainment · Client-blocked work · Project/contract contribution**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Service/application; contract type; ticket priority; deployment-caused incidents. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Projects and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

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

**Workflow:** Discovery → approved scope/proposal → implementation → review/acceptance → authorized release/handoff → support → renewal.

**Required record fields:** Project/service ID; approved requirements and scope version; milestone promise/acceptance; support priority and SLA calendar; client blocker timestamps; contract/renewal; cost/time records; optional commit, deploy, incident and subscription events.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Accepted milestones on time | Milestones accepted by approved due date ÷ milestones due in period × 100; scope revisions auditable. | N: commitments and acceptance events. | Delivery lead · weekly; resolve requirement and review blockers. |
| **Headline** · Support SLA attainment | Eligible tickets resolved within agreed priority-specific SLA ÷ tickets whose resolution deadline falls in period × 100; breaches still open count. | N/I: support lifecycle, business calendar and pause policy. | Support lead · daily; triage breached obligations. |
| **Headline** · Client-blocked work | Count open work items awaiting a named client input; median/p90 blocked age and promised date shown. | N: blocker reason, start/end and owner. | Account lead · daily; consolidate missing inputs. |
| **Headline** · Project/contract contribution | Net recognized service revenue minus attributable labor, cloud, contractors and direct support costs. | N/I: revenue/cost allocation and project identity. | Owner · monthly; inspect cost and scope drift. |
| Diagnostic · Contract renewal | Eligible contract terms renewed by expiry plus grace ÷ expiries with matured grace window × 100. | N: contract and renewal lifecycle. | Account lead · monthly; review service outcomes. |
| Diagnostic · Change lead time / deployment frequency — optional | Median commit-to-production elapsed time; count production deployments per defined period, per service. | I: version control and deployment events. | Engineering lead · weekly; reduce batch friction. |
| Diagnostic · Failed deployment recovery time — optional | Median elapsed time from failed production deployment to restored service for deployment-caused incidents. | I: linked deployment/incident/recovery events. | Engineering lead · weekly; improve recovery paths. |
| Diagnostic · Change fail / deployment rework rate — optional | Deployments requiring immediate intervention ÷ all deployments; separately incident-driven unplanned deployments ÷ all deployments × 100. | I: classified deployment and incident links. | Engineering lead · weekly; review instability alongside throughput. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Projects

The canonical queue lives in **Projects → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Discovery inputs | Approved requirements checklist remains incomplete after configured delay. | Stop on verified input, reply, declined proposal or superseding scope. |
| Acceptance review | A specific deliverable version awaits authorized customer acceptance. | Stop on acceptance, defects requiring new work, revision or hold; silence is not acceptance. |
| Support/renewal | Recorded support SLA or contract expiry approaches with a responsible owner. | Stop on verified resolution/renewal or revised contract; escalation internal by default. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect reproducible support details without secrets, answer knowledge-backed questions, provide verified incident/release status and coordinate customer validation and renewal communication.

**Hasib:** Deduplicate/link tickets and incidents, apply SLA clocks, route technical tasks, run only authorized bounded runbooks, track releases and customer acceptance, calculate operational delivery/support metrics.

**Minimum human involvement:** Engineers solve novel defects and review changes where release policy requires; enter technical findings missing from tools. Routine ticket intake, routing, status updates and reminder/reporting work should be automatic.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. A customer message saying 'looks fine' does not deploy software or close formal acceptance without the authorized transition.
2. An incident unconnected to a deployment does not enter failed-deployment recovery measurement.
3. A hotfix can be both a deployment and rework; it is counted once in each defined denominator, with service boundaries preserved.
4. Verify all six primary destinations, the sector Work label, Projects → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **service catalog and SLAs; support severity definitions; customer environments/access; release authority and change windows; rollback/runbook rules; subscription terms and permitted renewals.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Customer → issue/request and environment metadata; ticket/monitoring/version control/CI → incidents, changes and deployment evidence; engineer → root-cause or fix verification where not machine-captured; billing → contract/payment.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect reproducible support details without secrets, answer knowledge-backed questions, provide verified incident/release status and coordinate customer validation and renewal communication.

**Hasib's work:** Deduplicate/link tickets and incidents, apply SLA clocks, route technical tasks, run only authorized bounded runbooks, track releases and customer acceptance, calculate operational delivery/support metrics.

**Human work only where needed:** Engineers solve novel defects and review changes where release policy requires; enter technical findings missing from tools. Routine ticket intake, routing, status updates and reminder/reporting work should be automatic.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

request → triaged → assigned → in_progress → validation → resolved → closed; incident and change/release lifecycles linked separately. Fix merged, deployed, healthy and customer-confirmed are different events.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Technology is pending; ticket/monitoring/CI connectors and deployment authority are not established by this dashboard. Specification edits do not authorize production changes or credentials access.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| request_received | Verified customer and issue context | Create/deduplicate ticket and apply contract SLA | Acknowledge with reference and ask missing reproduction facts | EV; MISSING_INPUT | Never ask for passwords/tokens in chat |
| incident_detected | Authorized monitoring signal and correlation | Link affected tickets and run allowed diagnostic checks | Send verified impact notice to affected permitted recipients | EV; SLA | No root cause claim without evidence |
| triaged | Validated severity and product/environment | Route by skill/on-call policy and set deadline | Explain recorded priority and next checkpoint | CHECKPOINT | Customer urgency alone cannot rewrite contract severity silently |
| work_progress | Engineer/tool supplies meaningful milestone | Update dependencies and SLA risks | Send useful factual progress only | EV on material change; NO_PROGRESS internal | Elapsed time does not imply progress |
| change_ready | Validated change with required checks/authority | Track release window and authorized deployment workflow | Communicate customer-facing change if applicable | REVIEW only if required; PRE_EVENT | No automatic production deployment outside configured authority |
| deployed | CI/deployment system confirms version/environment | Link monitoring and validation task | State deployed/validating rather than prematurely resolved | EV; CHECKPOINT | Failed health checks invoke only approved rollback runbook |
| resolved | Verified recovery/fix and defined acceptance condition | Stop incident clock and schedule closure policy | Request only needed customer confirmation | REVIEW; FEEDBACK | Silence closure policy cannot fabricate customer satisfaction |
| renewal_due | Current contract and usage/billing facts | Compute authorized renewal and entitlement changes | Send verified renewal details | RENEWAL; BALANCE | Dispute/security hold suppresses unrelated commercial sequences |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Projects and support | Link project milestones, acceptance criteria, tickets, incidents and contracts without merging their different SLA/acceptance clocks. |
| Engineering metrics | Use source-controlled change, deployment, incident and recovery events for engineering metrics. A task moved to Done is not proof of a production deployment or recovery. |
| Release and access | Store environment, version, required checks, approval authority and rollback policy. Credentials belong in managed secrets; customer text cannot authorize new privileges. |
| Subscriptions and acceptance | Track support entitlement, renewal, service credits and client acceptance versions; communicate verified progress and suppress obsolete issue reminders after confirmed recovery. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Projects retains conversation context |
| Projects | Default **Delivery and support list** with **Project/service, milestone or support issue, due/SLA, client blocker, owner**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New project** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Service/application; contract type; ticket priority; deployment-caused incidents**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Projects · Support · Milestones · Follow-ups. Keep quick filters **Requirements missing · Awaiting acceptance · SLA risk · Renewal due**. The record workspace includes **Approved scope; versioned acceptance; support history; contract/cost**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

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

1. A merge event cannot mark a customer incident resolved before deployment/recovery evidence.
2. Duplicate monitoring alerts become one incident with linked tickets.
3. An agent without release authority cannot deploy even if a customer asks in chat.
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
| Acquisition routes to test | Problem-specific technical content, verifiable case studies, integration partners and permitted account-based outreach |
| Offer / next-step promise | A relevant demo, discovery or scoped technical assessment under published terms |
| Fit and readiness | Business problem, environment/integration requirements, budget band, authority/timeline and implementation capacity |
| Verified conversion path | Attended relevant demo/discovery → accepted contract → activated service |
| Layla + Hasib automatic journey | Collect technical requirements without secrets, route the right specialist, show matched proof and maintain proposal/acceptance tasks |
| Repeat / referral loop | Contract renewals, usage-backed expansion where connected and customer referrals |
| Acquisition KPI focus | Cost per accepted/activated account; demo-to-contract; contribution-based payback; retained accounts at W |
| Evidence mapping | [L03](lead-generation-evidence.md#l03) |

**Sector limits:** Professional-services evidence is a proxy, not product-led SaaS proof; a demo booking is not activation.

**First proposed experiment:** Compare generic demo signup with use-case-matched proof and relevant technical intake; judge accepted and activated accounts. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Projects links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
