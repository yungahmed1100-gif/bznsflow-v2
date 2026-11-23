# Green release 2026-11-23: check the payment method again after a payment stop

Ahmed (2026-11-23), about the alert "Meta stopped your broadcast: your Messaging account in Meta needs a working payment method": "lets make a buton so user can remove it after checking payment method connection". Then: "refactor then deploy to productiion".

## What changed (`9c7698d`)

- **Button on the alert:** "Check payment method again" / «تحقّق من وسيلة الدفع مجدداً».
- **API action `campaign_billing_check`** (`api/_lib/layla/dashboard-api.js`):
  - Runs Convex `campaign_detail` first, so plan, role and ownership are settled before any Meta read.
  - Refuses a broadcast that was not stopped for payment (`campaign_not_payment_stopped`).
  - Reads the Messaging account's `primary_funding_id` (`fetchFundingSource` in `api/_lib/layla/templates.js`).
  - Not behind the broadcast switch, because it only reads.
- **Results:**
  - **Meta shows a payment method:** Convex `campaign_billing_checked` records `billingCheckedAt`. The alert becomes the one-line fee note, and the resend dialog drops "Fix the payment method first".
  - **Meta shows none:** the alert stays, with a line saying so.
  - **Meta can't be reached:** the alert stays and says to try again.
- **Unchanged:** the broadcast keeps its stop reason and its resend list.
- **AI Connections (MCP):** `dashboard_campaign_billing_check` hands off to the dashboard.
- **Refactor:**
  - The Convex tests share one payment-stop setup (`sendFirst`).
  - The browser tests share one stopped-broadcast fixture (`paymentStopped`).
  - The notice renders the success line once.

## Evidence

- **Tests written first:**
  - 3 Convex tests: mark checked, other tenant refused, non-payment stop refused.
  - 1 API test: found, none, Meta down, employee refused before Meta, non-payment stop refused before Meta.
  - 2 browser scenarios: none found, then found, in English at 1280 px and Arabic at 375 px.
- **Unit tests:** 1,268 pass.
- **Dashboard browser suite:** 720 assertions.
- **Release check:** `npm run test:release` on a clean `git archive` of `9c7698d` passed with every suite.
  - An earlier run on the working tree had one home-page Paymob timing failure. That test passed alone twice and passed in the archive run.
- **Visual diff against `green-broadcast-resend`:** 172 screens, 0 differences. The payment alert is covered by the dashboard browser suite, not the visual-diff screens.
- **Lineage:** live was `dpl_3yFAtrXR` from `007a502`. `9c7698d` contains it and every earlier `green-*` tag.

## Release

- **Convex Green `prod:rare-fish-465` first:**
  - The dry run showed schema validation complete and no index deleted.
  - The "Node.js actions version" line is blank on both sides, and Green has no `use node` files.
  - Deployed by Claude.
- **Vercel:** deployed by Claude from the archive.
  - `dpl_h3agy7kbf…` and then `dpl_jWLLpKjYXqYY6bwnqfXioKTURJvL` were built from the same source (the first deploy's output was cut off, so it ran twice).
  - `dpl_jWLLpKjY` serves `www.bznsflowai.com`.
- **After:**
  - Health 16/16.
  - `/`, `/en`, `/apex`, `/audit`, `/privacy`, `/services`, `/contact` and both dashboards return 200.
  - An unsigned `campaign_billing_check` gets 401 `sign_in_required`.
  - The live bundle contains "Check payment method again".
  - No runtime errors.

## Rollback

- **Vercel:** promote `dpl_3yFAtrXRfAQgFU9Gkek2dJ35cN6F`.
- **Convex:** `billingCheckedAt` is optional and the operation is only added, so the old site runs against the new functions.

## Not verified

- Whether Meta returns `primary_funding_id` to the customer connection's token is not yet observed live. Pressing the button on the `clinics_1` alert (that account has VISA *9817) is the live check. If the field is not returned, the alert will keep saying no payment method was found.
