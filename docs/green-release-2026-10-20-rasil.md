# Green release 2026-10-20: Rasil email campaigns and the Ascend Email tab

**Authorization:** Ahmed, 2026-10-20: "rafector then push live". He chose who sees it: only his own account, through `RASIL_TEST_EMAILS`. `RASIL_ENABLED` stays unset, so no customer sees a change.

**Decision:** `BF-2026-10-20-RASIL-IN-ASCEND` (vault `Decisions/2026-10-20-Rasil-In-Ascend.md`).

## What changed

- **Rasil, Phase 1:** one-off email campaigns that the Ascend owner approves.
  - **Sending:** from the owner's own domain through Resend, capped at 2,000 a month per account.
  - **Warm-up:** a new domain sends 50, then 150, then 400 a day in its first three weeks.
  - **Subscribers:** a double opt-in website form, or an import with a consent record.
  - **Suppression:** unsubscribes, hard bounces and complaints remove an address for good.
  - **Writing:** Adiba drafts from bzns.md, and prices that aren't in the catalogue are flagged.
- **Email tab:** Campaigns, Subscribers, and Domain & form, the same in every Ascend industry.
  - It shows only for the manager, and only when Rasil is open to the account.
  - Broadcasts is WhatsApp only again.
- **Public links:** `/email/subscribe`, `/email/unsubscribe` and `/email/confirm`. GET pages ask and POST acts, and one-click `List-Unsubscribe-Post` is supported.
- **Resend webhook:** `/api/rasil-webhook`. It rides on `layla-meta-webhook`, so functions stay at 12.
- **Refactor before release:**
  - `convex/rasilState.js` now has one named function per operation behind an operation map. Before, each entry point was one long `if` chain.
  - The AR/EN switch is shared as `LangSwitch`.
  - Stop-reason wording moved to `rasil/reason.js`.

## Evidence (local)

- **Unit tests:**
  - `npm test` passes.
  - `npm run test:access`: 91 pass, including `rasil.test.mjs` (7), `rasil-state.test.mjs` (10, mutation-checked) and `rasil-api.test.mjs` (8). The refactor was run against the same 25 Rasil tests.
  - The `dashboard-navigation` test covers the Email tab across every live pack, and its absence for staff, Catalyst, and accounts with Rasil off.
- **Type check and build:** `typecheck:convex` and `npm run build` pass.
- **Dashboard browser test:** 403 checks pass at 320–1440px in EN and AR.
  - It covers domain connect and check, the sender, and the form code.
  - It also covers subscribers, a campaign (draft, flagged price, preview, send), and Broadcasts without email.
- **Release check:** `npm run test:release` passes, with Ascend end-to-end at 83 checks.
- **Secret scan:** the diff contains no key-shaped strings.

## Release

| | |
|:---|:---|
| Source | `ac52b83` on `master` (`81a7461`, `ac52b83`), pushed to origin; contains the live `f5d10a3` |
| Convex | `rare-fish-465` (Green), deployed from an isolated worktree of `ac52b83`. Additive only: tables `emailDomains`, `emailSubscribers`, `emailCampaigns`, `emailCampaignRecipients` and `emailUsage`, with 17 indexes. No index deleted. Routes `/rasil` and `/rasil-worker`; per-minute `rasil maintain` cron |
| Vercel env | `RASIL_TEST_EMAILS` (Production) added. `RASIL_ENABLED`, `RESEND_WEBHOOK_SECRET` and `RASIL_RESEND_API_KEY` are not set |
| Website | `bznsflow-main-cnw9j4u5l` (inspect `AHhtsxubwSrD9puZuqjU7r9pS7LQ`), aliased to www.bznsflowai.com |
| Previous production | `dpl_4q29SHVjfvRBcBJMFjLubGRfZx47` (rollback target) |

## Live checks (2026-10-20)

- `/`, `/en`, `/layla/dashboard` and `/en/layla/dashboard` return 200.
- `/email/unsubscribe?t=bad` and `/email/confirm?t=bad` return 400 with the bilingual "Link not valid" page.
- An unsigned `POST /api/rasil-webhook` returns 401 `signature`.
- A `POST /email/subscribe` with a malformed form key returns 400 "check the address" before reaching Convex.
- An unauthenticated `/api/layla-meta?surface=rasil` returns 401 `sign_in_required`.
- Green Convex logs show `rasil:maintain` running every minute from 21:42 Muscat time, at 16–26 ms. There were no errors in the last 300 log lines.

## Remaining gaps

1. **Not seen signed in.** Nobody has opened the Email tab on production yet. Ahmed has to sign in to confirm it appears on his Ascend account.
2. **Resend plan and key:** a plan that allows customer domains is still needed. The current `RESEND_API_KEY` may be sending-only, in which case domain connect answers `email_unavailable`. If so, set `RASIL_RESEND_API_KEY` to a full-access key.
3. **Webhook (done 2026-10-23):** Ahmed added the Resend webhook to `https://www.bznsflowai.com/api/rasil-webhook` for delivered, bounced, complained, opened and clicked, and set `RESEND_WEBHOOK_SECRET` in Production. Redeployed as `dpl_33YGzZxTP6YBhAuDkRN6euHNsvgr` (same source `ac52b83`). An unsigned call is still refused. A signed event has not arrived yet: the first one comes with the first real send.
4. **Real-domain test:** on a domain Ahmed owns, check that SPF, DKIM and DMARC pass, that mail reaches the Gmail, Outlook and iCloud inboxes, and that one-click unsubscribe and bounce suppression work.
5. **Opening it to customers:** only after 2–4 pass. Set `RASIL_ENABLED=true`, and change the Ascend card in `src/data/tiers.js` from "Coming soon".
6. **Not built:** Layla collecting an email in chat, and Phase 2 sequences.
