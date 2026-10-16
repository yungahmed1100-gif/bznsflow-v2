# Ascend six-tab dashboard design

Revised 2026-10-10 · Proposed experience and implementation contract

This design supersedes the earlier four-tab Ascend layout. It retains the Catalyst foundation and adds **Work** and **Insights**, for exactly six primary destinations. The files in this folder are specifications; the existing local application has not been changed by this edit.

Apply the [automation-first operating contract](automation-contract.md): Layla handles eligible customer conversations and Hasib runs operational records, queues and reporting. The operator's normal work is missing fact capture and scoped exceptions; successful routine automation must not fill an approval inbox.

## Navigation and page ownership

Default order: **Chats · Work · Customers · Broadcasts · Insights · Settings**. Work is renamed for the workspace's sector; the underlying key remains `work`. Existing Catalyst names remain recognizable. The six destinations are the full Ascend navigation model; role and plan checks govern access without moving another destination into a restricted tab's place.

| Stable key | English / Arabic | Owns | Typical question |
| --- | --- | --- | --- |
| `chats` | Chats / المحادثات | Inbox, conversation, handoff and linked-record preview | Who needs a response? |
| `work` | Sector label below | Operational records, schedule, approvals, exceptions and Follow-ups | What must happen next? |
| `customers` | Customers / العملاء | Verified identity, contact preferences and relationship history | What do we know about this customer? |
| `broadcasts` | Broadcasts / الرسائل الجماعية | Audiences, campaign drafts, authorized sends and delivery reports | Which approved audience are we contacting? |
| `insights` | Insights / المؤشرات | KPI definitions, trends, diagnostic breakdowns and outcome reporting | Where is performance improving or slipping? |
| `settings` | Settings / الإعدادات | BznsBrain, channels, team permissions, catalogs/resources and rule configuration | How should the workspace behave? |

**Why these two additions:** operational work needs room for records, schedules and approvals; performance analysis needs periods, trends and trustworthy comparisons. Their interaction patterns and data refresh needs differ. This separation gives Customers a clear directory/history purpose and makes follow-ups easy to find within the daily work destination.

Do not add a seventh top-level Home, Follow-ups, Money or Automations tab. Use Work → Follow-ups for execution; Work record details for balances/costs; Insights for money reporting; Settings → BznsBrain for rules. Campaign-level delivery counts remain in Broadcasts, while cross-workflow business outcomes belong in Insights.

## Sector navigation contract

Each row defines the second primary destination. The other five destinations keep their names and positions. A sector label change must not rename stored sector IDs or break links.

| Sector | Work tab EN / AR | Default work surface | Work secondary views |
| --- | --- | --- | --- |
| [Real estate](real-estate.md) | Deals / الصفقات | Pipeline board | Board · Viewings · Properties · Follow-ups |
| [Dental clinics](dental.md) | Visits / الزيارات | Day schedule | Schedule · Visit list · Services · Follow-ups |
| [Medical clinics](clinic.md) | Visits / الزيارات | Reception queue | Queue · Schedule · Waiting list · Follow-ups |
| [Air conditioning](hvac.md) | Jobs / الأعمال | Dispatch schedule | Schedule · Job list · Assets · Follow-ups |
| [Construction](construction.md) | Projects / المشاريع | Project risk list | Projects · Milestones · Procurement · Follow-ups |
| [Cakes](cakes.md) | Cake orders / طلبات الكيك | Due-date production list | Orders · Production · Products · Follow-ups |
| [Coffee & dessert](cafe.md) | Orders / الطلبات | Live preparation queue | Queue · Order history · Menu · Follow-ups |
| [Restaurants](restaurant.md) | Orders / الطلبات | Kitchen fulfillment queue | Queue · Order history · Menu · Follow-ups |
| [Retail & e-commerce](retail.md) | Orders / الطلبات | Fulfillment list | Orders · Products & stock · Requests · Follow-ups |
| [Beauty & salons](beauty.md) | Bookings / الحجوزات | Staff day schedule | Schedule · Booking list · Services · Follow-ups |
| [Fitness & wellness](fitness.md) | Memberships / العضويات | Member action list | Members · Classes · Plans · Follow-ups |
| [Education & training](education.md) | Learning / التعليم | Cohort and session schedule | Schedule · Enrollments · Courses · Follow-ups |
| [Automotive](automotive.md) | Workshop / الورشة | Vehicle stage board | Board · Schedule · Parts · Follow-ups |
| [Logistics & delivery](logistics.md) | Shipments / الشحنات | Shipment exception list | Shipments · Dispatch · Exceptions · Follow-ups |
| [Travel & hospitality](travel.md) | Bookings / الحجوزات | Upcoming-trip readiness list | Bookings · Quotes · Suppliers · Follow-ups |
| [Events & weddings](events.md) | Events / المناسبات | Event countdown list | Events · Calendar · Vendors · Follow-ups |
| [Legal services](legal.md) | Engagements / الارتباطات | Administrative engagement list | Engagements · Consultations · Tasks · Follow-ups |
| [Finance & accounting](finance.md) | Engagements / الارتباطات | Period-work board | Board · Period calendar · Documents · Follow-ups |
| [Marketing & agencies](marketing.md) | Client work / أعمال العملاء | Deliverable approval board | Board · Calendar · Retainers · Follow-ups |
| [Media & production](media.md) | Productions / الإنتاج | Production stage board | Board · Shoot calendar · Resources · Follow-ups |
| [Technology & software](technology.md) | Projects / المشاريع | Delivery and support list | Projects · Support · Milestones · Follow-ups |
| [Manufacturing](manufacturing.md) | Production / التصنيع | Production-order schedule | Orders · RFQs · Quality · Follow-ups |
| [Cleaning & facilities](cleaning.md) | Site visits / زيارات المواقع | Crew and site schedule | Schedule · Sites · Contracts · Follow-ups |
| [Electronics and phone store](retail-tech.md) | Store & repairs / المتجر والصيانة | Repair and collection list | Repairs · Sales · Devices · Follow-ups |
| [Other services — explicit fallback](other.md) | Work / الأعمال | Confirmed service-work list | Work list · Schedule · Services · Follow-ups |

Secondary views are contextual navigation within Work, not independent app tabs. Use at most four visible views in this initial specification. Where existing capabilities need more detail—for example trade-ins, warranty or a project's cost ledger—place them inside the relevant record or an explicit action menu. Do not omit existing supported operations during implementation.

## Shared shell and visual hierarchy

Use the current dashboard's typography, colors, controls and spacing tokens. Extend its navigation and content slots rather than creating a different visual product for every industry. Sector identity comes from labels, work objects, fields, stages, layouts and KPI definitions.

On a wide desktop, use a labeled navigation sidebar and a broad main content area. If the current shell already uses another adequate labeled navigation pattern, reuse its components while giving all six destinations clear, stable positions. Keep workspace identity and user controls outside the six-tab count.

Page structure: breadcrumb where needed → title and one primary action → local view selector/filter bar → main content. Show secondary actions in a menu. Prefer clear status text plus a restrained status color; color alone must never convey approval, failure or lateness.

Density is task-dependent. Operational lists prioritize next action, owner, due time and blocker. Analytics prioritize period, value, unit, denominator and comparison. Avoid repeating a wall of KPI cards in each destination. A Needs attention strip in Work contains a few actionable exception counts and links; it does not duplicate the full Insights overview.

## Work and Follow-ups

Default Work surface is defined per sector: schedule for appointments/field visits, queue for food orders, stage board for production/repair, or list for engagements and shipments. Provide a list alternative for keyboard access, small screens and large datasets. Filtering, sorting and pagination are explicit; do not load every customer record to render a board.

A work row opens a preview drawer on desktop with essentials and an Open full record action. Full editing uses a record page with a clear title, status, owner, next action and audit history. On narrow screens a record is always a full page. Keep one canonical work record, one canonical customer and one canonical follow-up task behind every surface.

Follow-ups is a persistent secondary view with filters: Today, Overdue, Scheduled, Waiting on customer, Needs decision, Blocked/Failed and Completed. Each task shows its linked work/customer, reason, due time, owner, channel, mode and actual send state. Relevant actions are Open chat, Open work, inspect evidence, permitted pause/resume and reasoned snooze. Decision/approval actions appear only for genuine customer, professional or out-of-policy decisions; routine eligible jobs dispatch automatically. Completing a task must not fabricate a domain outcome. Configuration links open the corresponding rule in Settings → BznsBrain.

Unread badges belong to Chats. Actionable-task badges belong to Work/Follow-ups. Count unique tasks, and display the badge's meaning accessibly. An overdue follow-up and its linked late order are separate exception categories, not a single summed “problems” KPI.

## Insights composition

Overview: period/as-of controls and source-health indicator → four headline cards → one selected-metric trend or cohort chart → supporting diagnostic table. Card click opens the metric definition and population details with a clear **View records** action. Avoid making a card simultaneously change the selected chart and navigate away.

The diagnostic table uses the remaining four KPI rows in the sector file. It exposes value, comparison, unit, denominator/sample, coverage and action. Selected breakdown dimensions are sector-specific. Enable comparisons only when definitions, periods and coverage are compatible. Cohort and point-in-time measures retain their own semantics even if adjacent cards share the screen.

Drill-down opens Work with the exact eligible record population or a backend-supported metric query descriptor, plus a visible origin label and **Back to Insights**. Preserve metric version, period, segmentation and as-of context; do not silently replace historical membership with today's generic status filter. If the population cannot be reproduced exactly, show a truthful snapshot/detail report instead.

An operator without financial permissions can still see permitted operational measures. Hidden amounts are not serialized into the page, tooltip, export or drill-down response. Empty, incomplete, stale and unconnected data each gets its own state and a useful next action. Never fill missing integrations with convincing sample results in a real workspace.

## Customers, Chats and Broadcasts

The [lead-generation proposal](lead-generation.md#where-this-fits-in-the-existing-six-tabs) extends these same surfaces with acquisition context, opportunity progression, customer segments, campaigns and source-to-outcome reporting. It introduces no seventh tab; acquisition source and opportunity status remain linked to canonical customer/work records.

Status, queue enrollment and agent action history update from canonical events. Show next automatic action, due time, source freshness, waiting party and the exact blocker in each record. Follow the automation contract for subscription/polling labels, proposed latency targets, receipt states and failure recovery. A status edit does not itself prove a customer received an update.

Customers is a directory with customer profile, communication history, preferences and linked work. It may display that customer's current tasks and verified outstanding balance if authorized. These are filtered views of existing records, not copies of the entire Work or Insights dashboard.

Chats offers enough context to respond: active work, verified status, owner, next task and an Open work action. Quick actions use the same domain operations as full editing and return a persisted result. Keep draft replies when navigating to a linked work record and back.

Broadcasts retains its campaign workflow and operational sending evidence. Campaign recipient lists and customer preferences use the existing authority. A delivery receipt does not increase an industry conversion KPI until a linked business outcome exists.

## Responsive, Arabic and accessible behavior

At 1440 px, show the labeled navigation and content side by side; use four KPI cards in a row only if labels and values remain legible. At 768 px, prefer a two-column card grid and a collapsible navigation drawer. At 320 px, use one-column cards, record lists and full-page details. The accessible menu exposes all six destinations in order; avoid six cramped bottom buttons or hiding Insights behind an ambiguous More item.

Navigation uses real links with current-page semantics. Secondary views retain their selected state in navigation state. Drawers restore focus to their opener; dialogs trap focus and have a close action. Provide keyboard alternatives to board dragging and schedule pointer actions. Keep targets comfortably touchable, labels visible and failure text associated with its control.

Arabic uses the translated labels above and mirrors layout with logical start/end spacing. Keep dates, numeric amounts, identifiers and mixed-language strings readable using appropriate direction handling. Translation must cover states, actions, empty/error screens and metric definitions, not only navigation labels.

## Engineering boundaries and migration plan

Use the existing React Router/static app, API and Convex domains. Do not add a service or duplicate database model to create two navigation destinations. Introduce a shared navigation descriptor and sector-specific presentation configuration: stable Work label, default surface, views, allowed actions, field definitions and metric IDs.

Target read/write path: route → existing page shell → authenticated API/Convex wrapper → sector domain adapter → canonical records. Domain authorization remains authoritative. Navigation visibility alone grants nothing. Preview/pending packs remain synthetic or unavailable according to existing gates; changing a label cannot enable an industry for real data.

Define deep links for destination, secondary view, record, filters and Insights origin using the existing route convention during implementation. Do not encode customer names, medical/legal details or arbitrary unvalidated expressions in URLs. Resolve record IDs within the authenticated tenant. Preserve supported older customer-work deep links through an explicit compatibility mapping, not silent loss of context.

Persist business data on the server; URL/session state stores only appropriate presentation state. Preserve list filters, sort, scroll position, chart selection and return context across record navigation. Query only the active destination; cache tenant-scoped reads with explicit freshness. Opening Insights must not block answering a chat. Invalidations follow successful mutations, and stale analytics are labeled while reconciliation runs.

Implementation sequence: add the six-destination shell under an Ascend-specific rollout control → move Work/Follow-ups entry points while retaining shared records → create Insights presentation on verified measures → migrate contextual links → exercise one sector → expand adapters. Keep Catalyst's four-tab product behavior intact. Maintain a compatibility path for legacy links and a reversible presentation switch; rollback must not delete records or run old and new follow-up schedulers simultaneously.

## Acceptance criteria

These are implementation requirements, not executed UI tests for this documentation change.

1. Each sector exposes the six defined primary destinations, with the right Work EN/AR label and no retail fallback for pending sectors.
2. Work records, Follow-ups, Chats and customer profiles resolve to the same IDs; updates appear consistently and never create duplicate tasks.
3. Insights drill-down reproduces its population and Back restores period, metric, segments and scroll; authorization applies at every hop.
4. Direct links, back/forward, reload, denied access, session expiry and sector switching have defined behavior; no draft loss without an explicit warning.
5. Desktop, tablet and narrow EN/AR layouts pass keyboard, focus, overflow and long-label checks. Board and schedule actions have accessible alternatives.
6. Pending integrations and low-coverage data show honest states. Financial restrictions survive exports, tooltips and URL manipulation.
7. Existing sector operations remain reachable after relocation. Six-tab navigation changes do not enable a pending pack, alter a business's industry or introduce sends.
8. Test follow-up behavior with fake time and simulated transport, following the existing automated-only requirement.

[Sector index](README.md) · [Measurement and follow-up contract](measurement-contract.md)
