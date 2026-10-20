# Green release 2026-10-20: broadcast billing guidance, playbook email opt-in

**Authorization:** Ahmed, 2026-10-20: "finalize and polish everything then push to production". He also decided to keep the playbook email opt-in, which was already live from the 19 Oct CLI deploys, and commit it separately.

## Why

- **The failed broadcast:** Ahmed's `marketing_ar` broadcast (11 Oct, 100 Saudi recipients) delivered nothing. Meta failed 98 with **131042**, a payment issue: the WhatsApp Business account had no working payment method. 2 failed with 131026, undeliverable. The campaign kept trying every recipient after the first billing failure.
- **Who pays Meta:** BznsFlow is a Meta Tech Provider, so every customer pays Meta for their own broadcast messages. Until this release, nothing in the product said so.
- **Production ahead of git:** two CLI deploys on 19 Oct (`dpl_G9HonyLa4L9ZhPnuNv41JL6SuPLZ` at 20:50 and `dpl_4sPKcct5t6Jv9d8HrEqH3GHekGQc` at 21:03 Muscat time) shipped uncommitted working-tree changes. This release commits them, so git matches production again.

## What changed

- **Broadcast tab:**
  - A card explains how to add a payment method in Meta Billing & payments, and says Meta bills each delivered message while BznsFlow doesn't charge for messages.
  - The card turns coral when Meta stopped the latest broadcast for billing, and shrinks to one line once a broadcast has been delivered.
  - The send step and the Catalyst/Ascend plan cards carry the same line.
  - Ahmed's decision: no prices in the product, only a link to Meta's rate page.
- **131042 stops the campaign** with reason `payment_method_required`, both from the delivery receipt (`stopForPayment`, `convex/blueCampaignState.js`) and at send time (`CAMPAIGN_BLOCKING`). Error 131026 still does not stop it.
- **Stop reasons and common Meta failure codes in words:** 131042, 131026, 131049 and 131047, in EN and AR.
- **Playbook email opt-in:**
  - An unticked checkbox requests a three-email series through the outreach Worker (`api/_lib/email-subscription.js`, consent version `subscriber-v1`). The series starts only after the person confirms.
  - Polished: the strings moved to i18n and the styles to `playbook.css`.
  - The Worker call now runs in parallel with the Sheet write, so it no longer adds up to 6s to an opted-in visitor's wait.
- **Button flash fixed:** buttons no longer animate `background-color` (`src/styles/product.css`, `layla-dashboard.css`). A button becoming enabled used to show light text on a light background for 120ms. This is also why `product-setup-browser` failed intermittently: axe measured 3.25:1 contrast mid-fade.

## Evidence (local)

- **Unit tests:**
  - `tests/blue-campaigns.test.mjs`: 17 pass. The new 131042 tests failed first on the old code.
  - `tests/email-subscription.test.mjs`: 4 pass.
  - `npm test` passes.
- **Type check and build:** `typecheck:convex` and the build pass.
- **Browser tests:**
  - Dashboard: 345 checks pass. They cover the fee card with its links, the send-step line, the stopped-campaign alert in EN 1280 and AR 375, error meanings and the one-line state.
  - Home: 78 checks pass, including the plan-card fee line in EN and AR.
  - `product-setup-browser`: 15 of 15 consecutive runs pass after the transition fix. Before, about 1 run in 4 failed.
- **Playbook form:** checked at 375 and 1440 in EN and AR with no serious axe issues, no overflow, and the opt-in reaching its pending screen against a mocked `/api/lead`.
- **Release check:** `npm run test:release` passes.

## Release

| | |
|:---|:---|
| Source | `master`, see the commits below |
| Convex | `rare-fish-465` (Green): receipt change only, no schema change |
| Website | _filled in after deploy_ |
| Previous production | `dpl_4sPKcct5t6Jv9d8HrEqH3GHekGQc` (rollback target) |

## Remaining gaps

1. **Opt-in not exercised end to end.** It has not been tried against the real outreach Worker from production. Whether `OUTREACH_SUBSCRIPTION_TOKEN` is set in Vercel Production was not verified; without it, opted-in visitors see "subscription request failed" and still get the guide.
2. **Billing link not opened while signed in.** Meta blocks automated requests, so the link `business.facebook.com/billing_hub/accounts` has not been checked from a logged-in account.
3. **Ahmed's own WhatsApp Business account still needs a payment method** before `marketing_ar` can be resent.
