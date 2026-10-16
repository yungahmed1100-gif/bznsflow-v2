# Finance & accounting — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/finance.md). Read this product specification alongside that build file.

المالية والمحاسبة · Sector ID: `finance` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Pending**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Complete client engagements on time by removing document blockers and making review, scope and billing visible.

Communications, contacts and basic tasks are reusable. Engagement templates, period-close workflow, secure document-status integration, review sign-off and time/billing import require new work. Ascend is not an accounting ledger or filing authority.

## Industry evidence and recommended practice

AICPA's 2025 MAP survey compares firms by size, region and top-performer groups. Detailed member tables were not accessed. Proposed practice is to compare similar engagement types and expose document readiness, review quality and scope economics before adopting external targets. Sources: [AICPA national MAP survey](https://www.aicpa-cima.com/professional-insights/article/national-map-survey). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Engagements · Customers · Broadcasts · Insights · Settings**.

**Engagements / الارتباطات** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Engagements, retaining the conversation return context. |
| Engagements | Period-work board. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New engagement**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Engagements; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Engagements: daily execution

**Secondary views:** Board · Period calendar · Documents · Follow-ups. These remain within the single `work` destination. Default: **Period-work board**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Client/period, work stage, readiness, review owner, approved due date. **Quick filters:** Documents missing · Ready to prepare · Review due · Delivery overdue. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Scope/period; checklist statuses; preparation/review history; WIP/billing. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **On-time engagement delivery · Document readiness · Work awaiting review · Engagement contribution**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Service type; reporting period; client cohort; internal vs client delay. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Engagements and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **booking**; registry status: **pending**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `appointments`, `plans` |
| Planned | `demand`, `digest` |
| Off for this pack | `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `supplies` (Supplies); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Qualified inquiry → engagement approved → recurring period opened → documents verified → prepared → reviewed → staff-authorized delivery/filing → invoice/close.

**Required record fields:** Engagement/service/period ID; approved scope and fee; staff-set deadlines and source; document checklist statuses; ready/prepared/reviewed/delivered timestamps; review-return reason; change approvals; time/cost/invoice references; secure external document links.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · On-time engagement delivery | Accepted deliverables completed by staff-approved due date ÷ deliverables due in period × 100. | N: workflow and deadline version history. | Engagement lead · weekly; remove blockers early. |
| **Headline** · Document readiness | Required items verified complete ÷ required items due for current engagement checkpoint × 100; critical missing items separate. | N/I: checklist and verified receipt statuses. | Client coordinator · daily; request specific missing items. |
| **Headline** · Work awaiting review | Count prepared engagements not reviewed; show age against review SLA. | N: prepared/review events and owner. | Review lead · daily; balance reviewer load. |
| **Headline** · Engagement contribution | Net engagement fee minus attributable staff, subcontract and direct tooling costs; scope and period matched. | N/I: costed work and contract allocation. | Owner · monthly; adjust scope or price. |
| Diagnostic · Ready-to-delivery cycle | Median/p90 time from complete inputs verified to staff-approved delivery; total client elapsed time also shown. | N: readiness and delivery timestamps. | Operations lead · monthly; distinguish internal delay from client waiting. |
| Diagnostic · First-pass review acceptance | Deliverables accepted on first formal review ÷ first reviews completed × 100. | N: versioned review outcomes and return reason. | Review lead · monthly; improve preparation quality. |
| Diagnostic · Unbilled approved work | Sum approved billable work value not allocated to an invoice; show age and contractual billing eligibility. | I: work-in-progress and billing integration. | Finance lead · weekly; remove billing blockers. |
| Diagnostic · Overdue receivables | Sum positive issued-invoice balances beyond approved due dates, with disputed totals separate. | N/I: invoice, credit and payment allocation. | Finance lead · weekly; reconcile and follow up. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Engagements

The canonical queue lives in **Engagements → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Missing period documents | A staff-approved checklist item remains unverified before preparation cutoff. | Stop on verified receipt, waived requirement or reply; avoid repeatedly requesting already submitted files. |
| Review due | Prepared work reaches the assigned review deadline. | Internal reminder only; stop on sign-off or reassignment. |
| Engagement renewal/payment | Approved term expiry or invoice due date reaches configured horizon. | Stop on renewal, verified payment, dispute, credit or cancellation; no unapproved fee changes. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect administrative requirements, request missing source documents, explain recorded engagement progress and send approved deadline/billing communications without unsupported financial advice.

**Hasib:** Create engagement and period records, import/deduplicate transactions, run deterministic reconciliation checks, track deliverables/deadlines, maintain review evidence and calculate operational KPIs.

**Minimum human involvement:** Qualified professionals resolve accounting judgments, certify/sign submissions and make regulated or consequential advice decisions. Staff enter only unavailable source facts; routine ingestion, document chasing, arithmetic and status communication are automated.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. A client upload marked received is not complete until its required checklist validation succeeds.
2. A period cloned for next month gets independent deadlines and task IDs; rerunning the job creates no duplicate period.
3. A preparation completion does not mark a return filed or a statement professionally approved.
4. Verify all six primary destinations, the sector Work label, Engagements → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **service catalog and engagement limits; client verification/access; document and reconciliation rules; filing authority; approved deadline sources; fee/billing policy; separation of preparer, reviewer and client authorization where required.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Client → engagement scope and secure supporting records; accounting/bank connectors → transactions and balances; authorized professional → reconciliation exceptions, advice and filing acceptance; billing → engagement payment.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect administrative requirements, request missing source documents, explain recorded engagement progress and send approved deadline/billing communications without unsupported financial advice.

**Hasib's work:** Create engagement and period records, import/deduplicate transactions, run deterministic reconciliation checks, track deliverables/deadlines, maintain review evidence and calculate operational KPIs.

**Human work only where needed:** Qualified professionals resolve accounting judgments, certify/sign submissions and make regulated or consequential advice decisions. Staff enter only unavailable source facts; routine ingestion, document chasing, arithmetic and status communication are automated.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

intake → engagement_accepted → records_pending → processing → review → client_authorized → submitted/delivered → closed; reconciliation, filing acknowledgment and payment have distinct states. Administrative completeness is not professional certification.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Finance is pending; secure accounting/bank imports, period locking, reviewer gates and authoritative filing status need implementation. No automatic money transfer or investment authority is granted.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| engagement_request | Verified client and service/period | Match scope and generate authorized fee proposal | Ask missing administrative details | MISSING_INPUT; QUOTE | Unsupported services require professional scope decision |
| engagement_active | Accepted terms and required verification | Create period checklist and deadlines from approved source | Send onboarding checklist | EV | No assumed filing deadline from unverified model memory |
| records_missing | Checklist compared with received source records | Track exact missing documents and duplicates | Request only outstanding items securely | REVIEW | New receipt cancels the corresponding request |
| reconciliation_exception | Deterministic mismatch with source references | Group discrepancy and seek missing fact or professional decision | Ask factual clarification where client can resolve it | CHECKPOINT | Do not fabricate a balancing entry |
| review_ready | Required processing and validation complete | Route only professional review/certification steps | Explain factual progress if requested | SLA internal | Automated checks cannot impersonate reviewer approval |
| client_authorization | Current completed deliverable needs client consent | Track exact version/signature and allowed next step | Request version-specific authorization | REVIEW | Revision invalidates obsolete authorization |
| submitted_delivered | Authorized submission and system receipt | Record acknowledgment and monitor unresolved acceptance | Send actual receipt/status | EV; CHECKPOINT | Submitted is not accepted or funds settled |
| closed_billed | Approved deliverable and invoice state | Close obligations, lock appropriate period and reconcile balance | Send verified invoice and optional service feedback | BALANCE; FEEDBACK | Dispute or correction opens linked lifecycle without rewriting history |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Periods and records | Store entity, service, reporting period, document source/version, reconciliation status and completeness. Lock/correct periods through explicit audited operations. |
| Preparation and review | Professional review/filing authority remains explicit; routine source checks and numerical calculations are deterministic. Missing evidence becomes a precise question, not invented accounting treatment. |
| Submission and advice | Separate delivered report, client authorization, filed submission, authority acknowledgment and resulting obligation. Only recorded professional advice may be relayed as such. |
| Billing and confidentiality | Keep client accounting data separate from the firm's fees/receivables and restrict cross-client searches/exports. Never initiate money transfers or investments from a dashboard status change. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Engagements retains conversation context |
| Engagements | Default **Period-work board** with **Client/period, work stage, readiness, review owner, approved due date**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New engagement** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Service type; reporting period; client cohort; internal vs client delay**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Board · Period calendar · Documents · Follow-ups. Keep quick filters **Documents missing · Ready to prepare · Review due · Delivery overdue**. The record workspace includes **Scope/period; checklist statuses; preparation/review history; WIP/billing**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Engagements, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Duplicate bank imports create no duplicate transactions or reminders.
2. An unresolved reconciliation gap cannot be hidden by a generated journal entry.
3. Filing submission and authority acknowledgment remain separate outcomes; revision requires current authorization.
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
| Acquisition routes to test | Niche educational content, business/professional referrals, partner networks and service-specific search |
| Offer / next-step promise | A scoped business/accounting consultation or accepted standard package |
| Fit and readiness | Business/service type, period/deadline, scope, jurisdiction and permitted capacity; initial intake avoids financial distress details |
| Verified conversion path | Attended consultation → accepted engagement → first completed billed service |
| Layla + Hasib automatic journey | Route the correct professional, collect secure administrative requirements, issue allowed standard fees and follow current engagement decision |
| Repeat / referral loop | Recurring engagement renewal, permitted related-service needs and professional referrals |
| Acquisition KPI focus | Cost per retained engagement; consultation-to-accepted; first-service completion; mature contribution/payback |
| Evidence mapping | [L03](lead-generation-evidence.md#l03); [P03](lead-generation-evidence.md#p03) |

**Sector limits:** Do not upload sensitive financial circumstances to ad systems or infer creditworthiness/investment suitability.

**First proposed experiment:** Compare generic firm content with one actual client-segment/service problem and scoped consultation; judge accepted engagements and completed first service. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Engagements links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
