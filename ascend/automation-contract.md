# Ascend automation-first operating contract

Revised 2026-10-10 · Target specification for all [25 sector dashboards](README.md)

This contract makes routine work automatic after the business configures standing authority and connects verified sources. Layla handles customer conversations; Hasib executes validated operational work, maintains records and runs queues and reporting. These are product responsibilities, not a claim that separate new agent services already exist. Use existing bounded tools and deterministic domain operations; do not add an agent chain for a fixed rule.

The [measurement contract](measurement-contract.md) still owns metric semantics and messaging eligibility. This contract replaces the earlier **draft-first default** in the sector specifications. Draft/shadow mode is for setup, unproven rules or an explicitly chosen policy. An eligible routine action must not wait for a staff member to press Approve, Send, Create follow-up or Complete task. Customer consent, source facts and professional decisions remain distinct from staff approval of routine automation.

**Capability boundary:** this is a proposed build contract. The local six-tab draft is synthetic, uses browser storage and sends nothing. Current generic follow-ups are manual tasks, not this scheduler. An enabled sector registry flag does not certify these automations. This documentation task does not deploy, migrate, send messages or grant a production agent new permissions.

## Authority and minimal human work

| Actor | Automatic responsibility | Boundary |
| --- | --- | --- |
| Layla | Identify the permitted customer/work context; extract structured intake; ask only missing facts; explain catalog options; request customer decisions; answer status; compose approved-purpose updates in the customer's supported language | No fabricated facts, clinical/legal/financial judgment, guessed ETA, invented price or permission from retrieved text |
| Hasib | Validate identity/access; calculate prices and balances; check capacity and stock; commit allowed state changes; enroll/cancel jobs; reconcile receipts; compute KPI populations; run exception routing | Deterministic tool permissions and standing policy control every side effect; model text cannot bypass them |
| Domain connector | Supply source IDs, event times, status, availability and verified outcomes from POS, calendar, inventory, ERP, diagnostics or other declared systems | Report freshness and incomplete coverage; a connector must not invent an unavailable event |
| Specialist reasoning, when useful | Bounded classification, draft explanation, source-linked anomaly summary and missing-field suggestions | Output is validated; it cannot independently approve money movement, professional findings or arbitrary tool access |
| Staff/domain professional | Capture real-world facts unavailable from trusted sources; perform physical/professional work; resolve specific out-of-policy exceptions | Do not retype customer intake, create routine reminders, chase ordinary approvals or manually prepare recurring reports |
| Customer | Choose, consent, approve a scope/version, supply their own facts, pay through authorized channels and change preferences | Silence is not approval; customer action is not a staff automation failure |

Configure once in Settings → BznsBrain: catalog and allowed price/discount/refund authority; permitted actions and limits; capacity, hours, working calendar and timezone; source-of-truth map; required evidence; appointment/quote/change terms; approved messaging purpose and content; contact preferences; escalation owner and deadline; reporting definitions; retention and access policy. Version changes and record the responsible administrator. Price bands require a deterministic rule, not model discretion to pick any number in the band.

Routine quotes, supported reservations, record creation, reminder dispatch, status updates and reconciliations execute automatically within that authority. A binding customer commitment still needs the configured customer acceptance and source confirmation. Missing policy blocks only the affected action and states the exact configuration gap. A single exception must not pause unrelated work.

Human input should be **one fact entry at the point of work**: a scan, checklist result, diagnosis, quality sign-off, attendance, receipt or handover. That saved fact triggers all eligible downstream records, updates, queues and reporting. AI cannot repair a phone, inspect a site or certify a professional finding by changing a dashboard stage.

## Data capture and canonical records

Capture in this order: authoritative connected source → existing verified record → customer-confirmed structured answer → validated AI extraction → smallest missing-fact form for staff. Show extracted values for correction only when ambiguous or consequential; do not force staff to approve every normal field. Ask the customer before staff when the customer is the appropriate source.

Each fact has tenant, typed record ID, field/value/unit, source system/reference, effective time, ingestion time, verification state and actor. Confidence can prioritize clarification; it is not proof of payment, identity, attendance or quality. Resolve source conflicts with field-specific authority and freshness. Never silently let a chat statement overwrite a payment receipt or a technician's signed test.

Canonical work envelope: tenant/sector, customer and authorized contact links, lifecycle ID, current state/version, scope/quote version, relevant asset/resource IDs, assigned exception owner, promise/timezone, required evidence, dependencies, separate approval/payment/fulfillment states, source timestamps and audit history. Sector fields extend this envelope with typed records. Imported text is untrusted data. Documents do not contain executable instructions for agents.

Structured customer replies update the same record through validated operations. Identity merges require verified association and preserve history; a matching name alone is insufficient. Duplicate imports use source IDs. Corrected facts append provenance and recompute affected metrics; they do not erase the former promise or original quality failure. Restrict attachments, sensitive details, export and retention by role and business policy.

## Event-to-action pipeline

1. Authenticate tenant, actor/tool capability and record scope; validate event/schema and expected record version.
2. Commit the authorized business transition and durable automation outbox together. Where an external system is involved, persist an intent and reconcile its result; never treat a timeout as proof of failure.
3. Evaluate versioned rules against current facts, consent and business policy. Create one enrollment per tenant + typed record + lifecycle + source event + rule version + step. Add business-level uniqueness for the obligation so duplicate upstream representations cannot double-enroll.
4. Derive exact due times from event time, configured calendar, quiet hours and expiry. Save each planned step rather than relying on an in-memory timer.
5. Lease due work with bounded concurrency and tenant fairness. Re-read the latest record and stop conditions immediately before dispatch.
6. Execute the permitted tool/transport with its idempotency support. Save action result, provider reference, receipts and subsequent business outcome separately.
7. Reconcile stalled/ambiguous attempts, cancel superseded jobs and update linked dashboard surfaces. Resume safely after worker restart.

Replies pause the matching unanswered sequence while Layla classifies the response and resolves/clarifies it. They do not cancel an unrelated future confirmed appointment. Cancellation, collection, settlement, expiry, opt-out, takeover and superseding versions cancel the applicable pending jobs. A reopened job creates an explicit new lifecycle and reevaluates rules; it must not revive stale reminders.

Reschedules cancel jobs for the old promise and calculate the new set. No reminder is sent for a time already past unless the rule declares a useful catch-up action. Delayed integration events use the actual event time, check current state and skip obsolete steps.

## Cadence profiles

These are **proposed configurable defaults**, not industry benchmarks, legal requirements or provider permissions. Each activated rule stores resolved offsets, working calendar, timezone, expiry, maximum customer contacts and purpose. Sector-specific contract deadlines and freshness limits take precedence. A profile never overrides consent or eligibility.

| Profile | Exact default behavior | Stop/expiry |
| --- | --- | --- |
| EV | Enqueue one factual update immediately after a qualifying committed event; zero repeated reminders | Superseding event/version, already communicated fact or failed eligibility |
| MISSING_INPUT | Ask when needed in the conversation; unanswered follow-ups at +4 business hours and +1 business day, maximum two | Fact supplied, reply requiring clarification, decline or seven-day request expiry |
| QUOTE | Initial quote on issuance; unanswered reminders at +1 and +3 business days, maximum two | Acceptance, rejection, reply, revision, expiry or cancellation; never contact after quote expiry |
| REVIEW | Initial decision request; reminders at the recorded due time and +1 business day, maximum two, skipping a duplicate initial/due instant | Decision, reply, version change or decision expiry; if deadline is absent, block setup |
| PRE_EVENT | At 24 hours and 2 hours before the confirmed event, maximum two; skip already-past offsets | Cancel/reschedule, lost resource entitlement or ended event; urgent bookings get the confirmation only if both offsets passed |
| COLLECTION | Ready notice via EV; reminders +1 and +3 business days after ready, maximum two | Collected, cancelled, reopened, dispute or pickup/quality expiry; perishable goods require a shorter explicit rule |
| BALANCE | Reminders on the agreed due date, +3 and +7 business days, maximum three | Verified settlement, credit, dispute, cancellation or agreed payment-plan replacement; no new fee without authority |
| RENEWAL | At 14 and 3 calendar days before term end, maximum two | Renewed, cancelled, ineligible, dispute or applicable opt-out; no auto-charge without separate valid mandate |
| FEEDBACK | One optional request 24 hours after verified fulfillment | Existing complaint, withdrawn consent, duplicate request or seven-day expiry |
| NO_PROGRESS | Internal source/exception check after one business day without a required milestone, or at the explicit earlier checkpoint | Verified progress, cancellation or resolved blocker; not a repeating customer message |
| CHECKPOINT | Internal check at the recorded dependency/checkpoint time; one unresolved escalation at +1 business day unless the configured SLA is earlier | Resolved, superseded or cancelled; missing checkpoint blocks activation |
| SLA | Internal risk check at configured warning time, then one escalation at the actual promise/SLA breach | Obligation resolved/cancelled; exact warning offset is required configuration |
| SLOT_OFFER | One offer with a 15-minute hold by default; release/reallocate atomically at expiry | Accepted, declined, no longer eligible, resource lost or expiry; clinical priority comes from authorized policy/professionals |
| RECOVERY | One permitted recovery/rebooking invitation the next business day after verified failure/no-show | Reply, rebooked, resolved, declined or seven-day expiry |
| BACK_IN_STOCK | One notice per request and new qualifying availability event; recheck stock at dispatch | Request fulfilled/declined/expired, applicable opt-out, or stock no longer saleable |
| DELIVERY_DUE | Internal check two business hours before promised delivery and at the promise; shorter-lead work uses only remaining future checkpoint | Delivered/cancelled or superseded promise; customer notice requires an actual material exception |

Business hours are the configured staffed/service calendar, including holidays; calendar days are not business days. Store UTC instants with the business timezone. Quiet-hour deferral cannot carry a message past its usefulness/expiry. A time change recomputes jobs once and leaves an audit trail.

Default shared cap: three unsolicited routine outbound notices per contact per rolling 24 hours, with at most one sales/re-engagement reminder in that period. Count across sectors, campaigns and rules in the tenant; a rule's attempt cap is additional. Requested conversational answers use the ordinary conversation eligibility controls. Critical service exceptions need an explicit approved override rule; they are not silently exempt. If a cap would hide a time-sensitive obligation, create an internal exception and expose it.

Booking confirmations, accepted decisions and ready notices do not wait for a coalescing interval. Optional progress updates may be coalesced over two minutes; retain only the latest truthful useful state. All profiles are subject to the same cap. Record why a message was skipped/deferred; reaching a cap does not mean the business obligation is complete.

## Queue, transport and recovery

Work → Follow-ups is the canonical queue. Filters: Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed. Existing “Needs approval” labels may remain as compatibility aliases for exceptional decision work; they must not imply every automatic message needs approval.

Priority: P0 internal critical exception under configured policy; P1 time-bound confirmed customer obligation; P2 customer decision/dependency; P3 feedback/retention. Within class sort by due time then stable ID, with tenant fairness. Display all future enrollments, not just the first 50. Use indexed pagination and accurate counts. Duplicate grouping must not hide separate obligations.

Job fields: rule/version, typed work/lifecycle, customer/contact, trigger/evidence, intended action, due/timezone/expiry, priority, owner, automatic/internal/decision mode, next attempt, pause/block reason, source freshness and links to action/provider receipts. Show who or what is awaited.

Keep three lifecycles distinct:
- Obligation: open → waiting/satisfied/cancelled/expired.
- Action job: scheduled → queued → leased → executing → succeeded, with paused/blocked/retry_wait/failed/cancelled/needs_decision alternatives.
- Message: not_attempted → submitting → provider_accepted → delivered/read where supported, or rejected/failed/unknown. “Succeeded” dispatch means accepted by the provider, not customer receipt or business completion.

An active human takeover pauses applicable automatic replies and competing outbound actions. Expiry alone does not resume mid-conversation: require the configured idle/resume condition and recheck current facts. Staff can inspect, correct source data, pause/resume within permission, or resolve a specific exception. Snooze requires reason and new due time; it cannot erase contractual lateness. “Complete” must not fabricate payment, physical work or delivery.

Before every send recheck tenant/role/plan access, channel connection, verified recipient, purpose/consent, current record/version, amount/date, human takeover, template approval where required, provider eligibility, quiet hours, cap and expiry. Reuse existing channel gates. Verify current official provider requirements when implementing; do not encode an assumed WhatsApp/Instagram exception from this document.

Retry only confirmed transient failures at 30 seconds, 2 minutes and 10 minutes, maximum three retries after the initial attempt, subject to expiry and eligibility. Permanent rejection creates an actionable failure. An ambiguous timeout after possible provider acceptance goes to reconciliation using the provider reference/idempotency support; do not blindly resend. Cross-channel fallback needs a verified identity link, permission and explicit rule. A failed message never becomes a fake delivered result.

Dead-letter/failed jobs show cause, impact, last attempt and safe recovery. Connector outages pause dependent commitments, retain durable events and reconcile when restored. Replaying events must not resend already accepted messages. A disable/rollback switch stops new side effects but preserves source records, obligations and evidence; exactly one active scheduler owns a rule during migration.

## Live status and customer visibility

“Live” means source-backed updates with visible freshness. Proposed acceptance budgets: committed canonical state appears in subscribed dashboard views at p95 ≤2 seconds; immediate eligible jobs become available to workers at p95 ≤5 seconds; scheduled due work is checked within 60 seconds. These are unmeasured build targets, not current performance claims or guaranteed customer delivery times.

Prefer tenant-authorized subscriptions; reconnect from a durable cursor/version. If a view falls back to 30-second polling, label the mode and show last successful refresh. Two missed expected refreshes mark that view stale. External sources need their own expected cadence/staleness thresholds; a fresh dashboard render does not make an old carrier scan fresh.

A status answer resolves verified customer → authorized work → current canonical state and relevant facts. Include stage, actual latest event time, confirmed next step, known blocker and recorded promise/ETA only when sourced. Do not expose internal notes, other customers, professional findings outside approved scope, hidden costs or device credentials. If the source is stale/unavailable, say so and queue the missing-source exception; never invent progress.

A customer-visible update and an internal dashboard update are different events. Display scheduling, provider acceptance and delivery receipts separately. Saving a technician's status may refresh a dashboard immediately while the customer message is deferred by channel eligibility. Show the reason.

## Six-tab interaction contract

| Destination | Automatic content and ordinary behavior | Human interaction only when useful |
| --- | --- | --- |
| Chats | Layla answers eligible conversations, collects missing input, links canonical work and shows verified status/next action; Hasib records completed tool actions | Takeover, correct a misunderstood fact, resolve an exception; retain typed draft and return context |
| Sector Work | Automatically populated work/schedule, source-derived stages, generated follow-ups, dependencies and exception strip; ordinary successful jobs stay out of Needs attention | Capture missing physical fact, inspect evidence, change authorized scope or decide an exception |
| Customers | Reconciled identity/history, preferences, linked obligations, authorized balance and source provenance | Correct identity/consent with evidence; never require staff to recreate a contact from a normal conversation |
| Broadcasts | Build eligible audiences and apply configured campaign purpose, approved content, caps and receipts; standing approved schedules execute within authority | Define/change campaign strategy, audience or content authority; no implied permission for unsolicited campaigns |
| Insights | Recompute defined KPIs, data coverage, drill-down populations and automation outcomes; generate source-linked variance summaries | Review exceptions, tune a local target or resolve a data gap; no spreadsheet needed for routine reporting |
| Settings | Version policies, connectors, agent/tool authority, channels, templates, calendar, roles, limits and reporting definitions; expose health and test mode | Initial business setup and material policy changes; no daily approve-all screen |

Every record shows source-backed status, last update, next automatic action/due time and why a job is waiting. An Activity timeline shows fact → rule/version → validated action → result, with a correlation ID and concise evidence. Do not expose hidden model reasoning. Follow-ups opens in one in-tab action; customer/chat views are links to the same queue.

State behavior: loading uses a stable skeleton; authoritative empty shows zero/empty; not connected offers setup; incomplete lists missing source fields; stale shows last reliable value/time; failed preserves data and offers safe retry; denied never fetches restricted details. Pending saves show “saving,” failed mutations do not present success, and duplicate clicks are idempotent. Reconnect merges by version. EN/AR text, keyboard/focus, 320/768/1440 layouts and deep-link return state follow the [dashboard design](dashboard-design.md).

## Automation KPIs and operator workload

These are additional shared diagnostics inside Insights, not a replacement for the eight sector KPI rows or extra primary tabs.

| Diagnostic | Definition |
| --- | --- |
| Touchless eligible completion | Matured eligible workflows completed with zero staff operational touches ÷ matured eligible workflows; define eligible scope/window and show excluded physical/professional work separately |
| Staff touches | Count distinct saved staff operational actions per work lifecycle; show distribution and source-fact entries separately from approvals/rework |
| Manual source-entry share | Required captured facts supplied by staff ÷ all required captured facts in the selected population; unknown facts are coverage gaps, not zero entry |
| Exception rate and age | Work requiring out-of-policy decision ÷ eligible work; open median/p90 age with reason/owner |
| Automatic action correctness | Audited automatic actions with correct permitted record effect ÷ audited actions; show audit sample, unknowns and rollback/correction count |
| Queue timeliness | Median/p95 eligible-due-to-first-attempt duration, showing blocked time separately and unfinished overdue jobs |
| Receipt and outcome coverage | Provider accepted, delivered, unknown, replied and verified business outcome counts with their separate denominators/windows |
| Automation cost | Recorded model/provider/tool cost per verified eligible outcome, with cost completeness and currency basis |

Do not promise a percentage of autonomy from specifications. Establish a measured baseline. Optimize staff workload together with correctness, customer preferences and sector quality; hiding exceptions, marking unknown work complete or removing professional gates cannot count as improvement.

## Automated acceptance and release evidence

Use synthetic identities, fake time and simulated integrations/transport only, matching the user's automated-only instruction. No live send-and-receipt test is required by these documents.

For each sector run a normal lifecycle with zero manual messaging, scheduling, queue creation or KPI calculation after required source-fact capture. Also test every transition guard, required customer decision, rejection/cancellation path and exception recovery. Replay duplicates, concurrent reservations, stale versions, late/out-of-order events, missing sources, source corrections and expired authority. Assert persisted records, canceled jobs, exact simulated sends and metric ledger totals, not just visible cards.

Exercise real authenticated API/Convex wrappers with synthetic authorized accounts: tenant/role isolation, plan/pack gates, cross-customer status queries, hidden costs and revoked access. Verify fake-provider failure before acceptance, ambiguous acceptance, late receipts, disconnect/reconnect, caps, quiet hours, takeover, restart and dead-letter recovery. Verify high-volume pagination and reconcile against an independent fixture ledger.

Run EN/AR responsive, keyboard, deep-link, reload and cross-view consistency checks. Record per-rule evidence: implemented adapter/version, passing scenario IDs, source coverage, measured freshness/latency, permission checks and remaining gaps. A passed document structure check is not evidence of application readiness.

Enable automatic rules progressively after the configured authority and automated acceptance exist. A production release needs the current task's explicit deployment authorization; this contract itself grants none. Keep a reversible rollout and one scheduler owner. Clinic and other professional workflows retain their applicable access/governance gates.

[Sector index](README.md) · [Measurement contract](measurement-contract.md) · [Dashboard design](dashboard-design.md)
