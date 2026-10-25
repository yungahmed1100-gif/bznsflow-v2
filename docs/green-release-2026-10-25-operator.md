# Green operator change 2026-10-25: Basma Muscat Dental Clinic moved to Dental, chats cleared

**Authorization:** Ahmed, 2026-10-25. Owners pick their sector only when they make their account. Assign yungahmed1100@gmail.com (عيادة بسمة مسقط للأسنان) to Dental clinics, and reset its messages while keeping all business settings.

**Code** (`21dac52`; Convex Green only, no Vercel change):
- **New operator command** `blueReset:messages {email, dryRun | confirm}`.
  - It deletes the account's messages, conversations, takeover history and chat contacts.
  - It keeps the setup and bzns.md, the WhatsApp connection, Layla's control, the catalog, business settings, the plan and Hasib's records.
  - It refuses while a reply is being sent.
- **`grantPlan` with a `packId`** now also sets `accounts.industry`, so the workspace and BznsBrain show the same sector.
- **Tests:** unit tests in `tests/blue-reset.test.mjs` and `tests/hasib-plans.test.mjs`. Removing each of 4 guards fails a test.

**Run on Green** (`prod:rare-fish-465`):
1. The dry run counted 13 messages, 1 conversation, 1 contact and 0 handoffs. The confirmed run deleted those (`done: true`).
2. `blueHasib:grantPlan {plan: ascend, packId: dental}` returned ok.

**Read back:**
- **Account:** industry `dental`; grant `ascend`, active, `dental`; `hasibSettings.packId` `dental`.
- **Setup:** `connected`, with the business name and the sector `عيادات الأسنان` intact. bzns.md is published.
- **Connection:** the WhatsApp integration path is `new_number`.
- **Kept:** 5 approved catalog entries; Layla active.
- **Cleared:** 0 messages, conversations and contacts remain.

## Same day: undelivered replies, then reset everything except the business

**Report:** Layla's Arabic greeting in Chats showed "Not delivered".

**Diagnosis:**
- Both replies failed with `provider_http_400`, with no Meta code saved.
- The connected number was `+1 555…6936`, a Meta-provided **test number**, added through "A different number" (`new_number`).
- Meta lets a test number reply only to its allowed list of up to 5 numbers. Any other customer is refused (Meta error 131030).
- That fits the record: one reply at 07:09 was delivered; the replies at 07:28 to another sender were refused.
- The code was not confirmed, because the gateway dropped it.

**Fix** (`31be45f`; Vercel `bznsflow-main-mcldm24ir`): `providerResult` returns Meta's numeric `error.code`, which the send result already stores as `errorCode`.

**Reset, for this account only** (no new command, per Ahmed). Ahmed is removing the Messaging account in Meta himself.
1. `blueMessaging:execute {operation: disconnect, confirm: true}`, using the account's setup key: queued replies stopped; Layla's control, the number claim and the connection fields removed.
2. `blueReset:messages`: 4 messages, 1 conversation and 1 contact deleted.
3. `review:resetAttemptBudget`: attempts back to 0.

**Remaining on the account:**
- **The business:** the setup's business details and published bzns.md, 5 catalog entries with their 5 Hasib service items and variants, business settings, `hasibSettings` (Dental).
- **Plan and sign-in:** the plan and entitlement, setup progress, sign-in sessions and the OAuth identity.
- **Left in place:** 6 `ascendActivity` log lines from the earlier Real estate test. No operator command removes them, and Ahmed asked for none to be added.
