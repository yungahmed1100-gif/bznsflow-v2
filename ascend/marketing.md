# Marketing & agencies — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/marketing.md). Read this product specification alongside that build file.

التسويق والوكالات · Sector ID: `marketing` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Pending**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Deliver profitable retained client work on schedule, with timely approvals and credible client outcome reporting.

Catalyst communication, broadcasts and customer data exist, but agency projects, retainers, approval versions, time budgets and advertising attribution are new work. Broadcast delivery reporting is not a full advertising analytics integration.

## Industry evidence and recommended practice

SPI's 2025 professional-services summary covers multiple service segments, including agencies. It supports considering delivery and economics together, but does not provide a verified Oman marketing-agency threshold. The dashboard recommendations below separate agency operations from optional client campaign outcomes. Sources: [SPI 2025 Professional Services Maturity Benchmark announcement](https://spiresearch.com/the-18th-annual-professional-services-maturity-benchmark-report-is-out-now/). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Client work · Customers · Broadcasts · Insights · Settings**.

**Client work / أعمال العملاء** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Client work, retaining the conversation return context. |
| Client work | Deliverable approval board. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New client brief**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Client work; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Client work: daily execution

**Secondary views:** Board · Calendar · Retainers · Follow-ups. These remain within the single `work` destination. Default: **Deliverable approval board**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Client/deliverable, current version, due date, approval age, account owner. **Quick filters:** Assets missing · Ready for review · Approval overdue · Renewal due. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Approved scope; deliverable versions; change requests; retainer and cost. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **On-time accepted deliverables · Client approval backlog · Engagement contribution · Retainer renewal**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Engagement type; client cohort; deliverable type; connected campaign source. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Client work and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

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

**Workflow:** Brief → proposal → accepted retainer/project → plan → production → client approval → authorized publication/handoff → result review → renewal.

**Required record fields:** Client/engagement; approved scope and retainer period; deliverable/version; committed dates; approval request/decision; planned/actual hours and direct cost; change requests; renewal; optional connected ad spend, CRM conversions and attribution settings.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · On-time accepted deliverables | Deliverables accepted by committed due date ÷ deliverables due in period × 100; internal ready date separate. | N: versioned commitments and acceptance. | Account director · weekly; clear approval or production blockers. |
| **Headline** · Client approval backlog | Count current deliverable versions awaiting approval past agreed deadline; show age. | N: approval lifecycle. | Account lead · daily; request consolidated decisions. |
| **Headline** · Engagement contribution | Net recognized engagement revenue minus attributable labor, contractors and direct tools/media-production cost. | N/I: matched revenue and cost allocation; client media pass-through treated consistently. | Owner · monthly; identify scope or pricing problems. |
| **Headline** · Retainer renewal | Eligible retainer terms renewed within defined grace ÷ term expiries with matured grace window × 100. | N: term and renewal history. | Account director · monthly; review losses by cause. |
| Diagnostic · Scope overrun | Actual delivery hours beyond approved budget ÷ approved hours × 100; show zero-budget work separately. | N/I: budget versions and time capture. | Project lead · weekly; approve change requests before more work. |
| Diagnostic · Proposal conversion | Proposals accepted within W ÷ issued proposals with matured W-day window × 100. | N: proposal version groups and decisions. | Sales lead · monthly; improve qualification and offer clarity. |
| Diagnostic · Qualified client leads — optional | Distinct leads meeting the client's written qualification definition and verified in its CRM; show capture/source coverage. | I: client CRM plus agreed definition and deduplication. | Client strategist · weekly; improve lead quality, not just lead volume. |
| Diagnostic · Attributed ROAS / CAC — optional | ROAS = attributed net sales ÷ ad spend; paid CAC = defined paid acquisition cost ÷ verified acquired customers; same window/model. | I: connected ads, CRM, refunds, attribution and conversion lag. | Client strategist · monthly; label attribution, not causal lift. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Client work

The canonical queue lives in **Client work → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Proposal response | Staff-approved proposal remains unanswered after configured delay. | Stop on reply, acceptance, rejection, expiry or changed proposal. |
| Assets/approval | An agreed client input or current-version approval is missing before production deadline. | Stop on verified input/decision or superseding version; ask one consolidated request. |
| Retainer review | Term approaches renewal with an account owner and verified service history. | Stop on renewal, cancellation or reply; pricing and renewal terms need approval. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Gather briefs/assets, coordinate client decisions, send factual campaign/project updates and explain verified reports using defined attribution language.

**Hasib:** Version scopes/budgets, create delivery tasks, check assets and approvals, schedule authorized launches, reconcile spend/results and produce source-linked reporting and renewal obligations.

**Minimum human involvement:** Create or professionally approve novel claims/strategy where policy requires; approve material budget/scope changes outside standing authority; enter offline outcomes unavailable through CRM. Routine reporting, scheduling and client chasing are automated.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Client approval of an older asset version cannot authorize publication of a newer version.
2. Ad-platform and CRM copies of the same conversion do not count as two customers.
3. Client media pass-through is not mistaken for agency service margin; unattributed sales are not silently assigned to Layla.
4. Verify all six primary destinations, the sector Work label, Client work → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **service packages and deliverables; approved brand/claims; client budget and platform authority; audience consent; creative approval boundaries; experiment guardrails; attribution model and reporting windows.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Client → brief/goals and approved assets; ad/social/analytics platforms → spend, delivery and results; project system → actual production status; client → versioned approvals; billing → retainer/payment.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Gather briefs/assets, coordinate client decisions, send factual campaign/project updates and explain verified reports using defined attribution language.

**Hasib's work:** Version scopes/budgets, create delivery tasks, check assets and approvals, schedule authorized launches, reconcile spend/results and produce source-linked reporting and renewal obligations.

**Human work only where needed:** Create or professionally approve novel claims/strategy where policy requires; approve material budget/scope changes outside standing authority; enter offline outcomes unavailable through CRM. Routine reporting, scheduling and client chasing are automated.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

brief → scoped → assets_pending → production → review → approved → scheduled/live → measured → closed/renewed; campaign status and client-project status remain separate. Published creative must reference its accepted version.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Marketing is pending; campaign connectors, creative approval and attributed outcome adapters must be added. Existing channel/broadcast capability is not an automatic ad-buying system.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| brief_accepted | Complete goals, scope and authority | Create deliverable plan and authorized quote | Confirm scope and request missing inputs | MISSING_INPUT; QUOTE | No invented performance guarantee |
| assets_due | Plan-specific missing approved asset | Track source/version and rights confirmation | Request only missing approved material | REVIEW | Received or replaced asset cancels old request |
| creative_review | Current draft passes configured checks | Open versioned client/professional decision if required | Send secure review link and exact choices | REVIEW | Standing preapproved variants need no repeated staff approval |
| approved_scheduled | Accepted version and authorized budget/channel | Validate platform readiness and schedule idempotent publish | Confirm scheduled time | EV; CHECKPOINT | Revised content invalidates former approval |
| live | Platform confirms actual publication/delivery | Start measurement window and monitor approved guardrails | Report actual live status | EV | Scheduled is not published |
| performance_checkpoint | Fresh platform and CRM data with coverage | Calculate agreed KPIs; apply only authorized bounded adjustments | Summarize observed results and limitations | CHECKPOINT internal; scheduled client report | Missing attribution cannot become claimed causal lift |
| budget_exception | Actual spend/error exceeds configured bound | Pause affected authorized action where policy allows and open exception | Explain verified impact and decision needed | SLA | No autonomous expansion of budget or unsupported claims |
| period_closed | Matured reporting window and accepted deliverables | Reconcile costs/outcomes and next-period obligations | Send sourced report and renewal options | RENEWAL; BALANCE | Open dispute pauses commercial chasing |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Deliverables and retainers | Track accepted monthly scope, quantity, version, due date, included revisions and overage authority. Client acceptance is not the same as a platform publication event. |
| Campaign operation | Specify platform/account, budget/currency, schedule, audience authorization and approved creative versions. Bounded automatic optimization requires an explicit configured rule and rollback condition. |
| Attribution and offline outcomes | Declare click/view/conversion windows, source IDs and deduplication across CRM/platforms. Missing offline sale evidence is unknown, not automatically attributed revenue. |
| Rights and claims | Capture approved claims, brand rules, asset rights and client decisions. New unsupported promises or budget expansion become exceptions; reuse of preapproved variants stays automatic. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Client work retains conversation context |
| Client work | Default **Deliverable approval board** with **Client/deliverable, current version, due date, approval age, account owner**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New client brief** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Engagement type; client cohort; deliverable type; connected campaign source**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Board · Calendar · Retainers · Follow-ups. Keep quick filters **Assets missing · Ready for review · Approval overdue · Renewal due**. The record workspace includes **Approved scope; deliverable versions; change requests; retainer and cost**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Client work, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Replacing approved creative prevents the old version from publishing.
2. Duplicate platform events do not double-count spend or conversions.
3. A disconnected analytics source marks the report incomplete instead of claiming zero results.
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
| Acquisition routes to test | Niche proof/case studies, educational content, partner referrals and permitted target-account outreach |
| Offer / next-step promise | A scoped discovery or assessment of a stated marketing problem; no invented free deliverable |
| Fit and readiness | Business fit, actual need, current channels, budget band, decision process, timeline and delivery capacity |
| Verified conversion path | Attended discovery → accepted paid project/retainer |
| Layla + Hasib automatic journey | Research permitted company facts, personalize approved proof, schedule discovery, assemble scoped proposals and chase versioned decisions |
| Repeat / referral loop | Retainer renewal, expansion from demonstrated needs and client referrals |
| Acquisition KPI focus | Cost per qualified opportunity; attended-discovery-to-paid; retained gross contribution; sales cycle |
| Evidence mapping | [L03](lead-generation-evidence.md#l03) |

**Sector limits:** Do not promise attributable revenue from impressions or self-reported platform ROAS.

**First proposed experiment:** Compare broad agency positioning with one niche/problem and verified relevant case; judge paid projects/retainers after attended discovery. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Client work links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
