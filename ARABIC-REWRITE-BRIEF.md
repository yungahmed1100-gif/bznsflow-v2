# Arabic rewrite brief

**Compiled 2026-09-10.** The English copy in `src/i18n/en.js`, `src/data/tiers.js`
and `src/lib/schemas.js` was rewritten on 2026-09-10. **The Arabic was not
touched.** `Brand/Voice-and-Copy.md` records that the written Gulf-leaning
Arabic on this site has never been read by a Gulf-native speaker, so machine-
mirroring the rewrite would compound an unvalidated text rather than fix it.

This is the list of what drifted, for whoever does the Arabic pass.

## Ground rules for the pass

From `Brand/Voice-and-Copy.md` and `Market/Product-Marketing-Context.md`:

- Clear Gulf-neutral Arabic is the drafting default. Validate local idiom with a
  suitable speaker; do not claim a dialect was customer-tested without evidence.
- Arabic is the canonical language on this site — it is the unprefixed route at
  `/`, and English mirrors under `/en`. Write the Arabic to read as an original.
- **Change no fact.** Every price, number, guarantee sentence, capability and
  client name stays exactly as it is. The English pass changed only phrasing,
  and the Arabic pass should do the same. Open claim questions are catalogued
  separately in `CLAIMS-LEDGER.md`; do not resolve them here.
- Keys must stay identical across `en.js` and `ar.js`. `tests/contracts.test.mjs`
  fails the build otherwise. Change values only.
- Never letter-space or uppercase Arabic. The stylesheets already suppress both,
  but do not reintroduce them in copy.

## What changed in English, and why

### One name for the offer — the biggest single change

The offer had six names in English. It now has one, taken from the vault's own
wording: **a free BznsFlow audit of the business and customer funnel**. The
booked call *is* that audit, so the two CTAs differ only by channel.

| Key | Was | Now |
|---|---|---|
| `hero_cta_primary` | Get My Free Growth Audit | Get my free audit |
| `how_cta` | Get My Free Growth Audit | Get my free audit |
| `about_cta1` | Get My Free Growth Audit | Get my free audit |
| `step1_title` | Free Growth Audit | The free audit |
| `sticky_book` | Free Audit | Free audit |
| `footer_book` | Book a Discovery Call | Book the free audit |
| `secondary_cta_call` | Book a call instead | Book it as a call |
| `auth_done_book` | Book an introduction call | Book the free audit |
| `auth_done_sub` | ...a short introduction call. | ...to book your free audit. |
| `tiers_sub` | ...a free Lead-Leak Audit. | ...the free audit. |

**Check the Arabic for the same problem.** It likely carries its own set of
names for this one offer, and they should collapse the same way. This matters
more than any other item in this brief: a visitor who sees four names for one
thing does not know what they are being offered.

### Strings whose English wording changed

Mirror the *sense*, not the words. Where the English dropped a phrase, the
Arabic should drop the equivalent rather than translate the new English.

**Hero**
- `hero_badge` — "Business-in-a-box tech solutions" replaced with plain wording:
  business technology, built and run for you, in Arabic and English.
- `hero_sub` — same facts, restructured around a colon instead of a dash.

**Benefits**
- `benefits_sub` — dropped the "You don't buy AI. You buy…" construction and
  states what you get directly.
- `b1_desc` — "even when you're slammed" became "on your busiest day".
- `b3_desc` — dropped "quietly" before "cost you money".
- `b4_desc` — split into two sentences.

**Plans**
- `tiers_sub`, `growth_body` — dashes to colons, no meaning change.
- `guarantee_desc` — **the guarantee sentence is untouched.** Only the dash
  before "and measure it in arithmetic" became a comma. Do not rewrite this
  string in Arabic beyond matching punctuation.

**How it works**
- `how_sub`, `step1_desc`, `step2_desc`, `step3_desc` — dashes to commas/colons.

**About**
- `about_title` — "Your done-for-you AI growth partner" became "Built for you,
  run by us". Four stacked category words replaced with a statement of the
  operating model. The Arabic heading needs the same treatment, not a
  translation of the new English.
- `about_p2` — "We engineer, deploy, and run" became "We build, deploy, and
  run". The "We're not a software vendor" opening was **kept**: it corrects a
  belief buyers actually hold.
- `about_p3` — punctuation only. **Muscat Heights and Mazoon Dental stay
  verbatim** pending the ledger.

**Team**
- `team_sub` — "BznsFlow isn't one bot — it's a team of AI systems" became "A
  team of AI systems runs your whole front office". The claim is identical; the
  staging is gone. The Arabic almost certainly has the same construction.

**Solutions**
- `sol_title` — "Your whole business, engineered" → "Your whole business, built
  and run".
- `sol_sub` — "your tech team in a box" → "your technology team".
- `sol_1_desc` … `sol_7_desc` — dashes to commas, parentheses or "rather than".
- `sol_6_desc` — dropped "Bespoke".
- `sol_7_desc` — "not vanity metrics" became "rather than impressions".
- `sol_8_desc` — **dropped "makes you the obvious, trusted choice"**, replaced
  with "so your rating reflects the work you actually do". This is the one place
  a claim-shaped phrase was cut; see `CLAIMS-LEDGER.md`.
- `sol_cta` — "Build my solution on WhatsApp" → "Ask about this on WhatsApp".

**FAQ**
- `faq_a1` — dropped the closing "not a toy that replies and stops".
- `faq_a3` — dropped "not a generic robot", folded into "so it sounds like your
  business".
- `faq_a2`, `faq_a4`, `faq_a5`, `faq_a6` — punctuation only.

**Playbook, footer, WhatsApp prefills**
- `playbook_problem_1`, `playbook_solution`, `playbook_success_sub` — punctuation.
- `footer_desc` — "Business-in-a-box tech solutions" replaced as in `hero_badge`.
- All `wa_msg_*` and `chat_wa_prefix` — the em dash after "Hi BznsFlow" became a
  comma, and `wa_msg_hero` now says "I'd like the free audit" to match the CTA.
  **The Arabic prefills should name the offer the same way the Arabic CTA does.**

**SEO**
- `schemas.js` → `HOME_SEO.en.description` — dash to colon. The Arabic
  description at `HOME_SEO.ar.description` still contains an em dash and was
  left for this pass.

## Two things to check that are not translation

1. **`ar.js` line 1 comment and `footer_copy`** — the copyright year reads 2025
   in both languages.
2. **Arabic numerals and the `<30s` value.** The hero specification values are
   forced LTR in CSS because the bidi algorithm was reordering `<30s` into
   `30s>` under `dir="rtl"`, which stated the opposite of the claim. That is
   fixed in `src/styles/hero.css`. If any new Arabic string embeds a comparison
   operator next to a number, it needs the same isolation.

## Files to edit

- `src/i18n/ar.js` — interface strings.
- `src/data/tiers.js` — the `TIERS_AR` array, which holds the Arabic plan copy
  as a separate hand-written block.
- `src/lib/schemas.js` — `HOME_SEO.ar`.
- `src/data/agents.js` — Arabic roster prose. **Hold this one** until the
  twelve-agent question in the ledger is settled; it may not survive.

After editing, run `npm test` (key parity is enforced) and `npm run build`.
