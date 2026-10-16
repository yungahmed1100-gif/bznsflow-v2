# Ascend: industry workflows and follow-ups

Date: 2026-10-10. Status: product and engineering proposal, not an approved commercial offer or implementation release. Based on the current Green checkout after the Catalyst release (`d725128`). A local synthetic draft now illustrates the proposal; production configuration and outbound messaging are unchanged.

Ahmed's subsequent UI direction supersedes the initial navigation proposal: compact Ascend into Catalyst's four existing tabs (Chats, Broadcasts, Customers, Settings). Industry work and follow-ups belong inside Customers and in conversation context; follow-up behavior belongs inside BznsBrain. Money is shown with the work/customer, not as a separate main tab. See [the local draft](ascend-local-draft-2026-10-10.md).

## Product outcome

Keep the existing dashboard, identity, BznsBrain, customer records and messaging. Ascend should help an owner move a customer from inquiry to completed work and recorded payment, with a clear next action whenever that journey stalls. Each industry changes the operational records, stages, fields, rules, actions and metrics. Cosmetic tab renaming alone is insufficient.

The owner should be able to answer: What needs me today? Which customers are waiting? Which work is at risk? What money is due? What did automation actually complete?

## Observed foundation and gaps

These are source observations, not a new production acceptance audit of every pack.

| Area | Current evidence | Proposed extension |
| --- | --- | --- |
| Shared dashboard | `src/pages/LaylaDashboard.jsx`, `src/lib/dashboard/navigation.js`: common dashboard with plan/role-dependent sections and industry views | Preserve Catalyst's four tabs. Put linked work and follow-ups in Chats/Customers, with compact counts instead of a new Today tab. |
| Industry registry | `config/hasib-packs.js`: six enabled packs, nine preview packs, ten pending choices including Other | Release each operational workflow based on evidence; do not equate the 25 Catalyst starters with 25 ready Ascend packs. |
| Pack configuration | Industry modules, labels, fields, metrics and quick actions already exist; unconfigured owner presentation falls back to retail | Require explicit owner presentation, workflow and automation definitions before opening a new industry. Media must not inherit retail controls. |
| Follow-up tasks | `convex/hasib/followupsState.js`, `src/components/hasib/FollowupView.jsx`: contact, due date, reason, linked record, open/complete and chat link; idempotent writes and version checking | Add assignment, snooze/cancel, event triggers, templates, scheduling, receipts and outcomes. Current generic follow-ups never send messages. The list also needs usable pagination beyond its first page. |
| Real estate messages | `convex/hasib/realEstateState.js`: manager-approved drafts can queue free text inside the window, or a narrow approved utility template path outside it | Reuse the transport pattern, but generalize through a shared follow-up service. The current path does not constitute a general scheduled sequence engine. |
| Durable work | `convex/crons.ts`, `convex/blueMessaging.ts`, `convex/blueMessagingState.js`: scheduled message/campaign maintenance, dispatch gates and message state | Add follow-up enrollment and due-job recovery, reuse existing transport instead of creating another sending stack. |
| Authorization | `convex/hasib/capabilities.js`: Ascend operations, money, insights, approvals and team; manager/employee restrictions | Add explicit permissions for follow-up configuration, approval and execution; enforce them in backend wrappers and domain actions. |

Enabled packs: retail, electronics/phones, dental, real estate, construction and automotive. Preview packs: medical clinic, HVAC, cakes, café, restaurant, beauty, fitness, education and cleaning. Pending: logistics, travel, events, legal, finance, marketing, Media, technology, manufacturing and Other. Medical-clinic governance and acceptance gates remain open; its preview status is not permission to collect clinical records.

The vault's older Catalyst exclusions for broadcasts/imports have drifted from the current capability matrix and the October 7–9 release evidence. This proposal uses current code for technical capability and does not establish new pricing or commercial inclusions.

## Dashboard experience

Retain the same responsive EN/AR dashboard and Catalyst's four primary sections: Chats, Broadcasts, Customers and Settings. Customers contains its list, the industry's work view and follow-ups. Chats shows the conversation's linked work and next follow-up. Settings retains BznsBrain and Channels; behavior/rules sit within BznsBrain. Keep service/resource information in its catalog and team configuration within Settings. Do not add separate Today, Projects, Follow-ups, Money or Automations primary tabs.

- **Compact summary inside Customers:** assigned actions, overdue follow-ups, unanswered qualified inquiries, approaching work deadlines, confirmations needed and unpaid approved balances. Every count opens its underlying records.
- **Work:** industry-specific list/board and detail page with the linked conversation, customer, owner, stage, next action, due date, approved amount and activity history. Dates and commitments are confirmed in the operational record.
- **Follow-ups:** Today, Overdue, Scheduled, Needs approval, Blocked/Failed and Completed filters. Each row shows why it exists, the linked work, channel, recipient, due time, draft/template, assignee and actual send status. Allow pause, snooze, edit, approve, cancel and open-chat actions according to role.
- **Customer:** one history of inquiries, work, messages, payments recorded and contact preferences. Keep WhatsApp/Instagram identities separate until the customer/business explicitly verifies a link.
- **Money:** existing deterministic amounts and recorded payments, outstanding balances and industry costs. Payment reminders require a current authorized balance; chat statements such as “I paid” create a verification task rather than marking an invoice paid.
- **Settings:** retain BznsBrain and channels; add working hours/timezone, industry rules, team permissions, approved messages and an automation activity log.

## Proposed industry matrix

All features below are proposed target scope; registry status describes existing source readiness only. Automation requires the named event to be recorded or supplied by an integrated authoritative system. “Reminder” means an eligible, configured send or an internal task when sending is blocked.

| Industry | Source status | Operational focus | Useful follow-ups | Owner metric |
| --- | --- | --- | --- | --- |
| Real estate | Enabled | Properties, requirements, verified matches, agent assignment, viewings, offers and deals | Missing requirements, viewing confirmation, post-viewing feedback, unanswered offer | Qualified inquiry → viewing → closed deal |
| Retail/e-commerce | Enabled | Orders, variants, stock reservations, pickup/delivery status, balances | Incomplete order, approved unpaid order, ready for pickup, requested item back in stock | Completed orders; pending pickups |
| Electronics/phones | Enabled | Serialized devices, repairs, estimates, trade-ins and warranty records | Estimate approval, parts/status updates, repair collection, staff-set warranty dates | Repair turnaround; awaiting collection |
| Dental | Enabled | Reception requests, confirmed visits, services/providers and recorded charges | Visit confirmation, reschedule/no-show recovery, clinician-set recall date | Attendance and recovered appointments |
| Construction | Enabled | Projects, milestones, procurement, variations and certified receivables | Pending approval, missing supplier response, milestone owner task, certified balance reminder | Overdue milestones and certified balances |
| Automotive | Enabled | Vehicles, work orders, inspections, estimates, parts and promised completion | Estimate approval, ready for collection, recorded service-due date | Approval time; vehicles past promise |
| Medical clinics | Preview; gated | Administrative requests, resource-safe visits, reception queue and waitlist | Administrative confirmation/rescheduling, waitlist offer after staff authorization | Confirmed attendance; waitlist fills |
| HVAC | Preview | Site/assets, work orders, technician assignment, service history and maintenance contracts | Visit confirmation, quote response, preventive maintenance due, contract renewal | Jobs completed on time; renewals |
| Cleaning/facilities | Preview | Site visits, crews, scope/checklists, recurring contracts and exceptions | Access details, visit confirmation, completion feedback, renewal | Completed visits; unresolved exceptions |
| Beauty/salons | Preview | Services, staff availability, bookings, deposits and packages | Appointment confirmation, no-show recovery, rebooking and package balance | Utilization; repeat bookings |
| Fitness/wellness | Preview | Memberships, trial visits, class bookings, attendance and credits | Trial reminder, attendance gap, expiry/renewal | Trial conversion; recorded renewals |
| Education/training | Preview | Courses, sessions, enrollment, attendance, guardian relationship and credits | Trial/class reminder, absence, missing enrollment information, renewal | Enrollment conversion; attendance |
| Restaurants | Preview | Direct orders, kitchen status, menus, recipes, waste and catering requests | Order confirmation/pickup; catering proposal response; consented feedback | Order completion; waste cost |
| Café/coffee/dessert | Preview | Direct orders, pickup, menu variants, ingredients and bulk orders | Pickup notification, bulk-order confirmation, consented repeat-order invitation | Fulfillment time; ingredient waste |
| Cakes | Preview | Event date, size/design, approved specification, production slot and deposit | Design approval, missing details, deposit due, pickup reminder | Orders ready on time; pending approvals |
| Logistics/delivery | Pending | Shipment requests, addresses, quotes, dispatch and delivery exceptions | Missing address, quote response, recorded pickup/delivery update, exception resolution | Failed deliveries; exception age |
| Travel/hospitality | Pending | Trip/stay inquiries, offers, supplier confirmation and approved itineraries | Quote expiry, deposit reminder, pre-arrival checklist, feedback | Inquiry-to-confirmed-booking conversion |
| Events/weddings | Pending | Event date, brief, venue/vendor tasks, quote, deposit and checklist | Missing brief, quote decision, deposit, milestone/vendor confirmation | Confirmed events; overdue decisions |
| Media/production | Pending | Briefs, quotes, crew/resources, shoots, deliverables, revisions and approval | Missing brief, quote response, shoot confirmation, asset requests, cut approval, final delivery | Quote conversion; approval delay; on-time delivery |
| Marketing/agencies | Pending | Leads, proposals, retainers, deliverable calendar and client approvals | Proposal response, missing assets, approval reminder, retainer renewal | Approval turnaround; overdue deliverables |
| Technology/software | Pending | Discovery, proposals, projects, support tickets, milestones and renewals | Missing requirements, proposal response, acceptance review, renewal | Time waiting on client; resolved tickets |
| Manufacturing | Pending | RFQs, specification versions, estimates, purchase-order confirmation and production batches | Missing specification, quote decision, sample approval, dispatch readiness | RFQ conversion; on-time batches |
| Legal services | Pending | Consultation intake, administrative engagement stages and staff-set tasks | Consultation confirmation, engagement response, administrative document request | Inquiry response; administrative completion |
| Finance/accounting | Pending | Client engagements, recurring work, document-request checklists and staff-set due dates | Missing document, engagement response, scheduled review and renewal | Work ready for review; overdue requests |
| Other | Pending | Explicit generic service inquiry, quote, task and milestone workflow | Quote response, scheduled task and completion check | Completed work; outstanding actions |

Boundaries: dental/clinic reminders remain administrative and avoid clinical content. Legal/finance automation does not infer statutory deadlines or give professional advice. Travel availability, courier scans, website abandoned carts, supplier status and external payments need integrations or staff entry; they cannot be inferred from a chat. Review requests use consistent eligibility, not customer-rating-based filtering.

## Follow-up behavior

Launch three simple modes per rule: **internal task**, **draft for approval**, and **automatic approved message**. Start new workflows with tasks/drafts; enable the automatic mode once the business has configured its recipients, timing and messages and the workflow passes acceptance. Do not build a visual automation canvas in the first release.

An example quote rule: a staff-approved quote is marked sent; if it remains open at the configured next business day, create a follow-up. If eligible, send the approved reminder. A later final reminder is optional and bounded. A reply stops the no-response sequence and returns the lead to the conversation workflow. Acceptance, rejection, expiry, opt-out, takeover or staff cancellation invalidates the corresponding pending sends. Confirmed appointment reminders use their own lifecycle; a reply does not blindly cancel every unrelated future task.

Every rule needs a trigger, applicability conditions, delay/timezone, recipient/channel, purpose, approved template or draft policy, assignee, stop conditions, maximum attempts and outcome definition. Suggested starting cadence is a configurable first reminder and at most one later reminder for an unanswered quote, not a universal default for every workflow.

At dispatch, recheck the actual record version/state, current recipient preference, channel connection, workspace/plan/role permissions, human takeover, messaging window, approved template, business quiet hours and per-contact frequency cap. Block with a visible reason if any prerequisite is missing. A late job must expire or be rescheduled appropriately: never send “your appointment is tomorrow” after the appointment has passed.

WhatsApp free-text sending is limited to the customer service window; outside it, use an approved and appropriately categorized template. Do not classify every sales follow-up as utility. Meta's official collection documents the rolling 24-hour customer window and template requirement: [WhatsApp statuses documentation](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object). This citation supports window behavior, not current pricing.

The current shared messaging code enforces a 24-hour window for Instagram too. Keep Instagram follow-ups within that implemented gate; when closed, create an internal task. A new cross-channel reminder requires a verified contact link and permission; do not silently switch a DM to WhatsApp. Meta documents that an Instagram recipient must first message the professional account: [Instagram Send API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-5216d45b-1e24-4bff-bdc8-e1bf15358477). Direct Meta developer documentation returned HTTP 429 during this assessment, so any additional message-window exception requires fresh official verification before implementation.

Track planned, awaiting approval, queued, attempting, provider accepted, delivered, failed, blocked and cancelled separately from the business outcome. A send receipt is not a reply, a booking or a payment. Attribute a conversion only through a linked recorded outcome; call it assisted conversion unless causal lift is measured with a suitable baseline/holdout.

## AI and system design

Use Layla to interpret bilingual/mixed-language messages, summarize a conversation, extract candidate brief fields and draft wording from approved facts. Require structured output, field validation and source references. Missing or ambiguous date/amount/intent becomes a clarification or task. Treat customer text and retrieved content as data, never authority to change permissions or invoke arbitrary actions.

Use deterministic code for eligibility, dates, prices, balances, capacity conflicts, workflow transitions, permissions, retries and sending. An LLM is unnecessary for an appointment reminder with known facts. AI may suggest an industry action; the domain operation validates it before saving. Discounts, refunds, changed scope, binding quotes and sensitive advice remain human decisions.

Reuse the existing React/API/Convex stack. Proposed path:

`validated business event → follow-up rule → durable enrollment/job → dispatch-time eligibility → existing messaging/campaign transport → provider receipt → linked business outcome`

Add a shared rule/job model with tenant, rule version, workflow/record version, contact/channel, trigger id, step, due time, assignee, approval snapshot and cancellation reason. Persist the domain transition and enqueue decision atomically where possible. Deduplicate by tenant + trigger + rule version + step. Use bounded indexed due-job scans, leases and capped transient retries. An ambiguous provider timeout goes to reconciliation/attention; do not blindly retry and risk duplicate messages. Do not promise exactly-once external delivery.

Generalize adapters around the actual industry records. Existing generic follow-ups only link booking/membership/order/job/property tables; construction projects, automotive work orders, real-estate opportunities and future Media projects need explicit validated links. Do not stretch free-text reasons or generic order fields into an untyped workflow database.

Version industry definitions and preserve existing records. A new industry should declare labels, fields, stages, relevant resources, metrics, supported triggers/actions and release state. Use common engines for orders, bookings, field service and client projects while retaining specialized real-estate, construction and automotive domains.

## Recommended build order and acceptance

1. **Shared foundation + real estate slice:** Follow-ups inside Customers and Chats, assignment/snooze/cancel, industry record links, task/draft/automatic modes and durable scheduling. Prove quote/viewing reminders and reply cancellation with the existing transport and approval flow.
2. **Existing enabled packs:** Apply the engine to retail pickup/unpaid orders, electronics repair collection, automotive estimates/collection, dental administrative reminders and construction approval/certified-balance tasks. Preserve current domain rules.
3. **Reusable service/booking workflows:** Complete HVAC/cleaning, salon, fitness and education, then direct-order food/cakes. Release independently when their operational data and acceptance are ready; clinic remains separately gated.
4. **Media and client projects:** Build the shared brief → quote → approval → scheduled work → deliverables → acceptance workflow with Media as the first full slice. Reuse suitable parts for events, marketing and technology; adapt manufacturing RFQs explicitly. Logistics, travel and professional services get their own data/dependency acceptance before release.

Prioritization above reflects implementation readiness and reuse, not verified market demand. Named pilot demand can move a pack earlier. Avoid opening every pending registry flag in one release.

Acceptance includes duplicate events, reply/cancellation races, rescheduling, opt-out, takeover, disconnected/replaced channels, revoked permissions, invalid/rejected templates, stale prices/balances, deleted contacts, quiet hours/timezones, worker restart, provider timeout, receipt ordering, tenant isolation and employee permissions. Confirm EN/AR at 320/768/1440 px, deep links and save/reload. Simulated time tests should exercise long follow-up sequences without waiting days or contacting real customers.

Automated-only testing remains the user's current preference. No real send is needed to develop/test this proposal. Future release evidence must distinguish synthetic transport tests from actual provider delivery and requires task-specific deployment authorization.

Measure overdue-action rate, median inquiry-to-next-action time, attendance/collection/completion by workflow, blocked-send reasons, opt-outs, confirmed delivery, assisted conversions, provider/model spend and support effort. Establish baselines before claiming lift. Workload, spend ceiling, retention and pilot acceptance targets remain to be set before implementation release; no price or timeline is implied by this proposal.
