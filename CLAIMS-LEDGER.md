# Claims ledger

**Compiled 2026-09-10.** Nothing in this file has been changed on the site. The
design and copy work of 2026-09-10 deliberately left every factual claim as it
stood; this is the list of what those claims are, what the vault says about each,
and what a replacement would look like when you decide to act.

Sources are the canonical vault at `/Users/ramsis21/Desktop/obsidian/business/`.

---

## 1. Twelve named AI agents

**On the site:** `src/data/agents.js` defines twelve named agents — Layla, Hatif,
Samira, Wisal, Saqr, Hasib, Rashid, Adiba, Dalil, Rasil, Raqib, Haris — each with
a role, five specs, six duties and an outcome. The AI Team section renders all
twelve, and `src/i18n/en.js` calls it "a team of AI systems that run your whole
front office".

**What the vault says:**

> **Layla is the only shipping named agent.** Describe other delivered work as
> scoped services, not as available agents.
> — `Market/Product-Marketing-Context.md`

> Layla is the only shipping named agent; tier names do not establish readiness
> or universal inclusions.
> — `Market/Pricing.md`

> Never turn a roadmap, code fragment or site claim into an availability promise.
> — `Market/Product-Marketing-Context.md`

**Severity:** highest. Eleven of the twelve are presented as things a buyer can
have today.

**Proposed replacement:** keep Layla as a named agent with her actual verified
scope (answers and captures inquiries, qualifies against configured criteria,
hands off to the owner's tools). Present the rest as scoped capabilities the
engagement can include — "outreach", "reporting", "reactivation" — without
personifying them or implying they ship as products. The section then describes
what gets built rather than who works for you.

---

## 2. The 30-Day Leak Guarantee

**On the site:** `src/i18n/en.js` → `guarantee_title` / `guarantee_desc`:

> If, in your first 30 days, the system doesn't book the agreed number of
> qualified appointments, you get a full refund.

**What the vault says:**

> Do not present disputed historical tier lists as settled scope. The agreed
> written engagement scope defines deliverables and any guarantee; **do not
> introduce a general refund, response-time or appointment promise.**
> — `Market/Pricing.md`

And in the open-questions register of the same file, unresolved and owned by
Ahmed:

> Appointment refund versus response-time promise versus broader infrastructure
> work | No new global guarantee; honour the particular written agreement |
> Ahmed defines measurable acceptance, exclusions and remedy before publishing
> revised terms

The playbook's own README already refuses to repeat it:

> Do not state the 30-day guarantee here. Its definition ("agreed number of
> qualified appointments") does not translate to an infrastructure sale and is
> unresolved.

**Severity:** highest. This is a public refund promise whose central term —
"the agreed number of qualified appointments" — is defined nowhere on the site.

**Proposed replacement:** remove the site-wide guarantee and state that
acceptance criteria and any remedy are written into each engagement brief, which
is what `Operations/Delivery.md` actually describes. Or publish it only once
Ahmed has defined measurable acceptance, exclusions and remedy.

---

## 3. AI voice inside the Ascend plan

**On the site:** `src/data/tiers.js`, Ascend `inside[]`:

> Inbound calls answered by AI voice on the first ring, every time, with no call
> left in voicemail

Also `sol_5_desc` lists "voice" among the named AI systems, and the roster has
Hatif as "AI Voice Agent".

**What the vault says:**

> **Voice is not a verified live capability.**
> — `Market/Product-Marketing-Context.md`

> Custom websites, voice, bespoke CRM, outbound campaigns, predictive reporting
> and human strategy are separately scoped and prepaid under the decision.
> **Voice is not verified available.**
> — `Market/Pricing.md`

**Severity:** high, and it sits inside a priced tier, so it reads as included.

**Proposed replacement:** remove voice from the Ascend inclusion list. If it is
offered at all, present it the way the vault does — separately scoped and
prepaid, not bundled.

---

## 4. The `<30s` first-reply stat

**On the site:** the hero specification line, `src/components/sections/HeroSection.jsx`:
`<30s` against the label "First-Reply Time".

**What the vault says:**

> The earlier assertion that this proves a universal under-30-second first reply
> **is withdrawn.** The tail and unanswered messages are material; do not omit
> them to strengthen a claim.
> — `Market/Response-Time-Proof.md`

The same note records that the aggregate's p90 was about 41 minutes, and that
the method paired every inbound message rather than each unique customer
inquiry, so it never established a first-response figure at all.

**Severity:** high. The claim was explicitly withdrawn.

**Proposed replacement:** the MyBizBay figures, which the vault says to use:

> Over two months, mybizbay.com answered **242 customer inquiries** on WhatsApp
> with a **median response of 2 seconds**. 94% were answered within 30 seconds.
> One inquiry in 242 went unanswered.
> — `Resources/client-materials/Case-Study-MyBizBay.md`

Measured 2026-08-04 from Twilio logs, window 2026-06-06 to 2026-08-04. That note
says plainly: *"Use these numbers. Retire the aggregate for external use."* The
`.ds-figure` component in `.impeccable/design.json` exists to set exactly this,
with its attribution line built in.

---

## 5. "78% of customers buy from the business that responds first"

**On the site:** `src/data/agents.js`, in Layla's entry. Unsourced on the page.

**What the vault says:**

> Avoid unsourced 78%, 80%, 21×, salary ranges, competitor superlatives and
> guaranteed sales. Old collateral and the live site are not independent
> substantiation.
> — `Market/Product-Marketing-Context.md`

Note that 78.6% *does* appear in `Market/Response-Time-Proof.md`, but it means
something entirely different there — the share of BznsFlow's own paired answered
messages replied to within 30 seconds, not a fact about buyer behaviour. The two
should not be confused.

**Severity:** medium-high. It is a third-party behavioural statistic with no
citation.

**Proposed replacement:** cite the real source and what it said, or cut it. The
gated playbook carries the same family of numbers (80%, 21×) and has the same
problem.

---

## 6. "Proven in Oman with Muscat Heights and Mazoon Dental"

**On the site:** `src/i18n/en.js` → `about_p3`.

**What the vault says:** neither name appears in
`Resources/client-materials/Testimonials.md`, which is explicit about being the
single source:

> **Approved by clients 2026-08-30.** Names and logos also cleared the same day.
> This is the canonical source.

> **Attribute every quote to the named business.** A testimonial published
> without its name is worth almost nothing — the name is the entire mechanism.

**Severity:** medium-high. Two client names are published without a record of
clearance. That is a client-boundary question, not just a marketing one.

**Proposed replacement:** the seven names that *are* cleared — Mawa Real Estate,
Five Gates, Mekka Hijama, Reading Jeel, Wild Muscat, BizBay, Royal Fish — or
confirm clearance for Muscat Heights and Mazoon Dental before republishing them.

---

## 7. Seven approved testimonials, none of them used

**Not an error — an omission.** The site currently shows zero testimonials. The
vault holds seven, cleared by the clients on 2026-08-30, names and logos
included, with the Arabic original and an English rendering for each.

The strongest is BizBay's, and the vault says why:

> **The single strongest asset we own** — it is the only quote whose numbers are
> independently verifiable from `Case-Study-MyBizBay` (Twilio logs, 2026-06-06 →
> 2026-08-04). A skeptical buyer can check it. Nothing else in the marketing
> stack survives that test.

Eight client logos already run in the "Selected work" tape with no words attached
to any of them. Adding the approved quotes beside the logos is the highest-value
change available to this site that requires no new evidence and breaks no rule.

**Standing rule when you do:** quote verbatim, always attribute to the named
business, and re-approve any edit.

---

## 8. Smaller items

| Item | Where | Note |
|---|---|---|
| Copyright reads 2025 | `en.js` / `ar.js` → `footer_copy` | Stale; today is 2026. |
| ~30 orphaned i18n keys | `t1_*`, `t2_*`, `t3_*`, `trackA_*`, `trackB_*` | Rendered nowhere, still shipped in both language bundles. Includes a competing real-estate-only pricing narrative, a second guarantee ("Lead-volume growth guarantee — backed by results"), and a manufactured-scarcity block that pre-emptively denies being manufactured scarcity. Dead, so removing them changes nothing visible. |
| "Growth Engineers" | `nav_tagline` | Left alone as a brand element, but it is the same empty "engineered" metaphor removed elsewhere. Ahmed's call. |
| `agents.js` prose | 84 em dashes, EN + AR | Not humanized this round. It would be wasted work if the roster is collapsed per item 1. |
| Blurred aurora on sign-in | `src/styles/auth.css:39` | `filter: blur(70px)`, the same tell removed from the homepage. Left because the sign-in page was not audited this round. |

---

## What was NOT changed, and why

Every item above is still live exactly as it was. On 2026-09-10 the instruction
was to leave claims alone and do design and readability only. Copy edits in that
pass changed phrasing, never substance: no number, price, guarantee sentence,
capability or client name was added, removed or altered.

The one boundary case worth naming: `sol_8_desc` previously ended "makes you the
obvious, trusted choice", and that clause was cut. It was judged an empty
superlative rather than a capability claim — the vault bans competitor
superlatives outright — but if you read it as a claim, that is the single
exception to the rule above.
