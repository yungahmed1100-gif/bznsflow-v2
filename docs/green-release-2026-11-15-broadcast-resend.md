# Green release 2026-11-15: resend a stopped broadcast

Ahmed asked for a resend button for broadcasts that failed, fully working.

## What changed

- A finished or stopped broadcast shows "Resend to N who didn't get it" (Arabic: "إعادة الإرسال إلى N لم تصلهم").
- The button opens a confirmation that checks every person again (consent, opt-out, number change, today's
  WhatsApp limit) and lists who is left out and why. Nothing is sent before "Send now".
- The resend is a new broadcast, marked "Resend", with the same template and each person's original values, sent
  through the ordinary sender (rate limit, broadcast switch and opt-out gate unchanged).
- Resent: "Not delivered" and "Not sent", plus people still waiting when a broadcast stopped. Never resent: an
  unknown outcome (`ambiguous`), anyone in a cancelled or still-running broadcast, sector draft sends.
- One failure is resent once (`resentIn` on the old recipient); a double click sends once (request id).
- A deleted header file is replaced by the template's approved Meta sample, as for a new broadcast.
- AI connections: `bznsflow_dashboard_campaign_resend` (category messages, needs `confirm: true`).

## Code

- `convex/blueCampaignResend.js` (new), `convex/blueCampaignState.js` (`resendable`, `resendOf` in the list).
- `convex/campaignSchema.ts` (new): the three campaign tables moved out of `schema.ts`, plus optional
  `blueCampaigns.resendOf` and `blueCampaignRecipients.resentIn`. Additive; the previous site works with it.
- `api/_lib/layla/dashboard-api.js` `campaign_resend` (behind the broadcast switch), MCP contract and runtime gate.
- `src/components/dashboard/ResendBroadcast.jsx` (new), `BroadcastView.jsx`; wording in
  `src/lib/dashboard/broadcast-strings.js` (moved out of `strings.js`, which was at its line cap).
- MCP discovery budget raised from 140,000 to 141,000 bytes (construction reached 140.4 KB).

## Evidence

- Unit tests: 1,264 pass, including four resend state tests and one API test.
- Dashboard browser suite: 698 assertions, including the resend dialog in English at 1280 px and Arabic at 375 px
  (nothing sent on open, one confirmed send with a request id, no overflow, no axe findings).
- `npm run test:release` on a clean archive of `007a502`: passed.
- Visual diff against `green-site-b`: 172 screens, 0 differences.
- Convex dry run: no index deletions, schema valid. Convex deployed by Ahmed from the archive (07:38Z approx.).
- Vercel `dpl_3yFAtrXRfAQgFU9Gkek2dJ35cN6F` promoted 07:41:24Z.
- After: health 16/16, 55/55 prerendered pages 200, unsigned `campaign_resend` refused with 401, no runtime errors.

## Rollback

Promote `dpl_AZMnr8rVcyZ3SwEg6cshnpRH8Lco` (site B). The Convex fields are optional; the old site ignores them.

## Not verified

- No real resend was sent. The first live resend is the owner's own action from the dashboard.
