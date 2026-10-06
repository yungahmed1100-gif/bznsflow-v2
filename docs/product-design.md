# Authenticated product design

This surface is for operating an existing business. The public marketing site remains governed by `DESIGN.md`; its typography scale and conversion hierarchy do not apply to daily operational work.

## Design contract

Retain cream `#F6EFDF`, near-black `#1A1A1A`, Poppins and IBM Plex Sans Arabic, the existing icons and restrained status annotations. Product headings are 22–28px, controls at least 44px high, and supporting text remains readable. `src/styles/product.css` owns the working density and shared sidebar, actions, metrics, states and forms. Structural rules replace competing decorative cards. Reduced motion is respected.

The first viewport identifies the workspace and current task, then gives a primary action and work requiring attention. Desktop navigation has labels alongside icons. Mobile opens the same destinations in a native modal, with Escape, focus trapping and focus restoration. URL state remains the authority for sections and selected records. Real-estate deal/stage links and automotive work filters survive reload and browser back.

## Workspaces

| Surface | Primary work |
| --- | --- |
| Catalyst | Conversation list, human-attention queue, retained customer message, captured context, handling state and connection status |
| Retail | Orders needing fulfilment, variant shortages, requests and recorded sales |
| Electronics | Device identity, repairs, warranty, stock and collection |
| Dental | Captured inquiries, visits and outstanding reception work; clinical text retention remains enforced |
| Real estate | Tasks, opportunities, qualification, viewings/offers, stage pipeline and commission records |
| Construction | Schedule exceptions, projects, variations, procurement, certified receivables and retention |
| Automotive | Approval queue, promised work, parts and collection |
| Ahmed admin | Real business, product access, separate setup paths and six labelled read-only sample workspaces |

Figures link to their operational records. Missing values display unavailable, never an invented zero. Monetary definitions and minor-unit calculations remain domain-owned. Lists stack with labels on phones; genuinely two-dimensional pipeline data scrolls inside its own region.

## Setup and information

`/catalyst/setup` and `/ascend/setup` (and `/en` counterparts) share an account while storing independent progress. Legacy `/layla/setup` enters Catalyst. Ascend requires a live sector and operational review, never a messaging connection. Catalyst owns approved facts, behavior, inbox handoffs, connections and answer readiness. Saving chatbot facts does not clear the operational sector.

Add information follows source → extraction → review/mapping → validation → publication → result. Knowledge drafts and revisions never create operational records. Operational entry uses existing reviewed importer contracts. Files are parsed sequentially in cancellable browser workers with on-demand parser imports; original uploads are not retained. Page/sheet/row references and partial-extraction warnings stay visible. Published question/answer mappings are the deterministic retrieval contract; longer source material remains review evidence until mapped. Prices use the existing approved catalog workflow.

## Human handoffs

Take over fences automated replies. Resolve closes the queue item while Layla stays paused. Return to Layla permits future eligible messages without replaying cancelled work. The queue keeps escalation reason, retained last customer text, captured details and handling state. No staff email/WhatsApp notifications are added. Opt-outs, reply windows, employee permissions and tenant ownership remain server-enforced.

## Failure and recovery

Loading and empty states describe the actual data boundary. Permission failures stay distinct from missing data. Conflicting edits require reloading the current version; retries reuse durable identities. Parsing failures retain reviewable partial content and offer explicit retry. Approved revisions stay authoritative until replacement is published. Original theme and public pages remain unchanged outside setup-link destinations.

## Release boundary

The candidate requires Ahmed’s acceptance before additive Convex deployment and production promotion. Keep the prior Vercel build as rollback; additive optional fields/tables remain compatible with that build. Do not restore Supabase writes. Local wrappers and synthetic browser fixtures establish implementation evidence, not real Meta provider eligibility or delivery. See `product-redesign-verification.md` for measured evidence and outstanding release gates.
