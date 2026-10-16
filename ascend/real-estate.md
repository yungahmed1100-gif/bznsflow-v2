# Real estate — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/real-estate.md). Read this product specification alongside that build file.

العقارات · Sector ID: `real-estate` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Turn qualified inquiries into attended viewings and completed deals while keeping property availability and commission balances trustworthy.

Dedicated properties, opportunities, viewings, approved messaging and commission records exist. Current owner measures include inquiries waiting, viewings due and commission owed. Funnel cohorts, stage history and stale-listing controls need explicit implementation.

## Industry evidence and recommended practice

RICS supplies professional operating principles, not a verified top-quartile conversion target. The workflow below is a product recommendation: confirm requirements and availability, assign one agent, record viewing outcomes and document commitments. Sources: [RICS property agency and management principles](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/real-estate-standards/property-agency-and-management). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Deals · Customers · Broadcasts · Insights · Settings**.

**Deals / الصفقات** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Deals, retaining the conversation return context. |
| Deals | Pipeline board. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New inquiry**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Deals; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Deals: daily execution

**Secondary views:** Board · Viewings · Properties · Follow-ups. These remain within the single `work` destination. Default: **Pipeline board**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Requirement, property, stage, agent, next viewing, next action. **Quick filters:** My deals · Unassigned · Awaiting response · Viewing due. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Requirements and matches; viewing/offer history; commission and approvals. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **Qualified-to-viewing conversion · Viewing attendance · Unanswered qualified inquiries · Commission overdue**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Rental vs sale; property type; lead source; assigned agent. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Deals and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **project**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights` |
| Planned | `demand`, `digest` |
| Off for this pack | `appointments`, `plans`, `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** None configured.

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| None | No extra order field declared for this pack | — | Standard/domain fields still apply |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `commission` (Agent commission); `portal_fees` (Listing portal fees); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Deals / الصفقات**, stock **Properties / العقارات**, workflow key **`property`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Inquiry → requirements confirmed → verified property match → viewing scheduled → viewing attended → offer → closed / lost.

**Required record fields:** Opportunity ID; verified customer requirements; listing ID and availabilityCheckedAt; agent; qualificationAt; viewing start/status; offer decision; close date; agreed commission; invoice/payment IDs; loss reason.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · Qualified-to-viewing conversion | Qualified opportunities with an attended viewing within W ÷ qualified opportunities whose W-day window has matured × 100. | N: qualification and attended events; configurable W. | Sales lead · weekly; inspect unmatched requirements and slow assignment. |
| **Headline** · Viewing attendance | Attended viewings ÷ eligible scheduled viewings due in the period × 100; timely cancellations excluded and shown separately. | D/N: existing viewings plus reliable attendance outcome. | Agent manager · daily; recover missed visits and verify directions. |
| **Headline** · Unanswered qualified inquiries | Count open qualified opportunities with no meaningful response after the configured business-hours SLA. | N: qualification, response timestamps, office calendar. | Team lead · daily; assign the oldest eligible inquiry. |
| **Headline** · Commission overdue | Sum positive unpaid approved commission invoice balances past their recorded due date. | D/N: commission records plus explicit due dates and reconciled payments. | Owner · daily; open the debtors list and resolve disputed items. |
| Diagnostic · Qualified-to-close conversion | Qualified opportunities closed-won within W ÷ matured qualified cohort × 100; W differs for rental and sale. | N: durable stage history and distinct opportunity IDs. | Owner · monthly; review losses by property type and source. |
| Diagnostic · Time to viewing | Median and p90 elapsed time from qualification to first attended viewing; show open-cohort age separately. | N: timestamped qualification and attendance. | Sales lead · weekly; remove scheduling delays. |
| Diagnostic · Listing freshness | Active listings checked within configured freshness interval ÷ active listings × 100. | N: verified availability snapshots. | Listing owner · daily; remove stale listings from recommendations. |
| Diagnostic · Offer decision backlog | Count open offers beyond the recorded decision due time; show age and value, without treating offers as revenue. | D/N: versioned offers and decision deadlines. | Agent manager · daily; obtain an owner decision. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Deals

The canonical queue lives in **Deals → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Missing requirements | New inquiry lacks required budget, area or move date; create task after configured business-hours delay. | Stop on completed requirements, reply, disqualification or closure; agent owns clarification. |
| Viewing confirmation | Confirmed viewing reaches the configured reminder offset; offer approved appointment details. | Rescheduling invalidates old job; cancel on cancelled viewing; no dispatch after start. |
| Post-viewing decision | Attendance is recorded and feedback remains absent after chosen delay. | Stop on feedback, offer, closure or reply; never state availability without a fresh check. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Collect requirements, propose verified matches, coordinate viewing times, request feedback and answer factual status questions using current listing and deal evidence.

**Hasib:** Create/merge opportunities under verified identities, rank only objective requirement matches, reserve viewing resources, assign agents, track offer versions and commission obligations, and update cohort metrics.

**Minimum human involvement:** Enter availability or viewing attendance where no feed exists; conduct viewings and negotiations outside standing authority; verify transaction close and disputed commissions. Customer housing eligibility or selection is not delegated to an automated score.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Two inquiries from one customer for separate properties remain separate opportunities; a duplicated viewing event does not double the funnel.
2. A property marked unavailable cancels stale matching tasks and blocks new availability claims.
3. A sale marked closed without an approved commission invoice does not create commission receivable.
4. Verify all six primary destinations, the sector Work label, Deals → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **qualification fields; listing freshness; permitted factual property claims; matching rules; viewing calendars; agent routing; approved offer forms; commission terms; negotiations allowed only within explicit limits.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Requirements/budget/move date → customer conversation; listing identity/availability → listing owner or authoritative feed; viewing slots → calendar; attendance/offer decision/close evidence → agent or transaction system; commission payments → finance feed.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Collect requirements, propose verified matches, coordinate viewing times, request feedback and answer factual status questions using current listing and deal evidence.

**Hasib's work:** Create/merge opportunities under verified identities, rank only objective requirement matches, reserve viewing resources, assign agents, track offer versions and commission obligations, and update cohort metrics.

**Human work only where needed:** Enter availability or viewing attendance where no feed exists; conduct viewings and negotiations outside standing authority; verify transaction close and disputed commissions. Customer housing eligibility or selection is not delegated to an automated score.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

new → qualified → matching → viewing_booked → viewed → offer_pending → agreed → closed; lost/on_hold/cancelled retain reasons. Multiple viewings/offers are child records rather than overwritten opportunity fields.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Dedicated property/viewing/opportunity and approved-message foundations exist. Shared automatic lifecycle enrollment, listing feed reconciliation, durable reminder cancellation and live status answer integration still require implementation evidence.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| inquiry | New inquiry and verified contact channel | Create opportunity and deduplicate repeated inbound events | Ask missing budget/area/timing fields | MISSING_INPUT | A second real property need is not merged into an unrelated opportunity |
| requirements_complete | Customer confirms requirements and permissions | Match only fresh active listings using objective constraints; assign agent | Send relevant verified matches | EV; QUOTE cadence for a configured permitted unanswered property offer | No stale availability or invented amenities |
| viewing_selected | Customer chooses a valid available slot | Reserve agent/property slot atomically | Confirm viewing and directions | EV plus PRE_EVENT | Conflict causes alternative slots, not double booking |
| viewing_rescheduled | Authorized new slot replaces old booking | Cancel old jobs and reserve replacement | Send revised confirmation | EV plus regenerated PRE_EVENT | Old reminders must not dispatch |
| viewing_attended | Agent/check-in captures actual attendance | Record outcome and open feedback task | Request viewing feedback once | FEEDBACK | No attendance inference from scheduled end |
| offer_submitted | Authorized party submits complete current offer | Record offer/version/expiry and route under negotiation policy | Deliver offer acknowledgment and request counterpart decision | REVIEW | Binding concessions outside authority go to agent |
| deal_closed | Verified close evidence | Record close, calculate agreed commission and invoice obligation where authorized | Confirm administrative completion | EV plus BALANCE | Agreed is not closed; unpaid commission is not collected |
| listing_changed | Authoritative availability/price change | Invalidate affected matches/offers and scheduled claims | Notify impacted interested customers when eligible | EV once per material revision | Cancel obsolete matching reminders; no broad unauthorized blast |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Listings and matching | Store listing ID, authority/availability, price/currency, type, location, requirements and freshness. Match only verified available inventory; stale listings create a refresh task before an availability promise. |
| Viewings and ownership | Use agent/resource capacity, location/travel buffer, offer expiry and attendance evidence. Reassign automatically by configured workload/area; preserve one accountable exception owner and do not score housing eligibility using sensitive traits. |
| Offers, lease/sale and commission | Version offers and customer decisions; distinguish accepted offer, signed agreement, closing and paid commission. Track contract-defined installments, lease expiry and renewal; no automatic legal acceptance or fund transfer from a chat. |
| Maintenance and relationships | For managed property services, link tenant, owner and property permissions; create repair obligations from accepted requests and source contractor status. Owner statements and tenant messages must not expose each other's restricted information. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Deals retains conversation context |
| Deals | Default **Pipeline board** with **Requirement, property, stage, agent, next viewing, next action**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New inquiry** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Rental vs sale; property type; lead source; assigned agent**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Board · Viewings · Properties · Follow-ups. Keep quick filters **My deals · Unassigned · Awaiting response · Viewing due**. The record workspace includes **Requirements and matches; viewing/offer history; commission and approvals**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Deals, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Complete requirements → fresh matches → selected viewing → confirmation/reminder occurs without staff re-entering the inquiry.
2. A withdrawn listing invalidates queued availability claims before dispatch.
3. Duplicate attendance/close events update one opportunity and one commission obligation.
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
| Acquisition routes to test | Property-specific search/portal inquiries, verified listing content, past-client and partner referrals |
| Offer / next-step promise | A shortlist of currently available properties or a viewing, matched to the stated requirement |
| Fit and readiness | Buy/rent/sell intent, area, property type, budget range, timeline and verified listing/resource availability; financing facts are customer-stated |
| Verified conversion path | Confirmed viewing → attended viewing → accepted transaction milestone |
| Layla + Hasib automatic journey | Match available listings, offer valid viewing slots, remind, collect viewing feedback, and request the next decision; new matching stock can restart permitted nurture |
| Repeat / referral loop | Consent-based property alerts, lease/relationship milestones and referral links after completed service |
| Acquisition KPI focus | Cost per attended viewing; matured inquiry-to-viewing and viewing-to-close rates; acquired-customer contribution; referral share |
| Evidence mapping | [L05](lead-generation-evidence.md#l05); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** No inferred wealth/protected-trait scoring, stale listing promises or assumption that a viewing is a sale.

**First proposed experiment:** Compare a property-specific verified shortlist CTA with the existing generic inquiry CTA; judge attended viewings and matured transactions, not messages. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Deals links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
