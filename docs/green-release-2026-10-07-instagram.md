# Green release, 2026-10-07: Instagram opened for customers

Owner: Ahmed. Meta approved the Instagram features; Ahmed asked to "apply all deployments of the feature, make sure it matches the WhatsApp replies and open for customer onboarding". This record separates local evidence from production evidence and lists what is still pending.

## Why flags alone were not enough

With every flag on, an Instagram customer would still have got nothing, for five reasons:

1. **No ingress.** The Green webhook accepted WhatsApp payloads only. The Blue-era routing had been dropped at the Green cutover.
2. **Wrong variable names.** The code read `GREEN_INSTAGRAM_APP_*`, but production holds `MAIN_INSTAGRAM_APP_*`.
3. **Tester allowlist on Green.** A leftover allowlist (`BLUE_INSTAGRAM_TEST_SENDERS`) blocked every reply, and the chat was never flagged.
4. **Activation trap.** "Activate replies" failed from 60 seconds to 24 hours after connecting.
5. **Lost early messages.** DMs that arrived before activation were dropped.

## What changed

- **Webhook** (`api/layla-meta-webhook.js`): routes on `object`.
  - WhatsApp payloads need the parent app secret.
  - Instagram payloads need the Instagram app secret or the parent secret.
  - Meta verifies with `GREEN_WHATSAPP_VERIFY_TOKEN` or `GREEN_INSTAGRAM_VERIFY_TOKEN`.
  - Ingress is kept while Instagram sending is paused.
- **Config:** `MAIN_INSTAGRAM_APP_ID`/`_SECRET` are honoured. Deauthorize/delete callbacks and webhook ingress work even while replies are closed.
- **Allowlist:** the tester allowlist applies on Blue only.
- **Activation:** a successful token check records `tokenCheckedAt` (additive), and the daily subscription proof keeps its own clock.
- **Early DMs:** DMs before activation are stored and answered by no one until the owner activates.
- **Reply parity with WhatsApp:**
  - the same answers;
  - the same one acknowledgement and reason for photos, voice notes, shares, story mentions and long text;
  - ice breakers are answered;
  - a `@handle` is never treated as the customer's name.
- **Instagram limits:** replies fit 1000 UTF-8 bytes, cut at a sentence. Owner replies over the limit are refused before sending.
- **Failures:** one recipient's failure (window closed, account unavailable, Meta throttling) flags that chat (`send_failed`) instead of pausing the business. Connection and permission failures still pause.
- **Sending limits** (`RATE_LIMITS`):

  | Limit | Value |
  |---|---|
  | Per business, per minute | 30, as a pace: bursts wait and are never dropped |
  | Per business, per day | 1000 |
  | Global, per day | 10000 |
  | Per conversation | 10 automated replies per hour (unchanged) |

## Local verification

- **Unit tests:** 982/982, including the following new suites:
  - `green-webhook` (signatures, both verify tokens, paused ingress);
  - activation 2 minutes and 23 hours after connecting;
  - early DMs kept;
  - recipient failure does not pause the business;
  - the quality rubric on **both channels × three tones × 24 conversation types**;
  - **24 parity tests** asserting identical replies, captured fields and handoff reasons on WhatsApp and Instagram;
  - ice breaker, story mention, and a long Arabic answer within 1000 bytes.
- **`customer-journey-e2e`**, through the real API handlers:
  1. Ahmed grants access.
  2. The customer signs in with an emailed code. Setup is refused before the grant and opens after it.
  3. The customer saves, publishes and claims `bzns.md`.
  4. Instagram OAuth: connect, callback, subscribe.
  5. The customer activates 5 minutes later.
  6. A signed DM arrives through the webhook, and the worker sends it out.
  7. Layla replies "Hello, Sara, I'm Layla from Qurum Coast Properties…", then gives the FAQ answer word for word.
  8. The owner's inbox lists the Instagram chat with the name, need, property type and area captured.
  9. The same journey on WhatsApp gives the same answers.
- **Release gate:** see below.

## Production steps

1. Env vars (new deployments only): `GREEN_INSTAGRAM_VERIFY_TOKEN`, `GREEN_INSTAGRAM_APPROVED=true`, `GREEN_INSTAGRAM_ENABLED=true`.
2. Clean archive build.
3. Vercel candidate.
4. Convex dry run, then deploy (additive `tokenCheckedAt`).
5. Promote.
6. Smoke checks.

The script is `work/release/ship-instagram.sh`. **Rollback:** promote `dpl_27LnDpq8mkPtfYekcmhbLV7a83Zu` and keep Convex.

## Meta state, read with the developer MCP on 2026-10-07

Parent app `bznsflowai` (`1388038082832745`):
- **App review:** submission `1397975051839048` approved; review completed 2026-10-06.
- **Mode:** Live.
- **Permissions:** `instagram_business_basic` and `instagram_business_manage_messages` have Advanced access and are live. The extra permissions that were requested (Human Agent, content publish, insights, comments and others) were rejected, so none are granted and nothing needs removing.
- **URLs:** privacy, terms and data-deletion already point to Green.
- **Contact email:** not verified. Verify it in Basic settings.
- **Webhooks:** only `whatsapp_business_account` (callback on www.bznsflowai.com, fields `messages`, `smb_message_echoes`). **No Instagram subscription yet.**
- **Instagram OAuth redirect:** not exposed by the MCP. Check it in the dashboard.

## Meta dashboard (Ahmed, after promotion)

Use the Instagram app whose ID production holds as `MAIN_INSTAGRAM_APP_ID`.

1. **Webhooks → Instagram:**
   - callback `https://www.bznsflowai.com/api/layla-meta-webhook`;
   - verify token from `.env.green-instagram.local`;
   - subscribe to `messages`.

   This moves Instagram off Blue.
2. **Instagram business login:**
   - OAuth redirect `https://www.bznsflowai.com/api/layla-meta`;
   - deauthorize `https://www.bznsflowai.com/api/layla-meta?surface=instagram-deauthorize`;
   - data deletion `https://www.bznsflowai.com/api/layla-meta?surface=instagram-delete`.
3. **Basic settings:** privacy `https://www.bznsflowai.com/en/privacy`, terms `https://www.bznsflowai.com/en/terms`.
4. **App Review:**
   - Advanced Access granted for `instagram_business_basic` and `instagram_business_manage_messages`;
   - app in Live mode;
   - the unused requested permissions removed.
5. **Each customer:** a professional Instagram account, with Settings → Messages and calls → Connected tools → **Allow access to messages** turned on.

## Live customer test (Ahmed acts; replies are scored afterwards)

**Setup:**
1. Grant a test email at `/owner/access`.
2. Sign up with it, then Setup Catalyst.
3. Use the real-estate `bzns.md` template, fill it in, then Publish.
4. Connect a test Instagram professional account, then Activate.

**Messages:** from a personal Instagram account, send these one at a time, waiting for each reply. Then send the same list to the WhatsApp pilot number.

| # | Message | Expected |
|---|---|---|
| 1 | Hi | Welcome with the business and Layla; asks for your name and what you want |
| 2 | (your first name) | "Thank you, <name>." plus the next question |
| 3 | looking for a 2 bedroom apartment to rent in Qurum | "Thank you." plus the next question; captures rent, apartment, Qurum, 2 bedrooms |
| 4 | Are viewings free? | Your FAQ answer, word for word |
| 5 | how do viewings work | Your viewings section, word for word |
| 6 | where is your office | Your location |
| 7 | thanks | "You're welcome…" |
| 8 | 👍 | No reply |
| 9 | السلام عليكم | Arabic reply |
| 10 | ابي فيلا للايجار في الموج | Arabic thank-you plus question; area الموج |
| 11 | (send a photo) | One acknowledgement, then handed to your team (`unsupported_media`) |

**Then:**
- Resume the chat from the dashboard.
- Send "any discount?". Expected: the negotiation reply, handed to your team (`negotiation`).
- Check the dashboard inbox: both chats are listed, with the fields above and the handoff reasons.

## Production evidence

| Item | Value |
|---|---|
| Source | `8f56d51` (clean archive, 12 functions) |
| Vercel | `dpl_BJi4kXG5SGZHSHpg6eUdP2GKcJ37`, promoted 2026-10-07 by Ahmed (`ship-instagram.sh`) |
| Convex | `rare-fish-465` deployed; the dry run reported only an empty Node-actions version change; no index deletions |
| Env (production) | `GREEN_INSTAGRAM_VERIFY_TOKEN`, `GREEN_INSTAGRAM_APPROVED=true` and `GREEN_INSTAGRAM_ENABLED=true` set as secrets |
| Rollback | promote `dpl_27LnDpq8mkPtfYekcmhbLV7a83Zu`; keep Convex |

**Unauthenticated smoke checks after promotion:**
- `GET ?surface=instagram`: `sign_in_required`. Before the release it answered `available:false`, so Instagram is now open to signed-in owners.
- Webhook GET with the Instagram verify token: returns the challenge (200).
- Unsigned Instagram POST: 403.
- Pages: `/`, `/catalyst/setup`, `/signin` and `/en/catalyst/setup` all returned 200 in under 0.8 s, three rounds.
- One 20-second timeout on `/` during the checks did not repeat in three later rounds. Ahmed's Meta dashboard was not loading at the same moment, which points to a local network blip.

**Still pending:**
- the Meta Instagram webhook subscription;
- an OAuth redirect check in the dashboard;
- a real Instagram DM answered (the live test script above).

`ship-instagram.sh` stopped at its first quick check (a `grep` that expected `"available"` under `set -e`); the script is fixed.
