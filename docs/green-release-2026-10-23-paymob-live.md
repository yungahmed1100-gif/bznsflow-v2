# Green release 2026-10-23: Paymob live for every customer, "Secured by Paymob" on the plan cards

**Authorization:** Ahmed, 2026-10-23: "add payment gateway and push it to production, add paymob logo saying its safe and secured by paymob, polish ui then push live". His answers:
- Everyone can pay. Before this release, only test addresses could.
- He put the live keys in `.env.local`; I copied them to Vercel.
- The badge shows Paymob plus the card brands, on the plan cards only.
- The polish covers only the pay block.

## Live keys: checked before release

These checks were run from `.env.local`. No key value was printed, and no card was charged; the intentions only reserved checkout pages that then expired.

- **Format:** `PAYMOB_SECRET_KEY` and `PAYMOB_PUBLIC_KEY` are both live (`omn_sk_live_…`, `omn_pk_live_…`), and the pair matches. `PAYMOB_HMAC_SECRET` is set (32 characters).
- **Integration IDs:**
  - With the live IDs, Paymob creates the intention, and the hosted page shows **OMR 9.000** under bznsflow's name with a Card form for Visa, Mastercard, American Express and Maal.
  - The old test ID 70517 is refused with live keys, as expected.
- **OmanNet isn't live:**
  - Integration **71726** is accepted, but its page shows **no payment method**.
  - So production uses **71727 (Card) only**, and the site no longer says "or OmanNet".
  - To offer OmanNet, Paymob has to activate 71726 on the Unified Checkout. Then add it back to `PAYMOB_INTEGRATION_IDS`, and add the mark to `PaymobBadge`.

## What changed

- **Opening payments:** no server code changed. `paymentsOpen()` (`api/_lib/paymob.js`) opens checkout to every signed-in account once the secret key isn't a test key.
- **Badge** (`src/components/sections/PaymobBadge.jsx`):
  - "Safe and secured by" with Paymob's wordmark, then the cards the live checkout takes: Visa, Mastercard and American Express.
  - The marks are self-hosted SVGs in `public/payments/`, so the CSP is unchanged:
    - Paymob's own checkout logo;
    - the official Visa, Mastercard and Amex marks from Wikimedia Commons, run through svgo.
- **Pay block polish** (`PlanPay.jsx`, `offer-sections.css`):
  - The pressed button reads "Opening Paymob…" with `aria-busy` while both buttons wait.
  - Status messages use DESIGN.md's 4px radius, and the paid and ending messages carry an icon.
  - The industry select follows the input style: card fill, hairline border, 4px radius and a blue focus ring.
- **Vite 6.4.3 → 6.4.4:**
  - The release gate (`npm audit`) failed on five new advisories against Vite ≤6.4.3: launch-editor, dev middleware and `server.fs.allow`.
  - All of them are dev-server only. 6.4.4 (released 2026-10-06) fixes them, and 6.4.5 was 2 days old, so it wasn't taken.
- **Strings:** `tier_pay_note` ("card or OmanNet") is replaced by `tier_pay_secured`, `tier_pay_cards` and `tier_pay_opening`, in EN and AR.

## Evidence (local)

- **Unit tests:** `npm test` and `npm run test:access` (91) pass.
- **Build:** passes.
- **`tests/home-browser.mjs`:** 112 checks, passing on 4 consecutive runs. A new pay-block scenario in EN and AR covers:
  - the badge text;
  - the four marks loading with their names;
  - no OmanNet claim;
  - the busy label, with both buttons disabled and one checkout request;
  - no overflow at 320–1440;
  - no serious axe issues at 375 and 1440.
  - The test now waits for running transitions before axe measures. Resizing past the mobile breakpoint fades the account menu, and measuring mid-fade reported false contrast failures.
- **Release check:** `npm run test:release` passes.
- **Audit:** 0 vulnerabilities.
- **Release check details:** 403 dashboard checks, 112 home checks and 83 Ascend end-to-end checks.

## Release

| | |
|:---|:---|
| Source | `0adef19` on `master`, pushed; contains the live `ac52b83` |
| Convex | No change |
| Vercel env (Production) | `PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY` and `PAYMOB_HMAC_SECRET` replaced with the live values from `.env.local`, piped and never printed. `PAYMOB_INTEGRATION_IDS=71727`. `PAYMOB_TEST_EMAILS` removed |
| Website | `dpl_4jANqNQ5Ccf8tVNyQ7yNziDRGjJx` (`bznsflow-main-mcw49bf29`), aliased to www.bznsflowai.com |
| Previous production | `dpl_33YGzZxTP6YBhAuDkRN6euHNsvgr` (rollback target). Rolling back also needs the test env values restored |

## Live checks (2026-10-23)

- `/`, `/en` and `/layla/dashboard` return 200.
- `/payments/{paymob,visa,mastercard,amex}.svg` return 200 as `image/svg+xml`.
- No served script mentions OmanNet.
- `GET /api/paymob-checkout` returns 405, and a signed-out POST returns 401 `sign_in_required`.
- **Webhook signatures:**
  - An unsigned `POST /api/paymob-webhook` returns 401 `signature`.
  - A callback signed with the local live HMAC, marked unsuccessful, for a made-up order, returns 200 `unknown_payment`. Nothing was written.
  - The same callback signed with a wrong secret returns 401. Production therefore verifies with the live HMAC.

## Remaining gaps

1. **Real payment not yet made:** Ahmed should sign in with a customer account and pay Catalyst monthly (OMR 9) with a real card. Then check three things:
   - the return shows "Payment received … active until";
   - the dashboard opens;
   - a successful callback arrived, where the logs show `applied: true`.

   Then refund the payment in the Paymob dashboard. The owner address ahmed@bznsflowai.com doesn't see the pay buttons by design, so a separate account is needed.
2. **The secret key in production** was checked only through the local file it was copied from. The first real checkout confirms it.
3. **OmanNet:** ask Paymob to activate integration 71726 on the Unified Checkout.
