# Refund policy release — 12 October 2026

Owner authorization: “add a refund policy page and deploy it we only refund if what we said is not working”.

## Delivered

- Arabic `/refund` and English `/en/refund`, using the existing legal-page design.
- Refunds for failures to deliver agreed functionality or work; no change-of-mind refund for a service delivered as agreed. The page explains evidence, review, affected fees, setup fees and third-party charges without inventing a claim deadline or processing guarantee.
- Existing contractual guarantees and mandatory legal rights are preserved. General background checked against the Oman Consumer Protection Authority's explanation of service remedies under Article 23: https://cpa.gov.om/en/Pages/NewsDetail.aspx?NewsID=11067 . This is not a certification of legal review.
- Homepage footer and legal-page navigation links, bilingual metadata, prerendering and sitemap entries.

## Source and isolation

Runtime source: `86c13f121f74f2f13b2a84bbce2f6395a7f3dbc3`, branch `release/refund-policy-2026-10-12` (policy commit `c2cc7d2`, footer separation `86c13f1`). Built from a committed archive in `work/refund-policy-deploy`; no private env files, design assets or unrelated uncommitted dashboard/automation work included.

The production baseline changed during preparation from `92b49a2` to `e216661` / `dpl_9bMj3hLBaJcHU8dGsf1NHZfHV95j`. The policy branch was rebased onto the newly deployed `e216661` before final deployment. Older candidates were never promoted. The final archive's Dashboard, SignIn and AccessAdmin bundle names match that baseline. No Convex deployment, credential change or outbound message was performed.

Policy source changes are also present in the main working tree, preserving its development-only Ascend route edits. The release branch was not pushed remotely by this task.

## Verification and deployment

- Isolated archive production build: passed.
- Local refund browser checks: 35 passed (EN/AR, keyboard language switching, 320/390/768/1440 widths, no horizontal overflow, no serious/critical axe findings, no-JavaScript content, canonicals/hreflang, links, sitemap).
- Existing local homepage checks: 36 passed.
- Vercel candidate: both policy routes returned expected content before promotion.
- Final deployment: `dpl_EJmNLsdAkJU2kD5BfPC4ik7XSZ5S`, https://bznsflow-main-dd53h1wjm-yungahmed1100-7330s-projects.vercel.app . Promoted successfully to https://www.bznsflowai.com . Public domain inspection reports READY and this deployment ID.
- Live checks: both policy URLs returned expected HTML; all 35 refund browser checks passed on the public domain. These checks cover public pages, not signed-in dashboards or live messaging.
- Local evidence: `work/refund-policy-*.log`, `work/refund-policy-check.mjs`, `work/refund-live-*.html`, `work/refund-live-deployment.json`.

Rollback, if separately needed: promote `dpl_9bMj3hLBaJcHU8dGsf1NHZfHV95j`. No backend rollback is needed for this page-only release.

## Footer overlap correction

Ahmed reported the fixed Layla launcher obscuring the refund link and asked to place the policies in the middle with Terms of Service. Source `cdba8c4576e8ba867d5241318ba8818fd5761f4f` centers a semantic policy navigation row (Privacy, Refund, Terms), gives links 44px tap targets and reserves footer space for both floating launchers and the mobile CTA. Removed the later 96px mobile footer-padding override that defeated clearance.

Build passed. A focused browser regression hit-tested nine points in every policy link and actually clicked each destination, with the chat invitation visible, in both languages at 320, 390, 768, 1024 and 1440 pixels: 120 checks passed locally and 120 on production. Screenshots: `work/refund-footer-{en,ar}-{390,1440}.png` (the final run captures production).

Deployed and promoted `dpl_Bj6JfPtLPp93k64NKt5rKdPfMXXJ` (https://bznsflow-main-4kwa45j39-yungahmed1100-7330s-projects.vercel.app). Public-domain inspection confirms this READY deployment. Rollback for this CSS/navigation correction is the preceding refund deployment `dpl_EJmNLsdAkJU2kD5BfPC4ik7XSZ5S`. No backend changes or outbound messages.
