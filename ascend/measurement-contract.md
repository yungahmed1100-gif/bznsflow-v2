# Ascend shared measurement and follow-up contract

Prepared 2026-10-10 · Proposed implementation contract · Applies to all [25 sector specifications](README.md).

## Product structure and source truth

Expand Ascend to exactly six primary destinations: **Chats · Work · Customers · Broadcasts · Insights · Settings**. Work takes the sector label defined in each specification (for example Productions or Workshop) and owns operational execution plus Follow-ups. Insights owns KPI summaries, trends, diagnostics and benchmark comparisons. Customers owns the directory and relationship history; Chats shows the linked record and next action. Rules remain in Settings → BznsBrain. See the [six-tab dashboard design](dashboard-design.md) for navigation, page composition and engineering behavior.

This six-tab direction supersedes the earlier four-tab Ascend layout. It adds two destinations to the Catalyst foundation without changing the Catalyst product itself. The older product plan and local preview notes linked below remain historical references; their navigation placement is not the current Ascend requirement.

An industry starter, an enabled operations pack, an accurate KPI and a production-ready automation are different things. The source registry currently identifies six enabled, nine preview and ten pending operations packs. Clinic preview remains governance-gated. A registry flag is not a release test.

Use these implementation entry points:

| Concern | Current source |
| --- | --- |
| Stable sector IDs, EN/AR labels | [industries.js](../src/lib/industries.js) |
| Pack registry, owner labels and metrics | [hasib-packs.js](../config/hasib-packs.js) |
| Existing generic industry measures | [industryMetrics.js](../convex/hasib/industryMetrics.js) |
| Existing money/insights semantics | [insightsState.js](../convex/hasib/insightsState.js) |
| Existing manual follow-up tasks | [followupsState.js](../convex/hasib/followupsState.js) |
| Dedicated operations | [real estate](../convex/hasib/realEstateState.js), [construction](../convex/hasib/constructionState.js), [automotive](../convex/hasib/automotiveState.js) |
| Earlier product plan; navigation superseded here | [Ascend product plan](../docs/ascend-product-plan-2026-10-10.md) |
| Synthetic dashboard draft | [local draft notes](../docs/ascend-local-draft-2026-10-10.md) |

Existing manual follow-ups do not send. The local draft uses synthetic browser data and is not proof of backend persistence, authentication, production transport or these proposed KPIs.

## Automation-first execution

Apply the [automation-first operating contract](automation-contract.md) and each sector's event-by-event requirements. Routine eligible work executes under configured standing authority: Layla handles conversations and Hasib maintains records, queues, scheduling and reporting. Staff supply missing physical/professional facts and resolve specific exceptions. This replaces the former draft-first default; it does not claim the scheduler already exists or authorize live sends.

## One measurement definition per version

Every metric needs a stable ID and definition version, account/sector scope, owner, data sources, unit, numerator, denominator, included statuses, event timestamp, period, timezone, deduplication key, exclusions, minimum reporting coverage and drill-down query. Store a definition change rather than quietly changing a past result.

- Use a half-open reporting period: start inclusive, end exclusive. Display the business timezone, normally Asia/Muscat for the intended Oman workspace. Store authoritative instants in UTC and dates as business dates where the domain requires them.
- Counts due now are point-in-time backlog measures, not period conversion rates. A backlog may fall because work was cancelled; show the reason.
- Use the event named by the KPI: order creation, accepted quote, physical fulfillment, approved invoice and received payment are distinct events. An order created last month and delivered this month belongs to the delivery cohort this month.
- Do not silently turn a proposed KPI into an existing source metric with a similar label. Reconcile by record before replacing a current card.
- Never compute tenant metrics by retrieving another tenant's records. Role restrictions apply to queries, exports, underlying records and costs, not only hidden UI controls.
- Preserve old/new commitments and approvals. Report performance against the approved baseline, with original-baseline comparison where material. Moving a deadline after it was missed must not erase the history.

## Cohorts, cancellations and denominator rules

Each conversion or retention KPI sets an explicit observation window W before enrollment. Report only cohorts that have reached the end of that window as final; newer cohorts are “in progress.” Show included/excluded counts and the as-of date. Do not compare this month's incoming leads to unrelated deals closed this month.

Define qualification, eligible customer, first visit, completed work and renewal once per workflow. Count independent opportunities/work items separately while deduplicating duplicate representations of the same event. Identity linking across WhatsApp, Instagram and imported customer systems requires a verified association.

For attendance: the denominator is scheduled appointments due in the period, excluding timely cancellations under an explicit cutoff policy. The numerator is attended or completed appointments, counted once. Late cancellations and explicit no-shows are separate outcomes within the eligible denominator. Unknown attendance stays visible in coverage and cannot become “missed” automatically. If unknown outcomes breach the configured completeness requirement, the rate is provisional/unavailable.

For due-work timeliness: use the obligations due in the period, including unresolved overdue obligations. Exclude only genuine cancellations with a recorded reason; disclose cancellation counts so cancelling late work cannot silently improve the rate. Use the current approved promise and retain original promise comparison. First-pass quality uses first-attempt outcomes; successful rework cannot retroactively become first-pass success.

Renewal, repeat purchase and retention are separate measures. A rebooked appointment is a future intention; retention needs a completed qualifying return or the stated membership status rule. Freeze, cancellation, grace and reactivation policies must be explicit.

Display the denominator and sample size beside rates. A small sample gets a visible low-sample label based on a configured reporting policy; do not claim statistical significance from an arbitrary minimum. Medians and p90 values require a documented percentile method. Show open-case age alongside completed-case durations to expose survivorship bias.

## Money and costs

Use deterministic integer minor-unit arithmetic; existing OMR amounts use baisa (1 OMR = 1,000 baisa). Do not use AI to calculate authoritative balances. Keep currency separate; aggregate multiple currencies only through recorded conversion rates, rate date and a stated reporting policy.

Separate revenue, invoices, cash received, deposits, client/trust funds, pass-through amounts, receivables and forecast revenue. Label the recognition basis. Normalize tax, tips, discounts, refunds and credits consistently with the metric. Match returns to their original sale/cost and allocate payments to the correct obligation.

A payment claim in a chat creates a verification task; it is not settlement. Approved quote value is not automatically revenue or a collectible invoice. Forecast contribution is not accounting net profit. Direct contribution must list included costs; missing labor or overhead cannot be hidden behind a “net profit” label.

Only publish a full profit/margin result when its defined cost scope is complete. A partial known-cost subtotal must state coverage and cannot be presented as the complete result. If net revenue or other denominator is zero/nonpositive, show the money amounts and an unavailable ratio instead of infinity or a misleading percentage. Forecasts must not subtract a cost both as actual and as an outstanding commitment.

## Data quality and integrations

Use **Unavailable**, **Not connected**, **Incomplete**, **Provisional** and **Stale** where appropriate. Zero means an authoritative query found zero eligible events; it never means data was absent. Pair a metric with source coverage, latest successful sync, last event time and missing-field count.

Every import/integration declares the system of record, external ID, event time, ingestion time, tenant mapping and correction/reversal behavior. Webhook duplicates must be idempotent. Out-of-order delivery must not reverse newer state. Polling delays and partial channel coverage stay visible.

Existing bounded source scans are not proof of exhaustive history. Implement indexed period/cohort queries, paginated aggregation or reconciled materialized summaries before declaring complete metrics for larger datasets. Tests must exceed relevant current scan/page limits and reconcile totals against an independent fixture ledger.

Keep proposed specialist data out of generic notes. Use typed records and validated links for projects, matters, shipments, production orders and other adapters. Missing authoritative POS/PMS/ERP/timekeeping/clinical-system data cannot be invented from conversations.

## Benchmarks and targets

Evidence classes:

1. Public percentile benchmark with identifiable population and date, such as the Tekmetric shop sample. It still needs size, market, service mix and formula matching.
2. Public industry averages, such as the HFA summary. These describe a cohort; they do not identify top performers.
3. Standards/frameworks, such as SCOR or DORA. They define methods/practices; they do not create a local numerical target.
4. Vendor workflow guidance or practitioner recommendations. Useful for design, not proof of causal improvement.
5. BznsFlow proposed local operating target. Set by the owner from customer commitments, baseline, capacity and economics; explicitly labeled.

This research did not establish a verified best-performing Omani company or matched local top-quartile target for every sector. Several detailed reports are gated. Do not manufacture those comparisons or imply access to full reports. The research register records dates, scope and access limits.

Start capture before target tuning. Four weeks plus one complete operating cycle is an initial proposed minimum; seasonality and mature conversion/retention cohorts often need months. Pair speed/volume with quality, margin and customer outcomes. No numerical target is a guarantee, and high utilization is not automatically optimal. Do not gamify individual clinicians, lawyers, teachers or engineers by crude production counts.

## Follow-up contract

**Canonical location: Work → Follow-ups**, under the sector Work label. Chats and Customers provide contextual links and filtered views of the same task records. Insights measures outcomes and opens this queue for action; rule editing stays in Settings → BznsBrain. No seventh primary destination is introduced.

Each configured rule must record:

| Element | Requirement |
| --- | --- |
| Identity | Tenant, sector adapter, stable rule ID/version and linked typed work record |
| Trigger | A durable verified domain event, not unvalidated AI interpretation |
| Eligibility | Record stage, valid contact relationship, purpose, approvals and supported channel |
| Timing | Explicit offset, working calendar, timezone, quiet hours, expiry and late-job policy |
| Ownership | Executing agent/tool, accountable exception owner, and customer/professional decision party only where required |
| Content | Versioned approved template or source-linked draft with validated variables |
| Mode | Automatic for verified routine actions within standing policy; internal check or explicit exception decision where required; draft/shadow for setup or unproven rules |
| Limits | Explicit maximum attempts, expiry and shared per-contact frequency cap; activate automatic mode only after configured authority, sources and acceptance exist, with no per-send staff approval for ordinary eligible work |
| Stops | Workflow-specific completion, reply, decision, cancellation, superseding version and applicable preference changes |
| Evidence | Trigger ID, scheduling/dispatch history, receipt state, failure reason and linked business outcome |

Persist domain transition/enrollment atomically where possible. Deduplicate by tenant + source event + rule version + step; repeated workers must not create duplicate enrollments. Scheduler leases, bounded retries and restart recovery must be tested. Ambiguous provider acceptance requires reconciliation rather than blind retries; do not promise exactly-once external delivery.

Recheck at dispatch: current record/version, amount/date, recipient, role/plan/tenant access, contact preferences, human takeover, channel connection, messaging eligibility, required template approval, quiet hours, frequency cap and expiry. Channel policy is version-sensitive: reuse the existing transport gates and verify current official provider requirements before implementing new exceptions. This documentation does not grant channel privileges.

Replies stop unanswered-inquiry/quote sequences and return control to the conversation. They do not blindly cancel unrelated future confirmed-appointment tasks. Rescheduling or version changes invalidate obsolete jobs. Never switch channels without a verified identity link and permission.

Track task state separately from send state and business outcome. Proposed send lifecycle: scheduled → queued → attempting → provider accepted → delivered, with unknown/blocked/failed/cancelled alternatives. An exceptional decision gate is conditional, not the first state of every send. The automation contract defines distinct obligation, action-job and message lifecycles. Provider acceptance is not delivery; delivery is not response; response is not sale/payment/attendance. Show reasons and corrective actions inside Follow-ups.

For measurement, track rule eligibility, enrollment, approval delay, dispatch lateness, blocked/failed reasons, deliveries, replies, opt-outs, duplicates prevented and recorded outcomes. Delivery rate = delivered messages ÷ provider-accepted messages whose receipt window has matured; show unknown receipts. Assisted conversion = eligible linked work reaching the defined outcome within W after follow-up ÷ matured eligible followed-up work; label it assisted, not causal revenue lift. Causal lift requires an appropriate controlled comparison. Track provider/model spend per recorded outcome with cost completeness.

## AI and deterministic responsibilities

For acquisition, apply the [lead-generation measurement rules](lead-generation.md#measurement-and-controlled-optimization): intake completeness, service fit, confirmed action, attendance, paid fulfillment and repeat/referral are separate stages. Keep source attribution and platform exports distinct, following the [destination eligibility rules](lead-generation.md#destination-feedback-and-sensitive-sectors). These additions do not change the eight existing KPI rows per sector.

Layla/AI: bilingual intake extraction, source-linked summaries, verified status answers, approved-purpose customer communication and missing-field clarification. Structured output is validated; ambiguity goes to the appropriate fact source, normally the customer for their own choices. Routine messages execute automatically through qualified tools under standing authority.

Code: permissions, amounts, capacity, record identity, state transitions, timestamps, cohort math, scheduling, eligibility, retry policy and audited mutations. Customer messages and retrieved documents are data, never authority to alter system rules.

Human/domain professional: missing real-world facts, professional judgments and decisions outside standing authority. Catalog-priced quotes, supported bookings and policy-compliant changes can execute automatically; exceptional quotes/refunds/scope and required professional sign-offs remain explicit. Customer approval of terms is separate from staff approval. Minimize sensitive data; sector-specific limits are stated in each file.

## Shared acceptance and rollout

Automated-only testing follows the user's current preference. Use synthetic records, fake clocks and simulated provider responses; never require real outbound messages.

Before implementing a sector, establish its typed data adapter and metric fixtures. Required cases: empty vs missing data; zero denominators; late/out-of-order/duplicate events; refunds/credits/cancellations; period/timezone boundaries; immature cohorts; stale or missing integrations; high-volume pagination; permission revocation; tenant/role isolation; hidden-cost permissions; duplicate clicks; save/reload; linked-card record reconciliation.

For each event rule, test normal execution with no staff message approval or manually created follow-up after the required source facts exist. For follow-ups test reply/dispatch races, reschedules, version replacement, opt-out, takeover, channel disconnect, stale balances, expired content, quiet hours, worker restart, provider timeout, receipt ordering and capped retry recovery. Simulate long sequences with a fake clock.

Verify EN/AR at 320, 768 and 1440 px, keyboard focus, loading/empty/error/denied states, overflow, direct links and refresh. Verify the six-tab information architecture, sector-specific Work labels, Work → Follow-ups, customer/chat record links and Insights drill-down/back navigation. The responsive drawer exposes all six destinations; task and unread-message badges remain distinct. Preserve filters, metric population and permissions across navigation. The sector's own scenarios supplement these checks. A completed specification or passed documentation check is not evidence those application tests ran.

Recommended implementation order: shared records/measurement/follow-up foundation → one enabled-pack slice → remaining enabled packs → reusable preview booking/field-service/food flows → Media/client-project adapter and pending sectors. Clinic remains separately gated. Owner demand may change priority without bypassing data and acceptance requirements.

This folder changes documentation only. No production deployment, schema migration, external publication or send is authorized by these specifications.
