# Green release 2026-10-24: founder Ascend test bench, free-audit booking, website onboarding

**Authorization:** Ahmed, 2026-10-24. He asked for an Ascend dashboard on ahmed@bznsflowai.com, which was showing Catalyst, with every service of the current sectors so he can test every feature, plus a calendar for the free business audit. His answers:
- **Starting sector:** Retail.
- **Switching sectors:** a live switcher.
- **Dental:** preview only.
- **Release scope:** ship together with the website onboarding built on 2026-10-23.
- **Audit booking:** our own booking page, Sunday to Thursday 10:00–17:00 Muscat, an Audits tab in his dashboard, and an email to him for each booking.

Decision: BF-2026-10-24-AUDIT-BOOKING-TEST-BENCH (vault `Decisions/2026-10-24-Own-Audit-Booking-And-Founder-Test-Bench.md`). Website onboarding: BF-2026-10-23-ASCEND-WEBSITE-ONBOARDING.

## What changed

**Founder test bench**
- **Data:** the account gets an Ascend grant with `packId: 'retail'`, through the existing admin grant (`blueAccess`). Nothing in the code decides the plan.
- **Sector bar** (`src/components/hasib/FounderIndustryPreview.jsx`). One select with two groups:
  - **Live — your real data:** every live pack except Dental. It calls `settings_update { packId }`. Each sector's records stay when he switches away.
  - **Preview — sample data:** every built industry, read-only, as before.
- **Server guards:**
  - `api/_lib/hasib/hasib-api.js` refuses a founder `settings_update` to Dental with `founder_dental_preview_only`. Dental's 24-hour text rule (`convex/hasib/packChoice.js`) would trim the real pilot chats.
  - Layla on the founder's pilot number keeps the general setup: `onIndustryPlan` in `convex/blueContacts.js` and `industryPlan` in `api/_lib/layla/review-api.js` exclude the founder. Prospects on the pilot number see no change.

**Free-audit booking**
- **Page:** `/audit` and `/en/audit` (`src/pages/AuditBooking.jsx`, `src/styles/audit.css`). Prerendered, indexable and in the sitemap. The flow is: day, time, details, booked.
- **Rules** (`config/audit.js`): 30 minutes, Sunday to Thursday, 10:00–16:30 starts in Muscat time, at least 12 hours ahead, up to 21 days out.
- **Convex:**
  - Table `auditBookings` (additive), with `by_start` and `by_email` indexes.
  - Logic in `convex/auditState.js`, behind the `/audit` and `/audit-admin` HTTP routes.
  - Refuses a double booking (`slot_taken`) and a second upcoming booking per email (`already_booked`).
  - The public answer lists times only.
- **Public API:** `/api/lead?op=audit` (`api/_lib/audit-api.js`). No new function file.
  - Guards: origin check, honeypot, and 5 booking attempts a minute per IP.
  - Emails Ahmed through Resend with an `.ics` invite. A failed email keeps the booking.
- **Audits tab:** founder only, in the dashboard (`src/components/dashboard/audits/AuditsView.jsx`).
  - Shows a Sunday–Thursday week grid, or a list by day on phones.
  - Bookings can be marked done, cancelled or reopened, with a note.
  - It is served by `/api/access-admin?op=audits`.
- **Calls to action:** every "Book the free audit" button (hero, about, footer, mobile bar, sign-in, playbook) opens `/audit` in the same tab. Layla's web chatbot shares `https://www.bznsflowai.com/audit`, regenerated with `scripts/gen-kb.mjs`. The Google Calendar link is retired.

**Website onboarding Phase 1** (built 2026-10-23, released here):
- the Website tab's wizard and tracker;
- the domain search;
- `/owner/websites`;
- Convex tables `websiteDrafts` and `websiteProjects`, both additive.

## Evidence (local)

- **Unit tests:** `npm test` passes.
  - `test:access` passes 112 tests, including the new `tests/audit-booking.test.mjs` (10 tests).
  - Mutation checks: removing any of 8 key guards fails a test. The guards are: double booking, one booking per email, the admin check, Layla general for the founder, the founder Dental refusal, the honeypot, the weekend rule and the 12-hour lead.
- **Typecheck and build:** `typecheck:convex` and the build pass.
- **Browser tests** (synthetic APIs):
  - `audit-browser`: 40 checks in EN at 1280 and AR at 375. Covers a time taken meanwhile, then booking; already booked; and axe.
  - `layla-dashboard-browser`: 489 checks. Covers the founder bar (no live Dental, live switch saved, preview read-only) and the Audits tab (week, details, mark done with CSRF, next week, axe). A non-founder never gets the tab.
  - `home-browser`: 138 checks. Every audit link is `/audit` in the same tab.
- **`npm audit` gate failed** on advisories published since the 2026-10-23 release, all in dependencies this release doesn't touch, and all already in production:
  - `body-parser` <2.4.0, via the MCP SDK's express;
  - `fast-uri` <3.1.9, via ajv;
  - `zod` <4.6.6, via the MCP SDK and `@vercel/functions`.
  - The fixed versions are 2–13 days old. They weren't taken in this release; that is a follow-up.
  - All other release gates were run on their own.

## Deploy (2026-10-24)

1. **Commit:** `e9bde13` on master, pushed. Lineage contains `f29db1c`.
2. **Convex Green** `prod:rare-fish-465`, deployed from a clean worktree.
   - Added indexes only: `auditBookings.by_start/by_email`, `websiteDrafts.by_account`, `websiteProjects.by_account/by_stage_due`.
   - No index deleted.
3. **Vercel production:** `dpl_E5RJhhWLLsE81jAgxTA1uLnx1muW`, aliased to www.bznsflowai.com. Rollback target: `dpl_E6zkJLe5YdvUD7k6FqTJSQC5tx8E`.
4. **Grant:** `blueHasib:grantPlan` gave `ahmed@bznsflowai.com` the `ascend` plan with `packId: retail`, note "Founder test bench (2026-10-24)". The operator mutation writes no `blueAccessAudit` row; this note is the record.

## Live checks
- **Pages:** `/audit`, `/en/audit`, `/`, `/en`, `/en/layla/dashboard` and `/en/owner/websites` all return 200.
- **Booking page in a real browser:** 15 working days with 14 times each, and the titles are right in Arabic and English.
- **`GET /api/lead?op=audit`:** 210 open times, the first on Sunday 25 Oct at 10:00 Muscat. The keys are only `ok` and `slots`.
- **Refusals:** `/api/access-admin?op=audits` returns 401 `sign_in_required` signed out. A booking POST from a foreign origin returns 403 `origin`.
- **Home page and sitemap:** the home page links to `/en/audit`, and the sitemap lists `/audit`.
- **Not done by the agent:**
  - A real booking: it would email Ahmed and take a public time.
  - Signing in as Ahmed: there is no session.
  - Ahmed's first sign-in is what shows the Retail dashboard, with the founder bar and the Audits, Email and Website tabs.

## Follow-up fix (same day): Chats cut off at the bottom

**Report:** Ahmed's screenshot showed the Chats tab clipped at the bottom.
- **Cause:** the chat panes were sized at 100% of the main area, while the plan notice, the website reminder and the founder bar sat above them. The thread and reply box ran past the bottom of the screen.
- **Who it affected:** any customer with a notice above Chats, not only the founder.

**Fix** (`aadf1e7`, `dpl_2tfhPCyx8RrjGdLzoHxorB61wCoM`; CSS only, no Convex change):
- Chats is now a column: the notices keep their own height, and the panes fill the rest with a 440px minimum. On very short windows the tab scrolls instead.
- An open chat on a phone hides the notices.
- The app frame uses `overflow: clip`, so focusing the reply box can't scroll it away.

**Checks:**
- New browser checks at 1440×800, 1280×760, 1024×600 and 375×740 (EN/AR). They fail on the old CSS.
- All 12 shared browser suites and every sector suite pass.
- The rule is confirmed in the live CSS.

## Follow-up fix (same day): WhatsApp connection not shown after Meta's window

**Report:** Ahmed finished Meta's window ("Keep my WhatsApp Business app", the coexistence path), including verification, but the page never showed the connection.

**Diagnosis from Green data** (yungahmed1100@gmail.com):
- The setup record stayed `prepared`, the attempt `claimed: false`.
- There was no integration, no asset claim and no diagnostic, and no errors in the Vercel logs.
- So the page never sent `finish`, and the server never saw Meta's result.
- In `src/lib/layla-signup.js` the browser dropped Meta's result silently in three ways:
  - Only `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` counted on coexistence.
  - Only messages from the captured popup counted.
  - The code had to wait for Meta's message.
- The attempt also expired 10 minutes after "Get Meta ready".

**Fix** (`012625f`; Convex Green, then Vercel `dpl_mXfsCFW47Nponwq3dXENaWLx8ku3`):
- **Finish events:** any `FINISH*` event with a numeric WABA counts on every path. The server still checks the number against the path (`is_on_biz_app`). Messages from any https facebook.com window count while the attempt is pending.
- **Code-only finish:** if Meta's code arrives and its message doesn't within 4 s, the code is sent alone. The server takes the WABA from the signup token's `target_ids` when exactly one is granted, and refuses (`waba_not_granted`) rather than choosing among several. A preselected WABA must still match.
- **Attempt lifetime:** 30 minutes (`ATTEMPT_MS`).
- **Page:**
  - The page shows "Finishing your connection…" once Meta answers.
  - Completion no longer goes through the busy guard that could drop it.
  - Post-connect checks run for about 3 minutes.
  - The expiry message names "Get Meta ready".
- **Checklist removed:** the ten-item "Before you start, have these ready" list (`ReadyChecklist`) is gone. One line replaces it: "Have your phone with WhatsApp Business (updated) and your Facebook login ready."

**Checks:**
- Unit tests for the finish events, the other-window message, the code-only send (once; a late message ignored), Meta's `error_code` reference, the server's WABA lookup (one, several, none) and the 30-minute expiry. Removing each of the 8 new guards fails a test.
- `whatsapp-connect-browser`: 92 checks. It now covers a finished coexistence connection ending on "Connected ✓":
  - a `FINISH` from another window;
  - `FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING` in AR at 375;
  - code only.
- All unit tests, the typecheck, the build, all 12 shared browser suites, and the Catalyst, Retail and Ascend end-to-end suites pass.
- The live onboarding chunk contains the fix and no checklist.

**Not tested:** a real Meta connection. Ahmed's retry is the live proof.

## Follow-up (2026-10-25): two WhatsApp number choices

**Report:** Ahmed's screenshot of the WhatsApp card asked to simplify the options. His retry had also ended on `coexistence_not_verified` (the record reached the server, so the 2026-10-24 finish fix works), with a message telling him to check the number he "typed", although nothing is typed on that path.

**Change** (`59fa138`; Vercel `dpl_J6ya1ze2y9LxUfQkd3vPwxoMYzCV`; no Convex change):
- **Two choices:** "My WhatsApp Business number" (recommended) and "A different number". "A different number" covers both a new number and one already on an API. Both open the same Meta window, and the server's `new_number` path connects an already registered number without the PIN step (new unit test). The server still accepts `existing_cloud`, which the owner's direct connection uses, and an older attempt on that path shows as "A different number".
- **Removed:** the portfolio and WABA ID fields, and the "Which WhatsApp do you use?" question. Instructions for switching from regular WhatsApp are now a closed link under the first choice.
- **Messages:** `coexistence_not_verified` now says Meta's window picked a number that isn't on the app, so pick the app's number or choose "A different number". `business_app_requires_coexistence` names the new label.

**Checks:**
- `whatsapp-connect-browser`: 121 checks. Covers two radios, no portfolio fields, the switch link, `begin` sending only the path, and the three finished connections. EN/AR at 320–1440.
- All unit tests, the typecheck, the build and all 12 shared browser suites pass.
- The live chunk `LaylaOnboarding-CI58drbH.js` contains the new label and none of the old ones.
- Rollback target: `dpl_mXfsCFW47Nponwq3dXENaWLx8ku3`.

**Still open:** a real coexistence connection. Ahmed's last attempt is recorded as `coexistence_not_verified`.

## Follow-up (2026-10-25): Meta window guide matches Meta's 2026 flow

**Report:** Ahmed pasted Meta's new **Messaging accounts** page and asked that the in-app Meta guide match Meta's latest screens.

**Meta changes reflected** (Meta's "Onboard WhatsApp Business app users" page and partner guides):
- The WhatsApp Business Account is now a **Messaging account**, which holds templates, billing and the payment method. Its ID is the old WABA ID, so nothing changes in our API use.
- The app route is **Connect a WhatsApp Business App**. A message from Facebook arrives inside WhatsApp Business; the owner taps **Connect**, then **Connect to the Business Platform**, chooses whether to share chat history, then scans the QR code or enters the code.
- The app version must be 2.24.17 or later.
- Linked devices are signed out when the app is connected.
- The business portfolio can't be changed later.

**Change** (`7ebaf90`; Vercel `dpl_6pFCjB4JugFQwYifiN7kPWpuLbPR`; no Convex change):
- **The guide:** closed by default.
  - 6 steps for "My WhatsApp Business number" and 5 for "A different number".
  - On the app route, a warning says an SMS or call code means Meta has taken the new-number route. That is the wrong turn in Ahmed's 2026-10-24 attempt.
  - Meta's English button names are bold `<bdi>` labels, so the Arabic lines read correctly.
- **The ready line** names version 2.24.17.
- **The connected card:**
  - Billing points to the Messaging account.
  - The app route adds a line saying linked computers must be linked again and the app should stay open for a few minutes while it syncs.
  - It makes no claim about importing chat history, which BznsFlow doesn't do.
- **Dashboard and pricing billing wording:** "WhatsApp Business account" became "Messaging account", and the billing path is Accounts › Messaging accounts.

**Checks:**
- `whatsapp-connect-browser`: 148 checks.
- All unit tests, the typecheck, the build and all 12 shared browser suites pass.
- The live chunk `LaylaOnboarding-Kt9JmxxU.js` has the new guide and none of the old wording.
- Rollback target: `dpl_J6ya1ze2y9LxUfQkd3vPwxoMYzCV`.

## Follow-up (2026-10-25): attempt limit, and the app number re-checked before refusing

**Report:** Ahmed's third retry ended on `coexistence_not_verified` again, then on "reached its connection attempt limit".
- The record for yungahmed1100@gmail.com showed `attempts: 10`, status `failed`, path `coexistence`.
- It held no detail about what Meta said.
- Reading the shared Messaging account 1431439178536480 directly wasn't possible: Vercel doesn't release sensitive values to a local pull.

**Operator action:** `review:resetAttemptBudget` for yungahmed1100@gmail.com gave `{reset: true}`. The record now shows `attempts: 0`.

**Change** (`28a786a`; Convex Green first because of the additive `diagnostic.meta` field; Vercel `dpl_AUkamoQHciksU3RstkDB9RjM9t4s`):
- **Re-check before refusing:** on the app path, the server asks Meta again (4 × 3 s) before refusing. Meta's docs say linking the app takes a few minutes, so the flag may be set after the window closes.
- **Meta's answer on the record:** a refusal stores `diagnostic.meta`, holding Meta's finish event, the app flag (`true`/`false`/`missing`), the number type and the last 4 digits. The event name is evidence only and never decides the path.
- **Attempt counting:** the limit (10) counts only attempts that came back from Meta (claim). Preparing, or switching the number type, no longer uses one.

**Checks:**
- New unit tests for the re-check (connects on the third look; refused after all re-checks with the facts kept), for the record detail, for an unexpected event name being dropped, and for free preparing. Breaking each of 6 new guards fails a test.
- All unit tests, the typecheck, the build, `whatsapp-connect-browser` (148) and all 12 shared browser suites pass.
- Rollback targets: Vercel `dpl_6pFCjB4JugFQwYifiN7kPWpuLbPR`. The Convex change is additive.

**Next:** Ahmed retries. If it is refused again, `diagnostic.meta` shows Meta's exact answer.
