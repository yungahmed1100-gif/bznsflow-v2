# Green release 2026-10-18: Paymob checkout for Catalyst and Ascend, Ascend website brief (stage 1: test mode)

**Authorization:** Ahmed, 2026-10-18: "go" to commit, test and deploy, after he set the terms and approved the plans.
**Decisions:** vault `Decisions/2026-10-18-Catalyst-Monthly-Yearly-Price` (BF-2026-10-18-CATALYST-PRICE) and `Decisions/2026-10-18-Ascend-Price` (BF-2026-10-18-ASCEND-PRICE).

## Release

| | |
|:---|:---|
| Source | `d50fe50` on `feat/paymob-billing`. It contains `f83da94` and `48a90b5`, the source of the previous production deployment |
| Convex | `rare-fish-465` (Green). Ahmed ran `npx convex deploy`. Additive only: tables `billingPayments`, `websiteBriefs`, `websiteBriefFiles` and their 7 indexes; optional fields on `blueAccessGrants` |
| Website | `dpl_HEh8ZxrBfWfF3TerQMDfW1C9FjuA`. Ahmed ran `npx vercel deploy --prod --yes`, aliased to www.bznsflowai.com |
| Previous production | `dpl_3EwqiSUZuU6RVpsZPUfGECvKXBzt` (rollback target) |
| Vercel Production env | `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET` (test keys), `PAYMOB_INTEGRATION_IDS=70517` (test card), `PAYMOB_BASE_URL`, `PAYMOB_TEST_EMAILS=ahmed+paymob@bznsflowai.com` |

## What changed

- **Online payment:** Catalyst OMR 9 a month or 89 a year, and Ascend OMR 29 a month or 289 a year (for one live industry), on Paymob Oman's hosted checkout.
- **Callback checks:** each callback is checked by HMAC-SHA512, matched to its pending payment by amount and currency, and counted once.
- **Grace:** a paid plan ends 3 days after `paidUntil`. During those days every dashboard tab warns when access will be denied.
- **Test-key gate:** with test keys, only `PAYMOB_TEST_EMAILS` see or use checkout. Live keys open it to every signed-in customer.
- **Ascend website brief:** at the top of Settings › Business details, with a reminder on every tab until it is sent. Each version is emailed through Resend to ahmed@bznsflowai.com, with the logo and photos attached.

## Evidence

- **Local:** all unit suites pass (`npm test`), including `tests/paymob.test.mjs` (22) and `tests/website-brief.test.mjs` (11). `typecheck:convex` and the build pass. `test:release` passed on `d50fe50`, including 323 dashboard browser assertions with the new brief scenario.
- **Paymob sandbox:** a test intention for 9000 showed **OMR 9.000** on Oman's Unified Checkout, so amounts are in baisa.
- **Live checks:**
  - `/`, `/en`, `/services`, `/contact`, `/catalyst/setup` and `/layla/dashboard` return 200.
  - `GET /api/paymob-checkout` returns 405, and a signed-out POST returns 401 `sign_in_required`.
  - An unsigned `POST /api/paymob-webhook` returns 401 `signature`.
  - `?surface=website-brief` without a session returns 401.

## Remaining release gaps

1. **Test-mode end-to-end payment on production:** sign in as `ahmed+paymob@bznsflowai.com`, pay with Paymob's test card, and confirm the callback arrives, the grant activates and the website brief email arrives. Not yet run.
2. **Stage 2, live keys:** put the live keys in Vercel, set `PAYMOB_INTEGRATION_IDS=71727,71726`, remove `PAYMOB_TEST_EMAILS` and redeploy. Then make one real OMR payment and refund it.
3. **Brief email on Green:** Resend has not yet been exercised from production for this email.
4. The Notion mirror of both decisions is pending.
