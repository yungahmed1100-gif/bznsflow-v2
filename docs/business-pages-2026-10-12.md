# Public business pages — 12 October 2026

Release update: the owner subsequently explicitly authorised production publication of these pages together with the SEO/GEO changes. Publish the confirmed-contact, written-agreement version; no missing company registration details, support hours or standard commercial terms are inferred. The preparation notes below are historical. Deployment evidence belongs in `docs/green-release-2026-10-12-geo-pages.md`.

Local implementation requested by Ahmed after the refund-policy and footer releases. The existing cream legal-page layout is reused; no homepage redesign or backend change.

## Added

- `/contact`, `/en/contact`: existing email and WhatsApp destinations, service enquiry, support, complaint process and privacy/deletion links.
- `/services`, `/en/services`: Catalyst and Ascend scope, Adiba owner approval, exclusions, written-scope requirements, setup, acceptance and changes after launch. The 12 October Ascend availability decision is reflected without claiming identical automation in every sector or a live Apex payment portal.
- `/support`, `/en/support`: access, channel connection issues, correcting replies, pausing/takeover, operational updates, owner decisions, complaints, billing/cancellation and data requests.
- Terms draft: written commercial terms, usage/provider charges, automation/approvals, support/acceptance, acceptable use and distinction between pausing, cancellation and refunds. Existing agreements and mandatory rights preserved. No new global price, deadline or minimum commitment invented.
- Footer discovery links, real bilingual anchors, metadata, prerendering and 18-URL sitemap. Existing centered policy links and chat clearance remain.
- `docs/customer-data-processing-template.md`: internal customer-contract preparation template. Unfilled fields are not published and the template is not presented as an executed or legally certified agreement.

## Awaiting owner answers before publishing

1. Legal contracting name, registered country/address, registration/licence number, and tax number if applicable. Current public contact content uses only the already-published brand and contact channels; it does not invent a registered entity or address.
2. Support hours/time zone, standard setup timeline (if any), billing/renewal schedule, minimum commitment and cancellation notice; or confirmation that these are set per written customer proposal.

The recorded founding experiment mentions a 90-day minimum, but no new standard cancellation notice or support SLA is documented. Requested confirmation before making new public promises. The existing Terms say material updates are emailed before taking effect; this task has not sent customer notices or altered an existing contract.

Newsletter preference/unsubscribe and Apex checkout/receipt pages remain dependent on their actual operational integrations; no inert forms or fabricated payment controls were added.

## Verification / preview

- `npm run build`: passed.
- `node work/business-pages-check.mjs`: 145 checks passed (EN/AR, all four changed pages, 320/390/768/1440, keyboard anchors, language switching, no serious/critical axe findings, no-JavaScript content, metadata, contact destinations, footer discovery and sitemap).
- Existing footer regression: 120 checks passed, including actual navigation from all three policy links with the chat invitation visible.
- Mobile screenshots inspected; phone/email bidi isolation added for Arabic readability.
- Local dev: http://127.0.0.1:5173/contact (English under `/en`). Static build preview: http://127.0.0.1:5207/contact .
- Build log and screenshots: `work/business-pages-build.log`, `work/business-*-mobile.png`.

Not deployed. Missing company and commercial facts are awaiting the owner. Preserve the unrelated Ascend work and earlier refund changes when preparing a future isolated production release, and re-check the live source baseline before deployment.
