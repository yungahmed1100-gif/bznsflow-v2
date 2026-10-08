# Green release 2026-10-09: website selling angles, plans without prices, one Ledger UI

**Source:** `0445207` on `master`, released at Ahmed's request ("update the website and its selling angles with the latest vault decisions, polish the UI across all pages … then deploy"). Frontend and Vercel API only; no Convex change.

## What changed
- **Copy follows the vault:**
  - Product-Marketing-Context v9, Pricing, and Decisions/2026-10-08-Focus-Catalyst-On-Qualified-Inquiries.
  - New decision Decisions/2026-10-09-Show-All-Plans-Without-Prices.
  - Hero: «استفسارات مؤهلة، وخطوتك التالية واضحة» / "Qualified inquiries. A clear next step."
  - Plans: Catalyst available; Ascend and Apex in preparation; no prices.
- **Removed:**
  - the twelve-agent roster, the Growth Pack and the 30-day guarantee;
  - the <30s, 24/7 and "seconds" claims, the 78% claim and voice;
  - Muscat Heights and Mazoon Dental.
- **Added:**
  - all seven approved testimonials, verbatim;
  - one name for the free audit, and the vault booking link (`fUA7FtAyRHJ9okdk7`).
- **Kept at Ahmed's request:** the logo strip with all eight logos.
- **Rewritten to the same facts:** SEO titles and descriptions, JSON-LD (one Catalyst Service), `llms.txt`, and the website chat widget's persona and knowledge base.
- **UI consistency:**
  - one focus outline;
  - no blur or gradients (sign-in background, focus glows, WhatsApp float, hero arrow);
  - raised primary buttons in the dashboard and on setup;
  - onboarding rules no longer restyle BznsBrain;
  - Arabic letter-spacing guards and contrast fixes;
  - the shared logo header on setup, owner and access pages;
  - `/owner/access` rebuilt on the owner styles, in Arabic and English.
- **Broadcasts:** template sync no longer waits for the sending switch. Sending itself is still off.
- **BznsBrain website reading:**
  - reads a summary of the page: title, description, headings and price lines;
  - 45-second Qwen limit;
  - one grounded name is enough;
  - currency taken from the page;
  - `https://` added when missing.

## Evidence

| Item | Value |
|---|---|
| Verification, on the commit alone | Build passed; 818/818 unit tests; 9/9 browser suites; no banned claims in the built home pages. A real-Qwen read of bznsflowai.com: one call, about 12 s, Catalyst, Ascend and Apex proposed at OMR prices, nothing rejected. |
| Vercel | `dpl_3q13X59kDivR2AP7F1Wr5m93NKSo`, promoted. |
| Smoke | 200 for `/`, `/en`, `/en/privacy`, `/signin`, `/catalyst/setup`, `/en/layla/dashboard`, `/en/owner/access`, `/llms.txt`. 307 for `/layla/setup` and `/ascend/setup`. The live home pages carry the new headline and no "24/7", rial price or guarantee. |
| Rollback | `npx vercel promote dpl_CSgyB7g7dusn4ifZCCg1rvxrbQrs --yes` |

## Not in this release
- **Another session's uncommitted "Catalyst industries" work** (industry templates, sector packs, their tests) was left untouched and is not deployed.
- **Broadcast sending** stays off. It needs `GREEN_BROADCAST_ENABLED` plus the Convex broadcast setting, and that is an outbound-messaging decision.
- **Not yet done:**
  - the playbook PDF is not regenerated;
  - breakpoints are not consolidated;
  - the Notion entry for the 2026-10-09 decision is pending.
