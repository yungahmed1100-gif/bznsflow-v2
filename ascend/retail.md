# Retail & e-commerce — Ascend dashboard specification

Agent implementation: [current-code build instructions, fields, sequence and tests](implementation/retail.md). Read this product specification alongside that build file.

التجزئة والتجارة الإلكترونية · Sector ID: `retail` · Prepared 2026-10-10

**Product draft, not a deployed feature inventory.** Existing Ascend pack registry: **Enabled**. The source registry's `live` flag is labeled “Enabled” here; it is not fresh production certification. All dashboard behavior below is proposed unless explicitly described as an existing foundation. Read the [shared measurement and follow-up contract](measurement-contract.md) and [automation-first operating contract](automation-contract.md) with this file.

## Business outcome and current foundation

Convert demand into fulfilled profitable orders without overselling or tying up cash in stale inventory.

Orders, variants, stock lots, expenses and product requests exist. Owner metrics include best variant, aged stock and unfilled requests. Cohort repeat purchase, audited stock movements and external web-cart attribution need explicit extensions.

## Industry evidence and recommended practice

Shopify's inventory guide supports measuring stock efficiency. The recommended dashboard combines stock age, fulfillment and margin, with clear stock denominators. No universal turnover or sell-through target is assumed across fashion, grocery and other retail. Sources: [Shopify inventory metrics](https://www.shopify.com/blog/inventory-metrics). Scope and access limitations are recorded in the [research register](research-sources.md).

The workflow, KPI selection and automation design below are BznsFlow recommendations informed by those references and the current code. They are not claims that every named practice caused top-quartile performance. Use a matched local baseline before setting targets.

## Six-tab dashboard

Primary navigation: **Chats · Orders · Customers · Broadcasts · Insights · Settings**.

**Orders / الطلبات** is this sector's label for the new **Work** destination. **Insights / المؤشرات** is the second new destination. Keep stable navigation keys `chats`, `work`, `customers`, `broadcasts`, `insights`, `settings`; translate labels without changing routes or record identity. Follow the [shared six-tab design](dashboard-design.md).

| Primary tab | Responsibility and sector experience |
| --- | --- |
| Chats | Conversation inbox with linked work, verified status and next follow-up. Open full operational editing in Orders, retaining the conversation return context. |
| Orders | Fulfillment list. Owns operational records, scheduling, approvals, exceptions and the shared Follow-ups queue. Primary action: **New order**. |
| Customers | Searchable directory, verified identities/contact preferences and customer history. Show linked work and this customer's follow-ups as contextual views of the same records. |
| Broadcasts | Audience selection, campaign drafts, authorized sending and delivery results. Link resulting inquiries to Chats; industry conversion outcomes remain in Insights. |
| Insights | Four headline KPI cards, trend/cohort comparisons, supporting diagnostics and source coverage. Drill into the exact filtered records in Orders; sensitive amounts remain permission-gated. |
| Settings | BznsBrain knowledge/reply behavior and follow-up rule configuration; channels, team/roles, working hours and approved catalog/resource definitions. |

### Orders: daily execution

**Secondary views:** Orders · Products & stock · Requests · Follow-ups. These remain within the single `work` destination. Default: **Fulfillment list**. Users can reach Follow-ups in one in-tab action; pending approvals and overdue items are visible before opening a record.

**Page hierarchy:** title + one primary action → compact Needs attention strip → secondary-view selector → filters → the main list, board or schedule. The strip links to actionable exceptions rather than repeating the Insights KPI dashboard. Secondary create/import actions belong in an action menu.

**Default record fields:** Order/customer, variants, reservation state, promise, balance, fulfillment. **Quick filters:** Unconfirmed · Picking · Ready · Overdue. Preserve filters and position when opening a record and returning. Let the user choose list view where a board or schedule is the default; small screens default to a readable list.

**Record workspace:** Line items; stock/lot allocations; delivery/pickup; returns and payments. Use an explicit saved record with Overview, Activity and Follow-ups sections as needed; full editing belongs here. On desktop a preview drawer provides quick context and an Open full record action. On mobile the same record opens as a full page. Destructive, financial and commitment-changing actions remain explicit and permission-checked.

### Insights: performance and diagnosis

**Default headline cards:** **On-time fulfillment · Stock held beyond age limit · Order gross margin · Unfilled product requests**. Put these on the Insights overview, with a two-by-two arrangement at medium widths and a single-column list on narrow screens. Supporting diagnostic rows below the overview have a dedicated table and drill-down, rather than being buried in Customers.

Use one selected metric trend or cohort chart plus the diagnostic table. **Useful sector breakdowns:** Category/variant; channel; new vs repeat customer; stock age. These are filters/groupings, not extra primary tabs. Only offer dimensions actually captured and authorized.

Every metric exposes its period or as-of time, unit, denominator, coverage and definition. A live backlog card uses “as of now”; historical comparison requires snapshots. A drill-down carries the exact metric population into Orders and provides **Back to Insights**, restoring the originating filters. No chart invents a trend from today's single count.

## Current configured field and module inventory

Source snapshot: [Hasib pack configuration](../config/hasib-packs.js), inspected 2026-10-10. Archetype: **catalog**; registry status: **live**. The module labels below describe source configuration, not end-to-end readiness or a permission to enable a preview/pending pack.

| Source module state | Module IDs |
| --- | --- |
| Available in configuration | `orders`, `stock`, `expenses`, `insights`, `demand` |
| Planned | `digest`, `plans` |
| Off for this pack | `appointments`, `recipes`, `batches`, `shelfLife`, `jobCards`, `enrolments`, `quotes`, `serials`, `repairs`, `tradeIns` |

**Configured variants:** `size` (Size / المقاس); `length` (Length / الطول); `colour` (Colour / اللون).

| Extra order field key | EN / AR label | Input type | Declared constraint |
| --- | --- | --- | --- |
| `made_to_measure` | Made to measure / تفصيل حسب المقاس | boolean | No additional limit declared in this pack configuration; domain validation still applies |
| `measurements` | Measurements / المقاسات | text | Maximum 300 characters |
| `fitting_date` | Fitting date / موعد القياس | date | No additional limit declared in this pack configuration; domain validation still applies |

**Configured expense categories:** `rent` (Rent); `salaries` (Salaries); `stock_purchase` (Stock purchases); `marketing` (Marketing); `utilities` (Utilities); `delivery` (Delivery and courier); `fees` (Bank and payment fees); `other` (Other). Preserve category IDs/history when extending cost capture; a configured expense category alone is not a reconciled cost ledger.

**Special configuration:** No additional special flags declared here; shared tenant/role and sector gates still apply.

The current source presentation uses work **Orders / الطلبات**, stock **Products / المنتجات**, workflow key **`orders`**. These are existing configuration values, not the six-tab target navigation defined above. Pending packs can inherit retail presentation defaults; replace that fallback with this sector's explicit adapter and labels before real use. Moving a capability into a Work record does not remove its supported operations. Retain configured fields, constraints, variants and historical IDs unless an explicit migration is designed.

## Operational model and required data

**Workflow:** Inquiry/product request → available variant confirmed → order → reservation/payment terms → picking or tailoring → ready → collected/delivered → return if applicable.

**Required record fields:** Variant/SKU; lot receipts and allocations; order lifecycle; due and ready/fulfilled times; stock reservation expiry; unit landed cost; discounts/refunds; tax; verified payment allocation; channel and customer identity.

Dates, amounts, commitments and outcomes must be confirmed domain facts. The proposed fields are requirements, not a claim that the current schema already has them. Preserve event history so changing today's state does not rewrite an earlier reporting period.

## KPI definitions

The first four rows are the default Insights cards. `D` = derive/reconcile from existing records, `N` = new capture or model, `I` = external integration/import required for that scope. Combined codes identify mixed dependencies. None of these codes means the new KPI is already implemented. `W` is an explicit business-configured observation window, fixed for each cohort; percentage formulas use matching units and populations.

| Priority / KPI | Calculation and scope | Data and readiness | Owner, review cadence and action |
| --- | --- | --- | --- |
| **Headline** · On-time fulfillment | Orders fulfilled by promise ÷ noncancelled orders due in period × 100. | D/N: fulfillment events and preserved promises. | Store lead · daily; open overdue orders. |
| **Headline** · Stock held beyond age limit | Sum remaining units received before configured age cutoff; show cost value only where landed cost is known. | D: existing lot-aging metric; receipt-date semantics verified. | Buyer · weekly; review aging variants. |
| **Headline** · Order gross margin | Net sales minus matched landed cost of sold goods, divided by net sales × 100; incomplete cost coverage is visible. | D/N: existing order profit plus return-aware cost allocation. | Owner · weekly; inspect mix and discounts. |
| **Headline** · Unfilled product requests | Count active waiting requests for unavailable variants/items. | D: existing product-request records. | Buyer · daily; restock high-value requests. |
| Diagnostic · Inventory turnover | Period cost of goods sold ÷ average daily inventory at cost; display period length and stock coverage. | N/I: reliable historical inventory snapshots. | Owner · monthly; adjust purchasing by category. |
| Diagnostic · Available-stock sell-through | Net units sold ÷ opening saleable units plus received units during period × 100; transfers/adjustments disclosed. | N: complete movement ledger; use one consistent SKU unit. | Buyer · weekly; review replenishment. |
| Diagnostic · Return rate | Units returned within W ÷ shipped units in a matured shipment cohort × 100. | D/N: linked returns and fixed observation window. | Store lead · monthly; inspect fit, quality or inaccurate descriptions. |
| Diagnostic · Repeat purchase | First-purchase customers with another completed purchase within W ÷ matured first-purchase customer cohort × 100. | N/I: verified identity and captured channel coverage. | Owner · monthly; evaluate retention without guessing anonymous customers. |

The named KPI owners review exceptions and policy; agents perform routine monitoring and follow-up actions at those cadences. No daily manual spreadsheet or queue creation is required by the target design.

The shared contract governs cancellations, returns, missing data, zero denominators, period boundaries, money, cohort maturity and access. Where a row narrows that definition, display its specific policy next to the KPI. Show current source metrics separately during reconciliation if their semantics differ.

## Follow-ups within Orders

The canonical queue lives in **Orders → Follow-ups**, with Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed filters. Chats and customer profiles show linked views of these same tasks; they do not create independent queues. A badge counts actionable tasks, never mixes them with unread messages.

**Target mode: automatic execution within configured standing policy.** Hasib creates and maintains eligible follow-ups; Layla handles the conversation and qualified updates. Routine reminders do not wait for staff approval. Draft/shadow mode is limited to onboarding, unproven rules or explicit policy; customer decisions and out-of-policy/professional exceptions remain visible separately. The event-level specification below defines proposed behavior, not a claim that the current manual queue already sends.

| Scenario | Recorded trigger and timing | Stops / exceptions |
| --- | --- | --- |
| Order completion | Customer started a recorded draft order but required size/address remains missing after configured delay. | Stop on reply, order confirmation, rejection or expiry; do not call this website cart abandonment without web events. |
| Ready for collection | Staff marks order ready and collection is outstanding. | Stop on collected, delivered, cancelled or refunded; cap reminders. |
| Back in stock | Waiting request matches newly available variant after reservations are accounted for. | Stop on decline, fulfilled request or unavailable stock; avoid promising unreserved units. |

The operational owner named in the KPI table is accountable for exceptions; Hasib runs routine reviews, creates tasks and monitors deadlines automatically. Rule setup must save the exact offset, timezone, recipient, assignee, maximum attempts and expiry. The cadence profiles below supply proposed defaults; business-specific deadlines and source validity take precedence. Use the [shared rule contract](measurement-contract.md#follow-up-contract) for deduplication, dispatch rechecks, messaging eligibility, receipts and outcomes.

## What can be automated

**Layla:** Match requirements to available catalog items, handle routine checkout and order questions, request missing address details, send verified fulfillment updates and explain eligible return options.

**Hasib:** Reserve exact variants, compute authorized totals, create/reconcile orders, manage fulfillment and return obligations, update stock only from valid events and calculate margin/cohort metrics.

**Minimum human involvement:** Perform picking/packing and condition inspection where no trusted scan/system exists. Only unusual damage, fraud indicators, out-of-policy discounts/refunds and data discrepancies need case decisions.

Routine actions execute under versioned standing policy through validated tools, without a staff approval click. Customer consent to a quote or change remains required where the workflow calls for it. AI text itself is not authority: deterministic permissions, source evidence, price/capacity rules and messaging eligibility govern execution. Keep the fact, rule version, action, result and final actor in the audit trail.

## Benchmark and target policy

Start with one complete local operating cycle and at least four weeks of reliable capture; use a longer history for seasonal businesses or long conversion/retention windows. This is a proposed onboarding process, not an industry standard. Segment by the business subtype and service mix named above. Display numerator, denominator, sample size and data coverage before comparisons.

The owner sets a target after reviewing the baseline, capacity, customer commitments and available matched evidence. Label targets as **local operating targets**. Leave external percentile comparison unavailable where the cited source supplies only guidance, an unmatched population or inaccessible detailed tables. Do not assign arbitrary red/green thresholds or optimize a volume KPI at the expense of quality, consent or margin.

## Automated acceptance scenarios

1. Two customers cannot reserve the same last unit; expired reservations are released once.
2. A returned order reverses revenue and the correct stock/cost allocation without becoming a new purchase.
3. A restock alert uses net available stock after reservations, not raw on-hand quantity.
4. Verify all six primary destinations, the sector Work label, Orders → Follow-ups, customer/chat links and Insights → filtered records → Back to Insights. Changing view must preserve record identity, filters and role restrictions.
5. Apply the shared checks for missing/zero data, cohort maturity, tenant/role isolation, duplicate events, reminder cancellation, EN/AR, mobile layout and save/reload. Test provider behavior with simulated transport only.

These are acceptance requirements for implementation, not tests reported as executed by this documentation task. Ship only after data adapters, KPI reconciliation and automated acceptance are complete for this sector; registry status alone is insufficient.


## Automation-first operating specification

Everything in this section is a **target requirement** unless explicitly identified as current behavior. Apply the [automation-first contract](automation-contract.md) with this sector's stricter evidence/authority rules. Existing KPI definitions and research citations above remain unchanged; new cadence and latency values are proposed product defaults, not industry benchmarks.

### Standing policy and one-time setup

Configure: **catalog/variant prices; stock reservation and hold duration; discount authority; shipping promises; return eligibility; refund/payment authority; loyalty and marketing rules.**

Hasib validates required settings and connected sources before enabling each rule. A setup gap blocks only the dependent rule and names the missing configuration. Routine policy-compliant actions run automatically once enabled; changing policy is an administrator task, not a daily operator step. Any quoted amount, booking, refund instruction or resource commitment must use the deterministic authorized rule and exact current terms.

### Source capture and minimum staff input

**Capture map:** Catalog/POS → products, saleable stock, prices and sales; customer → desired variant/address; warehouse/carrier → pick, pack and delivery; payment → settlement; staff → actual returned condition where needed.

Use the required sector fields above plus the canonical record envelope in the shared contract. Every captured fact carries source ID, effective time, ingestion time, verification state and actor. Do not ask staff to re-enter values already supplied by a trusted integration or confirmed customer answer.

**Layla's work:** Match requirements to available catalog items, handle routine checkout and order questions, request missing address details, send verified fulfillment updates and explain eligible return options.

**Hasib's work:** Reserve exact variants, compute authorized totals, create/reconcile orders, manage fulfillment and return obligations, update stock only from valid events and calculate margin/cohort metrics.

**Human work only where needed:** Perform picking/packing and condition inspection where no trusted scan/system exists. Only unusual damage, fraud indicators, out-of-policy discounts/refunds and data discrepancies need case decisions.

When input is missing, show a short fact-entry form with the relevant record already selected, existing values filled and only unresolved fields required. Save once; then automatically evaluate state, downstream tasks, eligible communication and KPI effects. Physical work and professional judgment cannot be manufactured by AI; staff should not have to separately message the customer, create reminders and update a spreadsheet after recording the fact.

### Lifecycle, guards and parallel states

requested → reserved → confirmed → picking → packed → shipped/ready_for_pickup → delivered/collected → closed; returns: requested → authorized → received → inspected → resolved. Payment and refund settlements are separate.

Every transition needs an allowed from/to state, expected version, authorized actor/tool and required evidence. Appointment, scope approval, payment, physical fulfillment and communication delivery are independent facts. Preserve partial completion and unresolved obligations; do not mark an entire record complete because one subtask finished. Cancellation requires a recorded reason and releases only resources no longer committed; credits/refunds and customer notice follow their own rules.

**Current implementation boundary:** Enabled retail records do not establish all POS/carrier/payment integrations or the automatic queue. Add event adapters and returns/fulfillment evidence before showing complete retail analytics.

### Event-by-event automation and follow-up enrollment

The event keys below are proposed sector rule identifiers; they are not claims that identically named API events already exist. Each row is enabled independently when its evidence, policy, adapter and tests exist. Named cadences resolve through the [shared cadence profiles](automation-contract.md#cadence-profiles); reminders are capped across rules and rechecked against current state before dispatch. “EV” means one event update, never an endless reminder loop.

| Trigger / event key | Required source evidence | Hasib automatically does | Layla automatically does | Queue / timing profile | Stops, exceptions and guards |
| --- | --- | --- | --- | --- | --- |
| product_request | Verified desired product/variant | Check saleable stock and permissible alternatives | Answer availability and collect missing choice | MISSING_INPUT | Do not promise stale or reserved stock |
| checkout | Accepted basket and valid address | Price and atomically reserve stock within hold policy | Send order/payment instructions | EV; QUOTE if allowed abandoned basket | Hold expires or basket changes invalidate jobs |
| confirmed | Verified required payment/credit condition | Commit inventory/order and fulfill tasks | Confirm reference and promise | EV; DELIVERY_DUE | Payment claims are not settlement |
| shipped_ready | Warehouse ready or carrier acceptance | Start shipment or pickup obligation | Send tracking/collection details | EV; COLLECTION for pickup | Use the correct service mode |
| delivery_exception | Authoritative failed delivery or changed promise | Create recovery route and reschedule once consent captured | Collect corrected instructions and explain facts | RECOVERY; DELIVERY_DUE | Never reuse an obsolete address after correction |
| return_requested | Order-linked request within policy | Validate eligibility and issue permitted return instructions | Explain next steps and evidence needed | REVIEW | Exception routes to decision owner without unrelated queue blocking |
| return_received | Inspection and receipt facts | Reconcile quantity/cost and execute authorized refund instruction | Confirm recorded return and refund status | EV; BALANCE only for real remaining obligation | Refund initiated is not settled |
| back_in_stock | New saleable stock event matches permitted request | Recheck availability and reserve only on valid acceptance | Notify interested opted-in customer | BACK_IN_STOCK | Stop on decline, fulfillment, stock loss or expiry |

A customer reply pauses the matching unanswered sequence and lets Layla handle the response; unrelated future confirmed obligations remain scheduled. Hasib cancels old jobs on reschedule, scope/quote revision, completion or applicable preference change. Replaying an event cannot create a second enrollment or duplicate accepted message. Details and provider results remain visible even when the routine action succeeds without staff attention.

### Additional workflows and required controls

| Workflow | Required fields, automation and boundary |
| --- | --- |
| Catalog and inventory | Track SKU/variant, quantity/unit, location, reserved and available stock, lot/serial where relevant, landed cost and replenishment source. |
| Orders and allocation | Define hold expiry, partial/backorder policy and split shipments. Check availability again before accepting a waiting-list/back-in-stock order. |
| Returns and refunds | Separate eligibility, authorization, receipt, inspection, restock/disposal, refund instruction and settlement. A returned damaged unit cannot automatically re-enter saleable stock. |
| Product requests and loyalty | Deduplicate requested products by customer/variant and expiry. Keep service notifications separate from marketing preference, and record referral/reward conditions explicitly. |

These workflows stay inside the six destinations. If a subtype does not offer an optional service, disable its fields/rules explicitly rather than display invented data. An enabled subtype must implement its relevant lifecycle, source mapping, messages, KPI coverage and acceptance cases; a generic notes field is not a substitute for that adapter.

### Exact dashboard behavior by destination

| Destination | Automatically populated information and behavior | Available staff action / exception |
| --- | --- | --- |
| Chats | Layla receives structured intake, links the authorized customer and work record, answers from the latest verified stage, and shows next automatic action, source time and any blocker | Take over, correct an ambiguous fact or resolve an assigned exception; Open Orders retains conversation context |
| Orders | Default **Fulfillment list** with **Order/customer, variants, reservation state, promise, balance, fulfillment**; source events update the canonical record, dependencies and generated follow-ups; Needs attention contains unresolved exceptions | **New order** is a manual fallback for offline intake, not required for normal customer conversations; capture missing evidence or open the full record |
| Customers | Verified identities/preferences, linked work/history, authorized balances, source provenance and this customer's queue; profiles reconcile from intake/source events | Correct identity or preference with evidence; do not duplicate work records or merge solely by name |
| Broadcasts | Only the permitted sector audience, approved campaign purpose/content, scheduled eligibility checks, caps and actual receipt results; inquiries link back to Chats/work | Configure a campaign or exceptional content decision; normal approved schedules run automatically; no arbitrary upsell to every contact |
| Insights | Four headline and four diagnostic KPI definitions above, **Category/variant; channel; new vs repeat customer; stock age**, source-health/coverage, exact drill-down population and shared automation diagnostics | Review abnormal results, missing-source exceptions and local targets; routine metrics/reports require no manual spreadsheet |
| Settings | BznsBrain catalog/rules, source map, agent/tool permissions, schedules, limits, templates, role access and versioned configuration/test health | Initial setup and material policy changes; exceptional permission review without an approve-all inbox |

**Work views:** Orders · Products & stock · Requests · Follow-ups. Keep quick filters **Unconfirmed · Picking · Ready · Overdue**. The record workspace includes **Line items; stock/lot allocations; delivery/pickup; returns and payments**, plus Overview, Activity and Follow-ups. Additional subtype details belong in the relevant record; do not create extra top-level tabs.

**Record fields/actions:** header shows stable reference, state, exception owner, verified last event and current promise; body shows required facts and their source, related resources, accepted scope, separate financial/approval states and dependencies; footer/timeline shows next automatic action, rule/version, due time and stop reason. Only offer transitions supported by current evidence. Save returns the persisted canonical version; failed saves keep entered data and never show success.

**Follow-ups detail:** show linked record/customer, reason/event, priority, due/timezone/expiry, waiting party, mode, next attempt, pause/block reason, source freshness and distinct provider/business outcome. Inspecting the queue is optional for healthy automatic work. “Needs decision” contains genuine exceptions/customer or professional decisions, not routine pending sends. Open chat/work, inspect evidence, permitted pause/resume and reasoned snooze are contextual actions; staff cannot click Complete to fabricate a source fact.

### Live updates and customer status answers

When a verified sector event commits, refresh Orders, Chats context, the customer timeline and the relevant queue from the same record/version. Insights reconciles with its own visible as-of time. Use authenticated subscriptions where implemented; label polling/fallback and last successful sync otherwise. The [live-status contract](automation-contract.md#live-status-and-customer-visibility) defines proposed freshness targets and stale behavior, not achieved production performance.

Layla identifies the permitted customer and record, then answers with current stage, actual latest event, next verified step and sourced promise/ETA. If there are multiple matching records, ask which one using minimal references. If the source is stale, say what was last recorded and when; create a missing-source exception instead of pretending to know progress. Sensitive details and restricted financial/professional information remain permission-gated.

A dashboard update does not prove that a customer message was delivered. Show separately: event saved → action scheduled/attempted → provider accepted → delivered/read if available → verified business outcome. Missing receipts stay unknown. A useful material change can trigger an eligible update; unchanged status does not produce repetitive outbound messages.

### Exceptions, workload and recovery

Hasib first attempts the configured deterministic resolution: fetch/reconcile a source, ask the customer for a missing fact, select available authorized capacity, retry a confirmed transient failure or invalidate an obsolete job. If still unresolved, create one exception with reason, evidence, impact, owner, decision required and due time. Notify the responsible internal role according to policy; do not broadcast sensitive work details.

Use the source/fact owner for unknown physical outcomes, the configured administrator for missing policy/integration, the domain professional for professional judgments, and the authorized commercial owner for out-of-policy commitments. Once the missing fact or decision is saved, Hasib revalidates and resumes automatically; staff do not reconstruct the queue.

Track touchless eligible completion, staff fact entries versus operational touches, exception age, action correctness, queue lateness and source coverage in Insights. Do not count a customer acceptance as a staff touch, hide unresolved work from the denominator, or claim a measured automation percentage from this specification.

### Automated implementation acceptance

1. Concurrent checkout cannot oversell the last variant.
2. A returned unit restores the correct cost/stock state exactly once and keeps original revenue history.
3. Opt-out cancels replenishment marketing without erasing legitimate order support records.
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
| Acquisition routes to test | Product/category search, approved catalogs/feeds, social product content and customer referrals |
| Offer / next-step promise | Verified variant availability and a short, transparent checkout |
| Fit and readiness | Variant/quantity, fulfillment, address and live stock; use budget only when needed to select options |
| Verified conversion path | Confirmed order → fulfilled first purchase, adjusted for returns |
| Layla + Hasib automatic journey | Match catalog, reserve stock, send valid checkout, recover permitted abandoned purchase and notify requested back-in-stock |
| Repeat / referral loop | Consent-based replenishment, complementary products, loyalty and lapsed-customer recovery |
| Acquisition KPI focus | Cost per fulfilled new customer; net contribution after returns/discounts; checkout completion; repeat purchase within W |
| Evidence mapping | [L11](lead-generation-evidence.md#l11); [P01](lead-generation-evidence.md#p01) |

**Sector limits:** No false scarcity, stale stock or reuse of a shopping inquiry as blanket marketing consent.

**First proposed experiment:** Compare the current product entry with a stock-verified variant and transparent total before checkout; judge fulfilled new-customer contribution after returns. Keep the offer terms, assignment and reporting window explicit; do not label a low-volume result a winner.

**Add to the existing dashboard:** Chats shows source/offer and the next automatic action; Orders links opportunity → canonical work and Follow-ups; Customers stores identity, lead/customer segments and the touchpoint history; Broadcasts holds authorized acquisition/nurture/referral campaigns; Insights shows the source-to-outcome funnel and contribution; Settings stores authority, sources, fit/routing, capacity, caps and export policy. Keep exactly six primary destinations.

**Required acquisition records:** source/offer/creative version, verified touchpoint, opportunity/lifecycle, contact permission and source freshness, explicit fit/readiness reasons, next action, canonical work link, real outcome timestamps, lost/nurture reason, matched spend and cost coverage. Preserve first touch and later assistance separately; one contact can have separate legitimate opportunities.

**Minimal human work:** configure the actual offer, proof, capacity, financial authority and permitted channels once. Layla requests missing customer facts; Hasib routes and executes allowed next actions, maintains follow-ups and reconciles outcomes. Humans supply missing physical/professional facts or resolve a defined exception. Existing contacts, replies and domain records must not be retyped for this funnel.

**Stops and recovery:** customer reply pauses the matching unanswered sequence; accepted action, completed purchase, cancellation, expired quote, opt-out, takeover or revised scope cancels obsolete jobs. Recheck availability and export/messaging eligibility at execution. Reuse shared cadence and contact caps; never keep a won customer in an unanswered-lead sequence.

**Automated acceptance additions:** trace one synthetic sourced inquiry through the verified conversion path and reporting; replay duplicate touches and outcome events without duplicate records/messages; prove loss/cancellation/refund corrections and new-versus-repeat attribution; verify the sector-specific limit above. A clicked CTA, issued quote or completed intake must not become attendance, paid revenue or a successful ad conversion without its own evidence.

[All sector specifications](README.md) · [Automation contract](automation-contract.md) · [Six-tab design](dashboard-design.md) · [Measurement contract](measurement-contract.md) · [Research register](research-sources.md)
