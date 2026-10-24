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
