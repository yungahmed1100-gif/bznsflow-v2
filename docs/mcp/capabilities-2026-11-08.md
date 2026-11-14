# MCP function inventory — 8 November 2026

Computed from `config/mcp/contracts.js`, its Hasib policy/contracts and the current plan capability matrix. This is a source inventory, not the tool list of an authenticated production account. MCP `tools/list` is authoritative for the current token; it is paginated at 60 tools per page. Execution rechecks current access and domain/provider prerequisites.

## Registry

407 dispositions: **361 executable adapters**, **22 website handoffs**, **24 unavailable operations**. Handoffs return a supported website path; they do not perform provider onboarding, credential entry or document selection.

| Area | Adapters | Handoffs | Unavailable | Functions covered |
| --- | ---: | ---: | ---: | --- |
| BznsBrain | 7 | 0 | 0 | Review proposals, accept/dismiss, behaviour, progress, Test Layla, publish |
| Business | 5 | 0 | 0 | Business profile/document, drafts/publication and setup progress |
| Catalog | 9 | 0 | 0 | List/match/summary, drafts, staged edits, approvals, archive and publication |
| Dashboard | 22 | 2 | 0 | Conversations, handoffs, customers, timezone, templates, campaigns and exports; media selection stays on the website |
| Files | 3 | 1 | 0 | Bounded CSV contacts transfer/import and protected transfer reads; other files use the website |
| Hasib | 298 | 2 | 24 | Sector operations, records, stock/orders/jobs/visits/deals, Adiba, money/insights, team and settings; subject to live sector and plan gates |
| Instagram | 0 | 2 | 0 | Explicit website connection/disconnection flow |
| Knowledge | 8 | 0 | 0 | List/open sources and drafts, save answers, publish/archive/cancel |
| Messaging | 8 | 0 | 0 | State/provider inspection, activation, pause/disconnect, takeover/resume and manual replies |
| Onboarding | 0 | 2 | 0 | Website setup handoff |
| Request status | 1 | 0 | 0 | Durable execution and external-effect outcomes |
| Channel setup | 0 | 13 | 0 | Explicit website/provider steps |

Useful first calls: `bznsflow_business_state`, `bznsflow_brain_state`, `bznsflow_catalog_list`, `bznsflow_messaging_state`, `bznsflow_dashboard_overview`. Check asynchronous outcomes with `bznsflow_requests_status`. Important actions require approval by default; retry the same arguments and request ID after approval. Queued/submitted does not mean delivered.

## Conditional discovery counts

These examples assume a manager, every permission area granted, the relevant Hasib pack enabled, and no further deployment feature restriction. The read/write total **includes** read tools and handoffs. Narrower grants and token scopes reduce it. A tool's presence does not certify live provider readiness or commercial availability.

| Plan / sector | Read token | Read/write token |
| --- | ---: | ---: |
| Catalyst / general | 43 | 81 |
| Ascend or Apex / retail | 62 | 130 |
| Ascend or Apex / retail-tech | 66 | 139 |
| Ascend or Apex / real estate | 73 | 152 |
| Ascend or Apex / construction | 77 | 169 |
| Ascend or Apex / automotive | 76 | 168 |
| Ascend or Apex / media | 67 | 152 |
| Ascend or Apex / fitness | 73 | 160 |
| Ascend or Apex / dental | 70 | 151 |
| Ascend or Apex / HVAC | 69 | 150 |

Employees cannot create an owner MCP connection. Arbitrary SQL, arbitrary code execution, unrestricted URL fetching, platform administration and credential management are not exposed as tools. Existing tenant, plan, consent, provider and record-version checks remain authoritative.
