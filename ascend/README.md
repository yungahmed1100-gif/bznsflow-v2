# Ascend sector dashboards

**Implementation entry point:** [agent build queue and 25 sector engineering files](implementation/README.md). Start with the [shared foundation](implementation/shared-foundation.md), [engineering pack](implementation/engineering-pack.md) and [execution/test runbook](implementation/agent-runbook.md). The product specifications below remain the detailed dashboard requirements.

Prepared 2026-10-10. **25 separate specifications: 24 named sectors plus Other.** Each defines industry needs, workflow/data, four headline cards, supporting KPI formulas, six-tab behavior, Layla/Hasib responsibilities, minimum human input, lifecycle guards, event-level follow-ups and automated acceptance requirements.

These are implementation drafts based on the current Catalyst/Ascend setup and cited industry research. They do not add live dashboard features. All use **six primary destinations: Chats · Work · Customers · Broadcasts · Insights · Settings**. Work uses each sector's language, such as Productions, Visits or Workshop, and contains the daily workflow and Follow-ups. Insights contains KPI reporting. Customers stays focused on customer identity and history.

This revised direction supersedes the earlier four-tab Ascend layout. Start with the [six-tab dashboard design](dashboard-design.md) for page layouts, EN/AR navigation, responsive behavior and engineering requirements.

Start with the [automation-first operating contract](automation-contract.md), then the [measurement and follow-up contract](measurement-contract.md). Routine policy-compliant work is designed to execute automatically; humans capture unavailable physical/professional facts and resolve specific exceptions. The current build does not yet implement all of these requirements. The [research register](research-sources.md) distinguishes public benchmarks from averages, standards and guidance. Sector files contain direct source links.

## Sector files

Source status comes from [the operations pack registry](../config/hasib-packs.js), checked 2026-10-10: **6 enabled, 9 preview, 10 pending**. “Enabled” translates the registry's `live` flag; it does not certify every KPI or automation below for production. Clinic remains governance-gated. Catalyst starter coverage is a separate inventory.

| Sector | Current source status | Four proposed headline KPIs |
| --- | --- | --- |
| [Real estate](real-estate.md) | Enabled | Qualified-to-viewing conversion; Viewing attendance; Unanswered qualified inquiries; Commission overdue |
| [Dental clinics](dental.md) | Enabled | Visit attendance; Missed visits; Administrative follow-ups due; Overdue visit balances |
| [Medical clinics](clinic.md) | Preview; governance-gated | Attendance; Unconfirmed upcoming visits; Median reception wait; Waiting-list fill rate |
| [Air conditioning](hvac.md) | Preview | On-time arrival; First-time fix; Maintenance due; Job contribution |
| [Construction](construction.md) | Enabled | Milestones on time; Unapproved variation exposure; Overdue certified receivables; Forecast gross contribution |
| [Cakes](cakes.md) | Preview | Ready on time; Unapproved designs due soon; Deposits outstanding; Waste cost |
| [Coffee & dessert](cafe.md) | Preview | Order-ready time; Ready within promise; Remake and spoilage cost; Menu contribution |
| [Restaurants](restaurant.md) | Preview | On-time fulfillment; Order contribution; Recorded food waste cost; Problem-order rate |
| [Retail & e-commerce](retail.md) | Enabled | On-time fulfillment; Stock held beyond age limit; Order gross margin; Unfilled product requests |
| [Beauty & salons](beauty.md) | Preview | Attended utilization; No-show rate; Realized repeat visits; Service contribution |
| [Fitness & wellness](fitness.md) | Preview | Trial-to-member conversion; Membership renewal; Members with attendance gap; Class attended occupancy |
| [Education & training](education.md) | Preview | Inquiry-to-enrollment conversion; Learner attendance; Course completion; Fees overdue |
| [Automotive](automotive.md) | Enabled | Vehicles past promise; Estimates awaiting approval; First-time repair success; Work-order contribution |
| [Logistics & delivery](logistics.md) | Pending | On-time in-full delivery; First-attempt delivery; Unresolved exceptions; Contribution per shipment |
| [Travel & hospitality](travel.md) | Pending | Quote-to-confirmed booking; Awaiting supplier confirmation; Booking contribution; Upcoming balances due |
| [Events & weddings](events.md) | Pending | Event readiness; Overdue client/vendor decisions; Confirmed-event conversion; Forecast event contribution |
| [Legal services](legal.md) | Pending | Intake response SLA; Consultation-to-engagement conversion; Administrative blockers overdue; Approved receivables overdue |
| [Finance & accounting](finance.md) | Pending | On-time engagement delivery; Document readiness; Work awaiting review; Engagement contribution |
| [Marketing & agencies](marketing.md) | Pending | On-time accepted deliverables; Client approval backlog; Engagement contribution; Retainer renewal |
| [Media & production](media.md) | Pending | On-time final delivery; Approval wait; Revision overrun; Project contribution |
| [Technology & software](technology.md) | Pending | Accepted milestones on time; Support SLA attainment; Client-blocked work; Project/contract contribution |
| [Manufacturing](manufacturing.md) | Pending | On-time in-full orders; First-pass yield; Production orders past due; Order contribution |
| [Cleaning & facilities](cleaning.md) | Preview | On-time completed visits; First-pass inspection acceptance; Open quality exceptions; Visit contribution |
| [Electronics and phone store](retail-tech.md) | Enabled | Overdue repairs; Device contribution; Aged serialized stock; Repair-ready turnaround |
| [Other services — explicit fallback](other.md) | Pending | Qualified-to-accepted conversion; Work completed on time; Overdue actions; Approved balances overdue |

## How to use the files

For the next acquisition layer, read the [sector lead-generation implementation proposal](lead-generation.md) and [lead-generation evidence register](lead-generation-evidence.md). Every sector file now includes a **Lead generation and acquisition** section covering acquisition routes, offer, fit/readiness, verified conversion, automatic journey, repeat/referral loop, acquisition KPIs and a first controlled experiment. Evidence distinguishes higher-performing cohorts from surveys, vendor cases and guidance; it does not claim a verified Omani top-performer benchmark for every sector.

Each file is a standalone sector brief with a shared implementation contract. Its first four metrics are the Insights overview cards; the other four rows form the supporting diagnostic table. Each file now defines all six tab responsibilities, the sector Work layout, record fields, quick filters and Insights breakdowns. Some rows contain paired measures, so the **200 KPI definition rows** are not a claim of 200 already-built widgets.

Data markers: **D** = derive/reconcile from existing records, **N** = new capture/model, **I** = integration/import needed. All proposed metrics need implementation/reconciliation, even where an existing similarly named card is available.

Benchmark evidence is strongest where public dated cohorts or measurement standards exist. It is uneven across industries. This set does not invent best-in-class thresholds or claim every proposed practice is causally proven. Local targets require a reliable baseline, a matching denominator and owner review.

## Automation detail in every sector

Each sector now includes a current configured module/variant/extra-field/expense inventory, one-time policy setup, source capture and provenance, separate Layla/Hasib duties, minimal staff fact-entry requirements, guarded lifecycle and parallel states, **eight primary event rules**, **four additional workflow/control areas**, full six-tab interactions, queue/record fields, live-status truth and freshness, exceptions/recovery and eight additional automated acceptance scenarios. Optional subtype workflows are explicitly scoped, including hospitality/PMS behavior in Travel.

The shared contract defines **16 cadence profiles**, durable enrollment/deduplication, dispatch rechecks, customer reply handling, cancellation/rescheduling, contact caps, quiet hours, bounded retries, ambiguous-send reconciliation, takeover, stale sources, role isolation and automation-quality metrics. These are build requirements; cadence/latency numbers are proposed defaults, not industry benchmarks or measured performance.

For the motivating repair example, see [Electronics and phone store](retail-tech.md): verified intake → diagnosis/estimate → customer authorization → parts/repair → tested ready → collection drives automatic updates and follow-ups. Its current code still uses polling and manual follow-up tasks; the file identifies the missing automatic event/transport layer.

## Current build findings that affect implementation

- Dental visits are orders while several shared attendance metrics read bookings. Reconcile the data path before publishing dental rates.
- Booked hours are not utilization without available capacity; extra return visits are not cohort retention.
- Period sales divided by period baking is not exact batch sell-through without batch allocation.
- Generic manual follow-ups currently create tasks; they are not a general scheduled sending engine.
- Pending sectors need explicit adapters and labels. Media and Other must not inherit retail controls.
- External advertising, engineering, hotel, carrier and manufacturing metrics require the named authoritative source. Conversation data alone is insufficient.
- Cost completeness, recorded profit, forecast contribution, payment receipts and cash collected must remain distinct.
- Existing bounded scans need completeness checks for large histories.

These are source-inspection findings and requirements, not a fresh production audit. See the [product plan](../docs/ascend-product-plan-2026-10-10.md) and [local draft notes](../docs/ascend-local-draft-2026-10-10.md) for the earlier draft.

## Scope and verification

This deliverable is the documentation set in this folder. The original product/research layer has **32 Markdown files**. The engineering extension adds **25 sector implementation files, four shared build documents and ascend/AGENTS.md: 62 Markdown files total**. It does not modify runtime behavior or deploy changes.

Structural verification checks exact coverage of `BUSINESS_INDUSTRIES`, registry-status alignment, six navigation destinations per sector, eight unchanged KPI rows, three preserved follow-up scenarios, eight primary event rules, four additional workflow/control areas, per-sector roles/source/lifecycle/live-status/exception/acceptance sections, preserved research URLs and local link/anchor resolution. Sector acceptance scenarios describe future automated implementation tests; they are not reported as executed here.

Automation expansion verification on 2026-10-10, before the lead-generation extension: **30 Markdown files; all 25 sectors covered; six primary destinations per sector; 200 primary event rules; 100 additional workflow/control areas; 16 shared cadence profiles; 200 additional automated acceptance cases; 465 local links/anchors resolved.** All 200 KPI definition rows and existing research URLs were unchanged; all 75 original follow-up scenarios were retained, with the electronics quote wording aligned to standing policy. Current configured modules, variants, extra fields and expense-category IDs were represented for every sector. Registry alignment was 6 enabled, 9 preview and 10 pending, including the clinic governance qualifier. Documentation structure, table consistency and preservation checks passed.

These results validate the documentation, not application behavior. The sector automation scenarios have not been executed against an implemented scheduler by this edit; runtime files, production and outbound messaging remain unchanged by this documentation task.

Lead-generation extension verification on 2026-10-10: **32 Markdown files; 25 sector acquisition sections; 22 classified evidence references; 662 local links/anchors resolved.** Six-tab navigation, table consistency, all 200 operational event rows, all 200 original KPI rows and the sector files' original research URLs were preserved. These are proposal/documentation checks, not executed campaign experiments or application lead-generation tests. No campaigns, sends, spending, runtime implementation or deployment were performed.

Agent build-pack verification on 2026-10-10: **62 Markdown files; 25 sector implementation files; 1,046 local links/anchors resolved; 86 source-file links verified.** Exact coverage of the current 25-ID business-industry registry and all 6 enabled / 9 preview / 10 pending statuses passed. Each build file contains 8 event requirements, 8 KPI requirements and 9 ordered build steps: 200 event requirements, 200 KPI mappings and 225 sector steps. Markdown table checks and all referenced existing regression-test paths passed. All 25 original sector files were preserved byte-for-byte apart from the added implementation link; shared product, automation, measurement and research documents were unchanged.

The engineering pack specifies eight shared foundation tasks, typed data/API/auth contracts, automation recovery, source adapters, six-tab integration, synthetic journeys, load/recovery targets and release gaps. All build tasks remain not started. Hash checks confirmed all 578 inspected files under src, convex, config, api and tests were unchanged, as was the pre-existing tracked diff. These are documentation and source-reference checks; no new application behavior was implemented, no runtime suite was claimed as run, and nothing was deployed or sent.
