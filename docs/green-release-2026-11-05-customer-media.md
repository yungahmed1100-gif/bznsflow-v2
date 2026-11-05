# Green release 2026-11-05: Layla understands customer photos and voice notes; the owner sees and hears them

Ahmed (2026-11-05), on a bubble reading "[The customer sent a photo, voice note or file]": "still does not show customers pics or voice notes, lets fix layla make her able to respond to pics and voice notes with accuracy, also i should be able to see it on chat, find best practices serving this goal and lets do it".

## Why
- **The webhook threw media away.** It replaced every photo, voice note, video and file with a placeholder and discarded the media id, caption and Instagram link.
- **Layla's prompt** then told her to say she "can only read text" and give the team contact.
- **The owner saw only the placeholder.** Even Layla's own outgoing product photos never reached the thread.
- **A separate bug:** the hourly `sweepOrphanPhotos` deleted every stored file not listed in a few Hasib tables, including broadcast header files. That is why `clinics_1`'s header image was gone a day after the broadcast.

## What changed (`75567f5`)
- **Webhook:**
  - WhatsApp image, audio (with `voice`), video, document and sticker, and Instagram image, audio, video and file, keep their reference on Vercel only.
  - Convex receives only the kind, type, filename and the caption as text.
  - A 👍 reaction is no longer treated as a message.
  - Locations and contact cards keep a placeholder, and Layla asks for them in words.
- **After Meta has its 200** (`waitUntil`, webhook `maxDuration` 60), `api/_lib/layla/inbound-media.js`:
  - fetches the file from Meta hosts only (`*.whatsapp.net`, `*.fbcdn.net`, `*.fbsbx.com`, `*.cdninstagram.com`), over HTTPS, with at most 3 checked redirects, a type allowlist and size caps (image 5 MB; audio, video and documents 16 MB);
  - stores it in Convex storage;
  - reads it once with `config/media-understanding.js`:
    - **voice note:** `qwen3-asr-flash`, with the business name and catalog names as context, which gives the customer's words;
    - **photo or sticker:** `qwen3-vl-plus` in JSON mode, which gives one factual line, the exact visible text and a catalog match that must be an exact catalog name.
  - Both models can be overridden with `LAYLA_ASR_MODEL` and `LAYLA_VISION_MODEL`.
- **Convex (`media_attach`):**
  - checks the stored file is fresh (≤30 min), unused, and of the right type and size; anything else is deleted;
  - re-enters the inbound path, so a voice note's transcript is captured and answered like typed words.
  - Layla's reply waits for the reading (`awaitMedia`, `MEDIA_WAIT_MS` 20 s), then answers once.
  - If the reading arrives after she has replied, it gets its own reply under its own key.
- **Layla:**
  - **History:** reads `[voice note] <their words>` and `[photo: <what it shows>]`. The reply language comes from the customer's own words, not the English photo description.
  - **Rules:** prices, links and numbers in a customer's media are theirs and never quoted as the business's. The price check still traces only catalog, live facts and the business's own messages.
  - **Catalog matches:** she says a photo "looks like" an item so the customer can correct her.
  - **Safety:** no diagnosis or medical advice from a photo, and no repeating ID or card numbers seen in one.
  - **Unreadable media:** she asks the customer to type or describe it instead of "contact support".
- **Dashboard:**
  - **Bubbles:** photo (tap to open, `alt` = what Layla saw), voice note player with "Transcript / النص", video, file with name and size, plus loading, failed and too-large states.
  - **Chats list:** says "Photo" or "Voice note".
  - Layla's outgoing product photos now show too.
- **Retention:**
  - Media follows text retention: 30 days, or 1 day for clinical packs.
  - The text sweep, row deletion, contact deletion and Instagram unsend delete the file.
  - Only inbound files are deleted; product photos belong to the product.
- **Orphan sweep:** `attachedTo` also checks `blueMessages.by_media_storage` (new index) and `blueCampaignMedia.by_storage`.

## Verification
- **Unit tests:** 1,227 of 1,227 (13 new).
  - `tests/inbound-media.test.mjs`: parsing, host/type/size/redirect refusals, failure reports, catalog-match and model limits, Layla's media lines, Convex file checks, the sweep and retention, and late or repeated readings.
  - `tests/layla-ai-pipeline.test.mjs` runs the real webhook, Convex and Layla turn:
    - an Arabic voice note answered in Arabic;
    - a screenshot price refused;
    - an unreadable photo answered by asking the customer to describe it;
    - the 20 s fallback, then the late reading answered separately;
    - photo plus question in one answer.
- **Browser:** 679 dashboard assertions, adding photo, voice note, file, loading and failed states in AR and EN at 375–1440, axe clean and no overflow.
- **Full check:** `npm run test:release` passed, with 0 audit findings and every browser and end-to-end suite.

## Release
- **Lineage:** live was `dpl_CxiEGsE5UNGhohh5MoRguPaBKnBZ` from `4861add`, which master contains.
- **Convex Green `prod:rare-fish-465` first:**
  - the dry run showed schema validation complete, one added index (`blueMessages.by_media_storage`) and no index deleted;
  - deployed by Claude.
- **Vercel:** `dpl_AfmqdGYNwUGTfMheVMCDCkqvxSfr`, deployed by Claude from a clean `git archive` of `75567f5`.
- **Rollback:**
  - Vercel: redeploy `dpl_CxiEGsE5UNGhohh5MoRguPaBKnBZ`. The old webhook sends `media: true` booleans, which the new validator still accepts.
  - Convex: the schema change is additive.
- **Live check (2026-11-05):**
  - `/`, `/en`, `/layla/dashboard`, `/en/layla/dashboard`, `/audit` and `/apex` return 200;
  - a signed-out dashboard call gets 401, a cross-origin one 403, and an unsigned webhook POST 403;
  - the live bundle carries the transcript and "ما رأته ليلى" ("What Layla saw") strings.

## Not done / blocking
- **The reading models are refused by the Qwen account.**
  - Before building, one synthetic call each with the production key (same key as local, compared by hash only) returned 403 `insufficient_quota`: "The free quota has been exhausted… complete your payment information (or disable the 'use free tier only' mode)".
  - `qwen-plus`, which writes Layla's replies, still answers.
  - **Until Ahmed enables paid usage in Alibaba Cloud Model Studio,** photos and voice notes are kept, shown and playable for the owner, but marked "Layla couldn't read it", and Layla asks the customer to type.
  - The same "free tier only" mode means Layla's own replies stop when `qwen-plus`'s free quota runs out.
- **No live media test yet:** Ahmed's own voice note and photo to the Oman number are the live check. I sent no messages.
- **Old media can't be recovered:** Dento Surg's 2026-11-04 media was discarded before this release.
- **Test Layla** can't simulate a photo or voice note yet.
