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

`/catalyst/setup` (and `/en/catalyst/setup`) is the only setup page; `/layla/setup` redirects to it (vercel.json). Ascend has no setup page: its sector, imports, VAT, stock policy and team are set inside the Ascend dashboard (Settings → Business and Accounts, Stock, Team), and `/ascend/setup` redirects there. Ascend never requires a messaging connection. Ascend is on hold (2026-10-08, Catalyst first): pricing offers no Ascend entry, and one known gap waits for it. A business whose sign-up sector is not a live pack has no dashboard control to pick a live one (Today points to Settings → Business, which shows the picker only once a pack is set). Catalyst owns approved facts, behavior, inbox handoffs, connections and answer readiness. Saving chatbot facts does not clear the operational sector.

### Catalyst BznsBrain (2026-10-08)

Catalyst's knowledge lives in Settings › **BznsBrain** (views: BznsBrain, Channels; the four main tabs are unchanged). It has two data-entry tabs and one Publish:

- **bzns.md**: the business's description, information and policies, including the required team contact. No prices, no FAQ section, no tone or handoff (BznsBrain's template, `brainTemplate`).
- **Catalog**: every service and product with its price or "quote on request". Edits to a published entry are staged in `pending` until Publish, so Layla keeps quoting the published value (`convex/blueCatalogState.js`).
- **Layla's behaviour** (validated settings, `config/layla-behaviour.js`, `blueReviewSessions.behaviour`): tone, ask the name, the details to ask for, appointment preferences, a handoff note. Accounts without saved settings read tone and handoff from their published bzns.md. A save takes effect immediately and fences queued replies.
- **Needs your review** (`brainProposals`, `convex/brainState.js`):
  - Qwen extraction suggestions from a file, website or pasted text (`config/brain-extract.js`). Every suggestion quotes evidence that must appear in the source; money is allowed only in catalog suggestions; instruction-like text is quarantined until the owner rewrites it.
  - Old published Q&A answers to merge into bzns.md. They stay live until merged and published, or dismissed; they are retired, never deleted.
  - Customer questions the data did not cover. These are counted and deduplicated; health questions are not stored.
  - Accepting a suggestion writes a draft only.
- **Test Layla**: a side panel. It uses the live context builder (`loadTurnSources` / `composeTurnContext` in `convex/laylaTurn.js`) and the live question planner on a simulated customer, for either the Draft or the Published version. It shows sources, captured details and a short reason. Nothing is sent or stored, apart from the existing last-preview record.

Setup reuses these parts: industry → information → review → behaviour → test and publish, then saving to an account (which moves pre-sign-in catalog rows to the account), then connecting and activating a channel. The dashboard no longer sends a signed-in Catalyst account back to setup when no channel is connected.

**Ascend** keeps its own prompt, qualification and Business/Services screens (BznsEditor, CatalogManager, AddInformation). BznsBrain mode applies only when the account's plan is not Ascend (`turnMode`).

**Dental reception flow** (BznsBrain mode, `flow: 'reception'`):
- One detail per turn, in this order: name, then service, then the preferred time once the customer wants to come in.
- A WhatsApp display name is not treated as a confirmed name. A declined name is remembered, and corrections replace earlier values.
- A service links to its catalog entry (`ref`).
- A person request or a health question holds back any question that turn.
- Once nothing is left to ask, the appointment request is recorded on the contact for reception (Customers › Appointment requests). Layla gives the team contact and stays on the chat. A reply that implies a confirmed booking is refused.

## Human handoffs

Take over fences automated replies. Resolve closes the queue item while Layla stays paused. Return to Layla permits future eligible messages without replaying cancelled work. The queue keeps escalation reason, retained last customer text, captured details and handling state. No staff email/WhatsApp notifications are added. Opt-outs, reply windows, employee permissions and tenant ownership remain server-enforced.

## Failure and recovery

Loading and empty states describe the actual data boundary. Permission failures stay distinct from missing data. Conflicting edits require reloading the current version; retries reuse durable identities. Parsing failures retain reviewable partial content and offer explicit retry. Approved revisions stay authoritative until replacement is published. Original theme and public pages remain unchanged outside setup-link destinations.

## Release boundary

The candidate requires Ahmed’s acceptance before additive Convex deployment and production promotion. Keep the prior Vercel build as rollback; additive optional fields/tables remain compatible with that build. Do not restore Supabase writes. Local wrappers and synthetic browser fixtures establish implementation evidence, not real Meta provider eligibility or delivery. See `product-redesign-verification.md` for measured evidence and outstanding release gates.
