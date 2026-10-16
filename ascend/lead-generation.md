# Ascend sector lead-generation system

Prepared 2026-10-10 · Evidence-informed implementation proposal · No campaign, send or deployment authorized by this document

## Recommendation and scope

Keep the completed Catalyst inquiry-handling foundation. Add a shared acquisition and conversion engine with 25 sector configurations inside Ascend's existing six destinations. Its outcome is a verified, economically useful new customer and a relevant repeat relationship—not a larger list of contacts.

Three related loops need different measurement:
1. **Acquire:** bring suitable new demand through discoverable service/product pages, search/social campaigns, relevant partners, referrals and permitted B2B prospecting.
2. **Convert:** Layla captures context and guides the customer to a valid next action; Hasib confirms capacity, scope, obligations and actual outcomes.
3. **Retain and refer:** actual service/purchase events trigger relevant, permitted return/referral journeys. Existing customers are not counted as newly acquired customers again.

Automating replies to existing inbound messages improves conversion; it does not by itself generate new demand. Each activated sector needs an approved offer, credible proof, distribution channel, usable destination, capacity, outcome tracking and controlled economics.

This proposal applies the existing [automation-first contract](automation-contract.md). Routine work executes within standing policy. Humans provide unavailable physical/professional facts, configure commercial authority and resolve exceptional decisions. No universal sales or autonomy percentage is promised.

## What the current build supplies and what is missing

Read-only source inspection on 2026-10-10, not a fresh production certification:

| Area | Existing foundation | Ascend addition |
| --- | --- | --- |
| Intake | [Qualification packs](../config/layla-qualification.js) define sector questions, bounded extraction, ask limits and completeness status | Versioned acquisition/fit definitions, opportunity identity, explicit next commercial action and outcome |
| Customer records | [Contact schema](../convex/schema.ts) stores channel, inbound/manual/import source, fields, consent and opt-out | Campaign/offer/touchpoint provenance, partner/referral reference and evidence-based attribution; source type alone is not attribution |
| Qualification | Current helper returns qualified when required fields have values | Separate intake completeness from service fit, intent, readiness, availability and professional gates |
| Electronics | Calling qualificationPack with retail-tech selects Other; sector-label routing uses the broader industry list | Explicit repair/buy/trade-in qualification and reconciliation with the account's actual sector; do not mutate account industry from a preview selector |
| Conversations | Existing Layla handling, source-backed responses and takeover | Acquire-to-opportunity links, acquisition-specific questions and outcome-driven next actions |
| Sending | [Campaign executor](../convex/blueCampaignState.js) and [worker](../api/_lib/layla/campaign-worker.js) already provide broadcast execution foundations | Reuse verified transport gates; implement per-opportunity event enrollment and cancellation rather than a second conflicting sender |
| Operations | Existing Hasib records and sector adapters, including real-estate opportunities | Sector-specific conversion events linked to canonical booking/order/project records; do not replace an existing opportunity with a duplicate CRM |
| Follow-ups | Generic [follow-up tasks](../convex/hasib/followupsState.js) are manual | Durable automatic acquisition sequences with source/consent checks, stops and receipts |
| Website analytics | [Marketing-site events](../src/lib/analytics.js) send browser Meta events; calendar CTA clicks map to Schedule; the code describes CAPI as future | Tenant-owned source/outcome ledger and approved destination exports. For Ascend, a CTA click must never be counted as a confirmed appointment |
| Attribution/spend | The inspected contacts and related paths do not establish a cross-sector source-to-paid-outcome ledger or spend reconciliation | Ingest supported source identifiers, campaign costs, outcomes/corrections and reporting coverage |

Do not reuse BznsFlow's own marketing pixel for client acquisition accounts. Tenant channel, ad-account, data and credential boundaries are separate. Preserve Catalyst's existing scope and behavior while adding Ascend capabilities behind its own access/rollout gates.

## Evidence worth applying

- **Trades:** prioritize inquiry-to-booking, usable estimate options and recurring relationships. ServiceTitan explicitly compares higher-revenue cohorts, but its findings are observational. [L01](lead-generation-evidence.md#l01)
- **Beauty:** judge retention by completed returns and cancellations, not the number of future bookings. [L02](lead-generation-evidence.md#l02)
- **Professional services:** test a specific niche, credible expertise and useful educational proof. [L03](lead-generation-evidence.md#l03)
- **Legal:** combine relationship referrals with usable digital intake. [L04](lead-generation-evidence.md#l04)
- **Food/hospitality:** connect discovery to a short, real booking/order path and first-party customer history. Use GCC-adjacent evidence where available without treating it as an Oman benchmark. [L10](lead-generation-evidence.md#l10)
- **Measurement:** optimize supported channels for defined downstream outcomes, with source-specific eligibility rather than exporting every customer event. [P02](lead-generation-evidence.md#p02), [P03](lead-generation-evidence.md#p03)

The evidence register separates higher-performing comparisons, surveys, cases and guidance. Practices below are BznsFlow implementation recommendations; they are not claims that every sector has a verified top-decile playbook.

## Acquisition surfaces and offers

Each sector needs one initial buying situation, one offer and one next action. Start with one strong acquisition channel plus a referral/return loop; add channels when measurement and capacity are reliable.

**Local intent:** accurate business/service pages and eligible local listings, honest hours/service areas, useful proof, visible terms and a booking/quote/order CTA. Search ads can link directly to that specific intent. Do not promise ranking or run ads for unavailable services. [P01](lead-generation-evidence.md#p01)

**Visual/discovery demand:** approved portfolio, product or service content with a direct route to a matching offer. Reuse verified assets/claims; test creative variations without inventing customer testimonials. A comment/like is not consent to an unrelated outbound campaign.

**Partners/referrals:** give an existing customer or partner a trackable share link/code. The referred person submits their own details or initiates a permitted conversation. Do not upload friends' phone books. Record introducer attribution independently of ad attribution; any reward follows approved eligibility and real outcome evidence.

**B2B account acquisition:** where relevant, research permitted public company facts, service territory and buying signals; deduplicate against existing accounts and exclusions. Sources need provenance/freshness. Route permitted outreach through specifically authorized email/platform workflows. Finding a public number or profile does not authorize a cold WhatsApp sequence. Voice, dialers, email sending and external prospecting connectors are separate capabilities to implement and verify.

**Destination:** a short sector page/form or a context-bearing entry into Layla. Carry a supported signed source token or provider metadata into intake. A copied tracking code is only evidence of that link, not proof of a paid click. Retain unattributed traffic honestly. Sensitive details stay out of URLs, analytics tags and initial ad forms.

A campaign definition stores business/sector, buying situation, offer/version, audience purpose, proof references, creative/version, destination, budget/currency, active dates, service capacity, primary outcome, reporting window, allowed channels and stop criteria. Broad marketing intent is not unlimited agent authority.

## Qualification and routing

Do not replace current field completeness with a mysterious AI score. Expose separate dimensions:

| Dimension | Source and use |
| --- | --- |
| Intake complete | Required facts captured and validated; preserve current semantics for compatibility |
| Service fit | Offered service/product, supported area, capacity, prerequisites and commercial scope from configured rules |
| Intent | Explicit customer action such as requesting a quote or choosing a slot; keep inferred intent labeled |
| Readiness | Available date, requested timeline, necessary decision/approval and required source information |
| Economics | Permitted margin/cost limits for offers, not invented customer wealth or an uncalibrated probability |
| Authority/eligibility | Consent, valid recipient, professional gates, customer identity and action permissions |

Use explainable priority bands with recorded reasons: ready for the next supported action; missing customer information; waiting on a source/resource; longer-term permitted nurture; out of scope; closed. Low priority does not mean ignored. Any future numerical probability requires calibrated historical outcomes, evaluation and drift monitoring.

Ask only the next essential missing question. A café order does not need a project-style budget interview. Professional/sensitive intake must retain its bounded fields and access controls. No protected-trait, health-condition or financial-distress targeting to improve lead value.

Assign automatically by actual service, territory, resource/skill and current workload. Route routine booking/quote/order work to tools, not a human merely because intake became complete. Create a human exception only when a required real-world/professional decision or policy gap exists.

## Logical records and events

Reuse the current stack and domain objects. These are logical models to map during design, not migration instructions:

- **Acquisition source/offer:** tenant, external channel/account/campaign/ad/form or partner ID, signed link where applicable, offer/creative version, timestamps and spend source.
- **Touchpoint:** contact/opportunity, source evidence, observed time, ingestion time, attribution quality and permission scope. Preserve immutable first touch; record later touches independently.
- **Opportunity:** customer/account, buying intent, sector adapter, stage, fit/readiness reasons, accepted scope/version, next action, lifecycle ID, related canonical work and loss/nurture reason. One customer may have multiple genuinely separate opportunities.
- **Conversion/outcome:** stable event ID, verified event type/time, canonical booking/order/project reference, currency/value basis and reversals. Booking, attendance, accepted quote, deposit, fulfillment and payment are distinct.
- **Acquisition enrollment:** rule/version, trigger, due/expiry, next step and shared contact cap; link to the existing automation outbox rather than creating an isolated queue.
- **Spend/experiment:** campaign/day cost with currency/timezone, test assignment, exposure, mature outcomes, allocation authority and decision log.

General lifecycle: new → engaged → fit-qualified → sector next action → won/lost; waiting/nurture are explicit branches. Adapt stages per sector; direct commerce can skip appointment/proposal stages. “Won” uses that sector's verified acceptance rule, while fulfilled/paid remain separate outcome events.

At ingest validate tenant/webhook origin, signature or public-form binding, source ID and schema. Deduplicate provider events and contact identities conservatively. Reject cross-tenant IDs; unknown/ambiguous identity does not auto-merge. Apply spam/rate controls before model spend. Commit state/outbox durably, reconcile worker retries and recheck current eligibility before side effects.

Record quote revisions, cancellation, refunds, returns, lost reasons and invalid contacts. Correct prior reporting/exports through explicit supported adjustment flows; never create a fake new sale to compensate for a lost webhook. An external provider timeout requires reconciliation before retrying a possible purchase, booking or send.

## Automation across the journey

| Trigger | Layla / Hasib behavior | Important stop |
| --- | --- | --- |
| New eligible inquiry | Record source, reuse known facts, answer the question and request only needed intake | Opt-out, invalid scope or takeover |
| Fit and availability confirmed | Offer/book permitted capacity, issue a valid policy quote or open an exact checkout | Source stale, capacity loss, terms changed |
| Missing input / unanswered quote | Use the shared MISSING_INPUT / QUOTE profiles and opportunity context | Reply, decision, new version, expiry |
| Customer chooses next action | Commit the canonical booking/order/project and cancel obsolete nurture | Failed persistence cannot produce a success message |
| Verified missed visit or failed checkout | Send only the configured useful recovery path | Completed/rebooked, dispute, opt-out or expiry |
| Lost / not now | Store reason; schedule only a customer-relevant future checkpoint with permission | No endless reactivation loop |
| Verified fulfillment | Update source economics; offer eligible repeat/referral/feedback journey | Complaint, wrong recipient, eligibility failure |
| Spend or capacity limit reached | Stop/pause only authorized affected campaign actions and expose impact | Do not autonomously raise the budget ceiling |

Use the existing [16 cadence profiles](automation-contract.md#cadence-profiles), business calendars, caps, transport gates, takeover and retry/reconciliation requirements. Initial proposed follow-up timing is configurable, never presented as a top-performer benchmark. A reply pauses the matching unanswered sequence, not unrelated obligations.

Ordinary approved messages and actions run automatically. Novel material claims, new spending authority and professional judgments remain their own decisions. If a campaign has standing approved content/audience/budget, it should not need daily manual approval.

## Where this fits in the existing six tabs

| Tab | Addition without another primary destination |
| --- | --- |
| Chats | Acquisition context, source/offer, verified fit/readiness, current opportunity and next automatic action |
| Sector Work | Opportunity-to-booking/order/project progression, quote decisions and the same Follow-ups queue; integrate into existing board/list filters and record details |
| Customers | Lead/customer segments, company/household relationship where appropriate, identity, attribution timeline and multiple linked opportunities |
| Broadcasts | Acquisition campaigns, approved audiences/offers, referral programs, nurture/re-engagement and campaign receipt reports; external paid ads require a separate connector |
| Insights | Source → qualified → next action → fulfilled/paid funnel, spend/contribution, lost reasons, repeat/referral cohorts and data coverage |
| Settings | Sources/connectors, qualification and routing, offers/proof, capacity, rules, consent/export eligibility, budget limits and experiments |

Do not add a seventh Leads/Growth/Automations tab or force five permanent secondary Work tabs. A lead filter and contextual details can serve the existing four Work views; customer segments and campaign configuration stay in their existing destinations.

## The 25 sector acquisition plans

Each linked sector file specifies its offer, fit questions, next action, automatic journey, repeat loop, KPIs and evidence limitations.

| Sector | Initial acquisition routes to test | Verified conversion path | Evidence |
| --- | --- | --- | --- |
| [real-estate](real-estate.md#lead-generation-and-acquisition) | Property-specific search/portal inquiries, verified listing content, past-client and partner referrals | Confirmed viewing → attended viewing → accepted transaction milestone | [L05](lead-generation-evidence.md#l05), [P01](lead-generation-evidence.md#p01) |
| [dental](dental.md#lead-generation-and-acquisition) | Local service discovery, accurate practice listings and patient-initiated referrals | Confirmed new-patient visit → verified attendance | [L06](lead-generation-evidence.md#l06), [P01](lead-generation-evidence.md#p01), [P03](lead-generation-evidence.md#p03) |
| [clinic](clinic.md#lead-generation-and-acquisition) | Accurate provider/service discovery, appointment pages and authorized referral partners | Confirmed appropriate appointment → verified attendance | [L07](lead-generation-evidence.md#l07), [P01](lead-generation-evidence.md#p01), [P03](lead-generation-evidence.md#p03) |
| [hvac](hvac.md#lead-generation-and-acquisition) | Local high-intent repair/installation search, service-area pages, property-manager partnerships and referrals | Confirmed visit → completed paid job | [L01](lead-generation-evidence.md#l01), [P01](lead-generation-evidence.md#p01) |
| [construction](construction.md#lead-generation-and-acquisition) | Project-type case studies, architect/consultant partnerships, referrals and permitted tender/RFQ feeds | Qualified opportunity → completed site survey → accepted contract | [L03](lead-generation-evidence.md#l03), [L18](lead-generation-evidence.md#l18) |
| [cakes](cakes.md#lead-generation-and-acquisition) | Visual occasion/product content, local search, planner/venue partners and existing-customer referrals | Accepted design and verified required deposit → completed order | [L11](lead-generation-evidence.md#l11), [P01](lead-generation-evidence.md#p01) |
| [cafe](cafe.md#lead-generation-and-acquisition) | Maps/local discovery, social menu content, nearby office partnerships and first-party customer referrals | Confirmed first order → fulfilled paid order | [L10](lead-generation-evidence.md#l10), [L11](lead-generation-evidence.md#l11), [P01](lead-generation-evidence.md#p01) |
| [restaurant](restaurant.md#lead-generation-and-acquisition) | Social/Google discovery, direct reservations/orders, local partnerships and guest referrals | Attended reservation or fulfilled order; catering also requires accepted scope/deposit | [L10](lead-generation-evidence.md#l10), [P01](lead-generation-evidence.md#p01) |
| [retail](retail.md#lead-generation-and-acquisition) | Product/category search, approved catalogs/feeds, social product content and customer referrals | Confirmed order → fulfilled first purchase, adjusted for returns | [L11](lead-generation-evidence.md#l11), [P01](lead-generation-evidence.md#p01) |
| [beauty](beauty.md#lead-generation-and-acquisition) | Service-specific local discovery, visual proof with permission, referrals and social-to-booking | Confirmed appointment → attended paid visit | [L02](lead-generation-evidence.md#l02), [P01](lead-generation-evidence.md#p01) |
| [fitness](fitness.md#lead-generation-and-acquisition) | Social demonstrations, member referrals, local partnerships and search for the offered program | Attended trial → activated membership → retained member at W | [L08](lead-generation-evidence.md#l08) |
| [education](education.md#lead-generation-and-acquisition) | Program-specific search/content, information sessions, school/employer partners and verified learner referrals | Attended information/trial session → accepted paid enrollment | [L13](lead-generation-evidence.md#l13) |
| [automotive](automotive.md#lead-generation-and-acquisition) | Repair/service-specific local search, customer referrals, fleet partnerships and verified service history | Attended appointment → authorized completed work order | [L09](lead-generation-evidence.md#l09), [P01](lead-generation-evidence.md#p01) |
| [logistics](logistics.md#lead-generation-and-acquisition) | Lane/service search, shipper partnerships, permitted business-directory research and contract RFQs | Accepted quote → first completed shipment → active shipping account | [L14](lead-generation-evidence.md#l14) |
| [travel](travel.md#lead-generation-and-acquisition) | Destination/intent content, search, repeat-client referrals, and for hotels a balanced mix of direct and partner distribution | Supplier-confirmed issued booking or confirmed stay → completed travel/stay | [L15](lead-generation-evidence.md#l15) |
| [events](events.md#lead-generation-and-acquisition) | Portfolio by event type, venue/planner partnerships, referrals and high-intent date/location search | Completed consultation/site visit → accepted event with required deposit | [L16](lead-generation-evidence.md#l16) |
| [legal](legal.md#lead-generation-and-acquisition) | Practice-specific educational content, trusted professional referrals and relevant local search | Attended consultation → conflict-cleared accepted engagement | [L04](lead-generation-evidence.md#l04), [P03](lead-generation-evidence.md#p03) |
| [finance](finance.md#lead-generation-and-acquisition) | Niche educational content, business/professional referrals, partner networks and service-specific search | Attended consultation → accepted engagement → first completed billed service | [L03](lead-generation-evidence.md#l03), [P03](lead-generation-evidence.md#p03) |
| [marketing](marketing.md#lead-generation-and-acquisition) | Niche proof/case studies, educational content, partner referrals and permitted target-account outreach | Attended discovery → accepted paid project/retainer | [L03](lead-generation-evidence.md#l03) |
| [media](media.md#lead-generation-and-acquisition) | Relevant portfolio/case studies, venue/agency partnerships, client referrals and permitted company-specific prospecting | Complete brief → accepted scope and required deposit → delivered production | [L03](lead-generation-evidence.md#l03), [L16](lead-generation-evidence.md#l16) |
| [technology](technology.md#lead-generation-and-acquisition) | Problem-specific technical content, verifiable case studies, integration partners and permitted account-based outreach | Attended relevant demo/discovery → accepted contract → activated service | [L03](lead-generation-evidence.md#l03) |
| [manufacturing](manufacturing.md#lead-generation-and-acquisition) | Capability/product search pages, industrial directories, distributor partnerships and permissioned RFQ feeds | Complete feasible RFQ → accepted purchase order → delivered order | [L17](lead-generation-evidence.md#l17) |
| [cleaning](cleaning.md#lead-generation-and-acquisition) | Local service search, property/facility-manager partners, client referrals and permitted business-account research | Accepted visit/contract → completed quality-accepted first service | [L18](lead-generation-evidence.md#l18), [P01](lead-generation-evidence.md#p01) |
| [retail-tech](retail-tech.md#lead-generation-and-acquisition) | Model/repair-specific local search, accurate listings, device content, local partners and customer referrals | Repair: verified intake then accepted repair and collection; retail: fulfilled paid device sale | [L12](lead-generation-evidence.md#l12), [P01](lead-generation-evidence.md#p01) |
| [other](other.md#lead-generation-and-acquisition) | Select channels from the actual buying process: local intent, catalog commerce, professional relationship or account/RFQ | A configured verified business milestone followed by completed paid service | [L03](lead-generation-evidence.md#l03), [P01](lead-generation-evidence.md#p01) |

## Measurement and controlled optimization

In Insights separate raw traffic, unique inquiries, qualified opportunities, confirmed next actions, attendance, new paying customers, fulfillment, returns and repeat customers. Report source coverage, costs, cohort maturity, sample size and the observation window W.

| Metric | Definition |
| --- | --- |
| Cost per qualified opportunity | Matched acquisition spend ÷ unique opportunities meeting the versioned fit definition; show fully loaded cost separately |
| Cost per attended appointment | Matched spend ÷ verified new-customer attended appointments; clicks/requests/unknown attendance excluded |
| Acquisition conversion | Acquired new customers achieving the defined outcome within W ÷ acquired unique eligible opportunities whose W has matured |
| Media CAC | Matched ad spend ÷ verified newly acquired paying customers; returns/cancellations disclosed and denominators reconciled |
| Fully loaded CAC | Ad spend plus allocated creative, agency, software and acquisition labor cost ÷ those new customers |
| Contribution after acquisition | Net realized revenue minus included direct delivery costs, refunds/discounts and acquisition cost; label missing cost coverage |
| Repeat/referral outcomes | Completed qualifying returns or referred new customers in matured, attributable cohorts; no double-counting repeat customers as new |
| Funnel health | Response latency, uncontacted/stalled opportunities, stage drop-off, loss reason, opt-out, source coverage and staff touches |

Keep primary totals on one declared internal attribution rule, initially first verified acquisition touch; retain last eligible non-direct touch and assisted touches as separate views. Do not sum their credits. Platform-attributed conversions may overlap and must not be summed into internal sales. Attribution describes observed association; incremental lift needs a credible experiment/holdout.

Set allowable CAC from actual contribution, cash constraints and a defined payback horizon. Do not use optimistic lifetime revenue. A diagnostic ceiling can use allowable CAC × observed mature qualified-to-customer rate to estimate an allowable cost per qualified opportunity; uncertainty and minimum margin/capacity still govern spend.

Start experiments with one offer/channel and a stable conversion definition. Compare one material variable at a time where feasible, with persistent assignment and no mid-test audience rewrite. Low volume means inconclusive, not an AI-declared winner. Keep an untreated holdout for optional reactivation when appropriate; never withhold required service communication or clinically indicated follow-up.

Automatic spend changes require a configured ceiling, allowed step size, review interval, minimum mature outcome evidence, attribution health and service capacity. Pause on tracking failure, severe quality decline or exhausted capacity. Do not expand budget just because cost per message fell.

## Destination feedback and sensitive sectors

Where permitted, return verified qualified/converted outcomes to the appropriate tenant's Google/Meta connection. Use stable event IDs, source identifiers supported by the current API, receipt/rejection evidence and corrections. Configuration must map each internal event to a truthful platform event; a quote is not a Purchase and a calendar click is not an attended visit. [P02](lead-generation-evidence.md#p02)

**Default deny event export until a destination/purpose policy permits it.** Google restricts sensitive-category conversion uploads for enhanced conversions and store-sales measurement. Removing free text or hashing an identifier does not make a prohibited conversion eligible. Keep clinic/dental and other sensitive outcomes internal unless the exact event, purpose and destination are verified permitted. [P03](lead-generation-evidence.md#p03)

Meta's guide supports the CRM feedback concept, but current permission/schema details remain to verify. Preserve only supported referral/click metadata from authorized webhooks; do not assume every WhatsApp or Instagram conversation carries an ad identifier. A source remains unknown when evidence is absent. [P04](lead-generation-evidence.md#p04)

## Build order and release gates

1. **Instrument and define.** Add source/touchpoint and verified outcome mapping to current intake/work records; distinguish completeness from fit; fix retail-tech mapping. Reconcile counts on synthetic fixtures before adding new spend.
2. **One working acquisition-to-outcome slice.** Pilot electronics repair: tracked source → model/fault → eligible estimate/visit → intake → approved repair → tested ready → collection/payment → contribution. Use existing repair controls, and build the automatic event layer specified in that sector.
3. **Second reusable funnel.** Add real-estate property/viewing conversion using existing opportunities. Then test a project/RFQ adapter in synthetic mode, including Media's scope/date/deposit journey.
4. **Real acquisition distribution.** Prepare one sector destination, one credible offer, approved proof and one trackable channel; add partner/referral capture. Connect only authorized tenant accounts. Campaign publishing/spending needs actual scoped authority.
5. **Expand by adapter family.** Appointment sectors; retail/food; field service; project/professional; RFQ/shipping. Maintain independent per-sector acceptance. Preview/pending status and clinic governance do not disappear because the shared engine works.
6. **Return/referral and optimization.** Enable relevant repeat journeys and eligible outcome feedback, then bounded experiments/spend automation after enough reliable matured evidence exists.

Effort depends on live calendar/POS/payment/ad/ERP access and the source quality; this is a dependency order, not an invented delivery-date commitment. Prefer integration with the customer's system of record to forcing extra staff data entry.

## Required automated evidence

Use fake clocks, synthetic accounts/records and simulated providers only, matching the user's current testing preference.

- Every sector has a buying situation, offer, source, exact fit rule, next action, verified outcome, stop conditions and contribution basis.
- Test both commerce's short path and long-cycle project/appointment paths; no unnecessary B2B questions in simple orders.
- Duplicate leads/touches, concurrent slots/stock, two opportunities for one contact, source loss, identity ambiguity and cross-tenant IDs do not corrupt records.
- A calendar click remains an intent event; provider-confirmed booking, attendance, deposit, fulfillment and payment each require their own evidence.
- Revisions, replies, cancellations, opt-outs, takeover, expired quotes and completed purchases cancel the appropriate pending sequence.
- Consent/data-export restrictions block prohibited payloads; the wrong tenant ad account can never receive another business's outcome.
- Provider failure, ambiguous acceptance, worker restart and webhook replay do not duplicate accepted messages/bookings or lose durable work.
- Reconcile spend, refunds, new-versus-repeat customers and attribution totals against an independent fixture ledger; missing data stays unavailable.
- Automated budget changes cannot exceed standing authority; paused/failed tracking cannot trigger budget expansion.
- Check all six tabs, Arabic/English, mobile/desktop, role isolation, source freshness, exact metric drill-down and safe rollback.

Roll out with a tenant/sector/rule switch and a single active scheduler. Disabling acquisition automation stops new side effects and leaves customer/service records intact. A proposal, structure check or synthetic preview is not evidence of production lead generation or commercial success.

## What is needed from each business at onboarding

Approved services/products and price rules; ideal buying situations and exclusions; real capacity/service area; approved proof and assets; offer/terms; connected channel/ad/site/booking/POS/payment systems where applicable; contact/measurement permissions; baseline spend/outcomes; allowable acquisition cost and budget cap; exception owner and professional gates.

Once this setup is complete, routine capture, routing, reminders, reporting and permitted repeat journeys should run without staff retyping, chasing or preparing reports.

[Sector index](README.md) · [Evidence register](lead-generation-evidence.md) · [Automation contract](automation-contract.md)
