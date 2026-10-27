# Green release 2026-10-27: Apex, custom enterprise solutions by request

**Authorization:** Ahmed, 2026-10-27: "for the 3rd plan apex its for custom interprise solutions prepare it with specific demanded agent functions." His answers:
- **Scope:** both the public side and an Apex grant in the product, and keep the WhatsApp contact button under the card.
- **Availability:** by request, with a custom quote.
- **Example functions:** ERP/Odoo connection, branches and teams routing, custom agent workflows, voice and other channels.

Decision: vault `Decisions/2026-10-27-Apex-Custom-Enterprise-By-Request.md` (Pricing updated; Notion mirror pending).

## What changed

**Plan card** (`src/data/tiers.js`, `TiersSection.jsx`):
- Apex shows a blue **By request** status, "Everything in Ascend" and the four agent functions with icons.
- It says "Custom quote after we scope it with you. No fixed price."
- Below that sits **Request Apex** → `/apex`, then **Ask about Apex on WhatsApp**.
- An Apex holder gets **Open my workspace** instead.
- `tiers_sub` no longer says Apex is in preparation.

**Request page** `/apex`, `/en/apex` (`src/pages/ApexRequest.jsx`, `src/styles/apex.css`):
- Prerendered, indexable and in the sitemap.
- A company picks functions, describes what the agents should do, and gives its company and contact. Branches, staff and systems are optional.
- The WhatsApp button sits under the form and stays after sending.

**API** `/api/lead?op=apex` (`api/_lib/apex-api.js`; no new function file):
- POST only.
- Guards: origin check, honeypot, and 5 requests a minute per IP.
- Validation in `config/apex.js`.
- Convex `apexRequests` (additive), with 3 requests a day per email.
- Emails Ahmed through Resend (`apex-email.js`, escaped). A failed email keeps the request.

**Owner queue** `/owner/apex` (`src/pages/ApexAdmin.jsx`; `/api/access-admin?op=apex`):
- Status moves new → contacted → scoped and quoted → closed, with an internal note.
- Linked from `/owner`.

**Apex grant:**
- `blueAccessGrants`/`blueAccessAudit` plans include `apex`, and `HASIB_PLANS = ['ascend','apex']`.
- `/owner/access` offers Apex with an optional live sector.
- Apex holds everything Ascend has: Hasib and its sector, the Ascend setup, the free website and its reminder, knowledge sources.
- Online payment stays Catalyst/Ascend only.

**Knowledge:** the website chatbot (`web-chatbot/*.md`, regenerated `kb.generated.js`) and `public/llms.txt` describe Apex by request. Voice is now "not part of Catalyst or Ascend; built in Apex by request".

## Evidence (local)

- **Unit tests:** `npm test` passes, including:
  - `tests/apex-request.test.mjs` (6 tests, in `test:access`);
  - updated `hasib-plans` (an Apex grant opens Hasib in its sector and sets the sign-up industry);
  - `api-chat`;
  - a new contract test: every owner route is prerendered.
- **Typecheck and build pass.**
- **Browser suites:** all 13 pass, including:
  - the new `apex-browser` (30 checks, EN at 1280 and AR at 375, axe, no overflow);
  - `home-browser` (148): status, four functions, the Request Apex link, WhatsApp under it;
  - `layla-dashboard-browser` (501): its Arabic website pass runs as an Apex holder.
- **Sector suites:** the journey suites (67) and Ascend e2e (83) pass.
- **Mutation checks:** removing each of 9 guards fails a test: origin, honeypot, IP rate, the per-email limit, the admin check, at least one function, email escaping, Apex in `HASIB_PLANS`, and the Apex website reminder.
- **`npm audit`:** the known advisories from 2026-10-24 are unchanged and not re-run here.

## Deploy

1. **Commits:** `10fbc59`, then `8334844`.
   - `/owner/apex` was routed but missing from the prerender list, so it returned 404 live.
   - It is now fixed, and the new contract test catches that class of miss.
2. **Convex Green** `prod:rare-fish-465`: added `apexRequests` indexes; no index deleted.
3. **Vercel production:** `dpl_6JDMLRB34to9nJn2z7E7tTewJbsM`, then `dpl_HKxh1Y6QevjENmuikgwz3iMb9rZo` (current). Rollback target: `dpl_BHctcnUCtHnEBJBfpFzK5K1QJbS6`.

## Live checks

- **Pages:** `/apex`, `/en/apex`, `/owner/apex`, `/en/owner/apex` and `/llms.txt` all return 200.
- **Refusals:**
  - A POST to `/api/lead?op=apex` from a foreign origin returns 403.
  - GET returns `method`.
  - `/api/access-admin?op=apex` returns `sign_in_required` signed out.
- **Content:** `llms.txt` says "Apex — by request, custom quote", the sitemap lists both Apex URLs, and the live home bundle has the Apex functions and the WhatsApp button.
- **Not done:** a real request, which would email Ahmed; that is his test. No account has been granted Apex.
