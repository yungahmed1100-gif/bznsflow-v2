# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Owner-operated SMEs in the GCC, with Oman as the beachhead rather than an exclusive
boundary. The primary user is the owner or the person who answers the business's
messages — not a marketing team and not a technical buyer. They are evaluating on a
phone, often in Arabic, usually because inquiries are arriving faster than they can
answer them.

The job: get every customer inquiry answered and captured without hiring someone to
sit on WhatsApp. Qualification asks for the problem, the volume, the current process,
the value of a successful outcome, and delivery fit.

Sector is illustrative, not the organizing principle — confirmed 2026-09-10. Documented
sector hypotheses (real estate, dental and aesthetic clinics, home services and garages,
retail and e-commerce, restaurants and hospitality, schools and training, professional
services) are candidate use cases, not separate audiences. Real estate is an established
use case; its transaction values do not generalize to every customer.

## Product Purpose

BznsFlow builds and operates AI and automation infrastructure for GCC SMEs, delivered as
a service rather than sold as software. The stated service direction is customer
acquisition systems, reorder systems, engineered loyalty systems, and outreach engines
through WhatsApp and email. Each is scoped around a particular customer's stated need.

Success for the visitor is booking the entry offer: a free BznsFlow audit of their
business and customer funnel.

## Positioning

Done-for-you, Arabic-first, and operated rather than handed over. The bilingual front
office is native Arabic rather than translated English, which is the thing a neighboring
product cannot truthfully copy without rebuilding for it. Oman is the beachhead.

## Operating Context

- The site is one long-scroll homepage, Arabic at `/` and English at `/en`. Arabic is
  canonical and unprefixed; English mirrors under `/en`.
- Evaluation happens largely on mobile, in Arabic, in RTL.
- The two live conversion paths are WhatsApp and a Google Calendar booking link.
  Confirmed 2026-09-10 as co-primary.
- The public contact is the established +20 number. There is no provisioned +968
  WhatsApp Business sender.
- Canonical domain is `https://www.bznsflowai.com`.
- Deployment does not run from git; the site ships only via `npx vercel deploy --prod`.

## Capabilities and Constraints

- **Layla is the only shipping named agent.** Her WhatsApp front office answers and
  captures inquiries, qualifies against configured criteria, and hands off to the owner's
  tools. Other delivered work is described as scoped services, not as available agents.
- **Voice is not a verified live capability.**
- Booking, reporting and follow-up claims require evidence for the particular deployment.
  Capture-only does not imply booking; booking is complete only when the downstream
  system confirms it.
- Follow-up outside WhatsApp's 24-hour window requires an approved template. Measured on
  one client sender, outbound delivery was 47.0% — replies work, follow-ups do not.
- Recorded prices (founding-customer experiment, documented as published 2026-08-12):
  Catalyst OMR 40/mo + 70 setup; Ascend 120 + 210; Apex 300 + 525. Setup is 1.75×
  monthly. 90-day minimum, paid in advance, no annual discount. These amounts are
  recorded, not certified as today's live checkout.
- Custom websites, voice, bespoke CRM, outbound campaigns, predictive reporting and human
  strategy are separately scoped and prepaid.

### Explicitly undecided — do not resolve in design work

- What each tier actually includes. The vault flags a live conflict between the tier
  matrix and the separate-scope boundaries; owner reconciliation is pending.
- Whether any guarantee exists beyond a particular written engagement. There is no
  general refund, response-time, or appointment promise.
- **The shipping site currently asserts several things the vault contradicts** — a
  12-agent roster, a "30-Day Leak Guarantee" offering a full refund, AI voice inside
  Ascend, a `<30s` first-reply stat that was formally withdrawn, an unsourced "78% of
  customers buy from the business that responds first", and two client names (Muscat
  Heights, Mazoon Dental) absent from the approved list. These were deliberately left
  in place on 2026-09-10 and are catalogued in `CLAIMS-LEDGER.md`. Design work must
  neither amplify nor quietly remove them.

## Brand Commitments

- The real BznsFlow logo and wordmark are preserved. The mark is not redrawn or recolored
  to fit a layout; a light card is used when the dark mark needs contrast.
- Arabic-first. Gulf-neutral Arabic is the drafting default, and the dialect is
  explicitly unvalidated by a native reader.
- Approved testimonial wording and attribution are quoted verbatim, always attributed to
  the named business. An anonymous testimonial is not a testimonial.
- Voice: plain and concrete. No AI jargon, no sweeping competitor claims, no "perfect"
  automation, no guaranteed sales, no fictional workforce.
- Never invent results or guarantees. Old collateral and the live site are not
  independent substantiation for a claim.

## Evidence on Hand

Real, dated, and usable:

- **MyBizBay case study** — measured 2026-08-04 from Twilio logs, window 2026-06-06 to
  2026-08-04: 242 inbound inquiries, 99.6% answered (241/242), median first response 2.0s,
  p90 12s, 94.2% within 30s. The vault's instruction is to use these numbers and retire
  the pooled aggregate for external use. The same sender's outbound delivery was 47%,
  disclosed to the client before approval.
- **Seven client-approved testimonials**, names and logos cleared 2026-08-30: Mawa Real
  Estate, Five Gates, Mekka Hijama, Reading Jeel, Wild Muscat, BizBay, Royal Fish. Held
  in the vault at `Resources/client-materials/Testimonials.md`.
- **Eight client logos** already shipping in the site's "Selected work" tape.

Absences future work must not fabricate:

- No testimonial currently appears anywhere on the site, despite the seven above.
- The pooled response-time aggregate (78.6% within 30s, p90 41 minutes) is withdrawn for
  external use; its tail was sandbox and demo traffic.
- No salary benchmarks, no competitor superlatives, no client-count or volume figures
  beyond the single measured case study.

## Product Principles

1. **Claims are load-bearing.** Every capability statement matches a configured service
   and its dated evidence. A roadmap, a code fragment, or an existing site claim does not
   establish availability.
2. **Arabic is the original, not the translation.** RTL and Arabic legibility are design
   constraints of equal weight to the English layout, not an afterthought applied at the
   end.
3. **Specific beats impressive.** One checkable number attributed to a named business
   outperforms a category adjective. "242 inquiries, one missed" is the standard.
4. **One decision per screen.** The visitor has two available actions — message on
   WhatsApp, or book the free audit. Everything else is subordinate.
5. **Compare against the buyer's real cost.** Value is framed against the staff or agency
   spend the buyer already carries, using their numbers, never an invented benchmark.

## Accessibility & Inclusion

WCAG 2.2 AA, confirmed 2026-09-10 and enforceable through the existing
`@axe-core/playwright` devDependency.

Bilingual Arabic/English with full RTL. Contrast is the standing risk: `--text-muted`
(`#565E6B`) on `--bg-secondary` (`#EBE1C9`) is already the weakest pairing in the token
set and must be verified rather than assumed.
