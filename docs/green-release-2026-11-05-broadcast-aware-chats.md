# Green release 2026-11-05: Layla reads the broadcast, every recipient gets a chat

Ahmed (2026-11-04), after the `clinics_1` broadcast: "after a broadcast layla should be adapted to the messages she gets after also show the broadcasted messages in the chat". Then: "the customer answered with something layla should adapt to their answer". Chosen options: every recipient gets a chat; business auto-replies are answered anyway.

This is Release 1 of the approved plan; the plan's Release 2 (customer media) and Release 3 (WhatsApp-style chat screen) follow.

## Why it was needed
- Dento Surg replied "أرسلوا التفاصيل" ("send the details") to `clinics_1`. Layla answered "how can I help you today? what do you need?", as if they had written out of the blue.
- Template sends live only in `blueCampaignRecipients`. Layla's history (`transcript` in `convex/laylaTurn.js`) read `blueMessages` only.
- A recipient who never replied had no `blueConversations` row, so they never appeared in Chats.
- The broadcast bubble showed the text but not the header image.

## What changed (`49fd226`, `f39432c`)
- **Shared helper** `convex/blueTemplateSends.js`: `templateSendsFor`, `sentText` and `openTemplateChat`. The thread and Layla read the same sends.
- **Layla's history:** sends that reached WhatsApp in the last 7 days appear as `business` turns, merged by time. Pending, cancelled, blocked and failed sends are left out.
- **Prompt** (`config/layla-ai.js`):
  - a business turn is shown as an assistant turn prefixed `[your business's WhatsApp message to this customer]`;
  - replies such as "details", "yes" or "how much" are read as answers to that message;
  - after a business message, Layla introduces herself in a few words and never asks "how can I help" as if they wrote first;
  - prices and links written in the business's own message may be repeated exactly. Everything else still comes only from BUSINESS DATA.
- **Validation:** `untracedAmount` (`config/layla-prices.js`) also accepts numbers from the business's own messages. Any other price is still refused.
- **Every recipient gets a chat:** when the send worker records `submitted`, the contact's conversation is opened, or moved to the top if it exists (`convex/blueCampaignState.js`).
- **Chats list:** when the latest activity is a broadcast, the preview reads "Broadcast · …" / "بث · …".
- **Header image in the bubble:** image, video or file link above the text. When the file is gone, a chip names it.
- **Retention:** header files used by a campaign are kept until 30 days after it ends (`SENT_MEDIA_RETENTION_MS`); unused uploads are still deleted after a day.
- **Smaller fixes:**
  - chat export includes broadcast messages;
  - the overview's open-handoff scan covers 400 recent chats instead of 125.
- **Report-Only CSP:** `img-src` adds `https://*.convex.cloud`, and `media-src 'self' https://*.convex.cloud` is added.

## Verification
- **Unit tests:**
  - `tests/blue-campaigns.test.mjs`: an accepted send opens a chat with a broadcast preview; failed sends open none; Layla reads the broadcast and may quote its price; the 30-day retention.
  - `tests/layla-ai.test.mjs`: the business-message context, and price and link validation.
- **Browser test:** `tests/layla-dashboard-browser.mjs` adds the broadcast chat at 375 and 1280 px.
- **Regression found and fixed** (`f39432c`): messages sharing a timestamp came out in the wrong order after the merge.
- **Full check:** `npm run test:release` passed:
  - 1,214 of 1,214 unit tests, the Convex typecheck and the build;
  - `npm audit` with 0 findings;
  - all 15 shared browser suites, every sector suite and Ascend end-to-end (107).

## Release
- **Lineage:** live was `dpl_9qKomhhgryuWyKBVAyJ8qpx1PhVe` from `128aa1c`, which master contains.
- **Who deployed:** Ahmed ran both commands from a clean `git archive` of `f39432c`. Claude Code's auto mode had refused the production deploy.
- **Convex Green `prod:rare-fish-465` first.** The dry run and the push both reported no index deleted.
- **Vercel:** `dpl_4EX2zd4PoUAsqCVZkhDLmP8dqNnf`, production on `www.bznsflowai.com`.
- **Rollback:**
  - Vercel: redeploy `dpl_9qKomhhgryuWyKBVAyJ8qpx1PhVe`.
  - Convex: the changes are additive (no schema change), so the old site runs against the new functions.
- **Live check (2026-11-05):**
  - `/`, `/en`, `/apex`, `/audit`, `/privacy`, `/layla/dashboard` and `/en/layla/dashboard` return 200;
  - an anonymous dashboard `thread` call gets 401 `sign_in_required`; a cross-origin call gets 403 `origin`;
  - the live bundle contains `ld-preview-label`, `ld-bubble-media` and the "Broadcast" / "بث" label;
  - the CSP header carries the new `img-src` and `media-src` entries;
  - the Dento Surg thread shows the `clinics_1` send as a template bubble with `media.kind: image`.

## Not done
- **Header file of `clinics_1`:** its URL is already null. The old one-day sweep deleted it before this release, so the bubble shows the chip. Campaigns sent from now on keep their file for 30 days.
- **No retroactive chats:** `clinics_1` recipients who never replied get no chat. Only sends accepted from now on open one.
- **Layla in context:** not yet observed on a real reply; the next customer reply to a broadcast is the live check.
- **Customer media:** Dento Surg sent a photo, voice note or file at 18:26 Muscat on 2026-11-04. It is still discarded at the webhook; that is Release 2.
- **MCP:** `messaging_state` does not list template sends, and `campaign_create` still cannot send image, video or PDF header templates.

## Follow-up: no blank space when scrolling past the chat (`4861add`)
- **Report:** Ahmed (2026-11-05), with a screenshot of blank paper under the reply box: "still the empty space when scrolling down".
- **Cause:**
  - In a browser at 1280×720, 1440×900 and 375×740, the dashboard shell fits the screen exactly: the page's scroll height equals the window. That holds with the founder bar too.
  - Nothing set `overscroll-behavior`, so on macOS scrolling past the end of the messages or the chat list chained to the page. The page rubber-banded the whole shell up and showed blank paper.
- **Change:** `html` and `body` on the dashboard no longer overscroll. `.ld-main`, `.ld-nav`, `.ld-conversations` and `.ld-messages` each contain their own scroll.
- **Verification:**
  - `tests/layla-dashboard-browser.mjs` checks the overscroll rules and that the page never scrolls, at 1440, 1024, 768, 375 and 320 px (627 assertions).
  - Full `npm run test:release` passed.
  - Headless Chromium has no elastic scrolling, so the bounce itself was not reproduced; this needs Ahmed's check on his Mac.
- **Release:** Vercel only; no Convex change since `f39432c`.
  - Deployed by Claude from a clean `git archive` as `dpl_CxiEGsE5UNGhohh5MoRguPaBKnBZ`; rollback is `dpl_4EX2zd4PoUAsqCVZkhDLmP8dqNnf`.
  - The live CSS contains `html:has(.ld),html:has(.ld) body{overscroll-behavior:none}`, and the main pages return 200.
