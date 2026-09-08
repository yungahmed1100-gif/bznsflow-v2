# Keyword & page strategy — English-first, worldwide

Source: 2,690 unique Google autocomplete suggestions across 12 seeds (972 requests,
0 failures). Full data in `keywords/all-keywords.txt`, clusters in
`keywords/clusters.md`. No volume figures — no paid tool access — so **intent, not
volume, sets the build order**. Intent is readable directly from the query.

## Cluster sizes

| Intent | Queries | Owning page |
|---|---|---|
| Commercial ("best/top/software/for small business") | 427 | Service pages |
| **Cost ("cost / pricing / how much")** | **379** | `/pricing` |
| Question ("how/what/why…") | 274 | `/blog/*` |
| Vertical (industry-named) | 93 | `/ai-receptionist/<industry>` |
| Comparison ("vs / alternative") | 23 | `/vs/*`, `/alternatives/*` |
| Excluded as wrong-intent (jobs, courses, salaries) | 131 | — |

## What the data actually says

**1. Cost is the single largest buyer cluster (379 queries).** `ai receptionist cost`,
`ai receptionist cost per month`, `ai receptionist pricing`, `ai answering service cost
per month`, `ai voice agent cost per minute`, `average cost for ai receptionist`,
`ai receptionist for small business cost`. The site currently has pricing tiers buried
in a homepage anchor and **no indexable pricing page at all**. This is the biggest
single gap between demand and what exists.

**2. `ai receptionist vs human receptionist` is a genuinely winnable #1.** It appears in
several forms (`ai vs human receptionist`, and an Australia-qualified variant).
Incumbent vendors avoid writing this page honestly because the honest answer is
nuanced. That is exactly why it ranks for whoever writes it well.

**3. There is a whole WhatsApp-API comparison cluster nobody here is serving.**
`whatsapp business api vs twilio`, `whatsapp business api vs cloud api`,
`whatsapp business api vs whatsapp business app`, `alternative to whatsapp business
api`, `best alternatives to whatsapp business api`. BznsFlow does WhatsApp automation
as a core service. These are high-intent, low-competition, and directly adjacent.

**4. Verticals rank by real demand — and it is medical, not what the site targets.**

| Vertical | Queries |
|---|---|
| medical / healthcare / doctor / clinic | 33 |
| dental / dentist | 15 |
| real estate / property / realtor | 11 |
| legal / law firm / lawyer / attorney | 7 |
| hvac / plumbing / contractor | 7 |
| hotel | 5 |
| restaurant | 4 |

The current `meta keywords` weighted restaurants, cafés and bakeries heavily. The
demand data does not support that for a worldwide English audience — **medical and
dental dominate**, then real estate. Build in demand order.

## Build order

Ranked by (demand × intent) ÷ competition:

| # | Page | Targets | Why first |
|---|---|---|---|
| 1 | `/pricing` | 379-query cost cluster | Largest cluster, zero current coverage |
| 2 | `/vs/human-receptionist` | `ai receptionist vs human receptionist` | Winnable #1; incumbents won't write it honestly |
| 3 | `/ai-receptionist` | `ai receptionist`, `for small business` | Core money page; anchors the whole cluster |
| 4 | `/whatsapp-automation` + `/vs/twilio` | WhatsApp API comparison cluster | Low competition, directly adjacent to the service |
| 5 | `/ai-receptionist/medical` | 33 medical queries | Highest-demand vertical |
| 6 | `/ai-receptionist/dental` | 15 dental queries | Second vertical |
| 7 | `/ai-voice-agent` | `ai voice agent cost/pricing/per minute` | Distinct product, distinct cluster |
| 8 | `/ai-receptionist/real-estate` | 11 queries | Third vertical |
| 9 | Case studies ×8 | brand + proof | `public/clients/` already holds 8 logos, unused |
| 10 | `/blog/*` | 274 question queries | Internal-link engine feeding 1–9 |

## Non-negotiable per page

- One `<h1>` carrying the target query in natural language
- Title ≤60 chars, description ≤160, both unique (the audit enforces this)
- Real contextual internal links in **and** out — the site currently has zero
  page-to-page links, only `#anchors`. New pages must not ship as orphans.
- `BreadcrumbList` schema; `Offer` schema on `/pricing`
- Answer the query in the first 100 words, in extractable form, so LLMs can quote it
- Registered in `PAGES` in `src/routes-manifest.js` — sitemap and hreflang follow
  automatically from that one entry

## Honest expectations

- `/pricing` and the comparison pages: movement in 4–8 weeks.
- Vertical pages: 2–4 months.
- The head term `ai receptionist` worldwide is owned by funded US SaaS. That is a
  12–18 month play requiring off-site authority, not on-page work. The pages above win
  the long tail underneath it, which is where the buyers with intent actually are.
