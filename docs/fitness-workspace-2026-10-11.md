# Fitness & wellness six-tab workspace (from ascend/fitness.md, task B15)

Date: 2026-10-11. Status: built and verified locally against the real Convex state code. **`fitness` is a live pack** (`HASIB_LIVE_PACKS`), so a real Ascend account can choose it. Ascend itself is still "in preparation — do not quote".

Decisions (Ahmed, 2026-10-11):
- **Release:** ship Fitness live on Green after every local check passes. Media ships in the same release but stays a preview pack.
- **Simple and automated:** staff record only physical facts, and Hasib does the rest.
- **Sending:** customer messages are written automatically as drafts and sent only after a manager approves them. There is no scheduler and no automatic sending.

## What was built

**Records.** `convex/hasib/fitnessSchema.ts`, additive only:

| Table | Holds |
|---|---|
| `fitnessPlans` | Membership or class pack: term, billing months, price, credits, freeze allowance, grace |
| `fitnessClasses` | A dated class with its capacity: scheduled or cancelled |
| `fitnessSeats` | A member or trial booking: confirmed, waitlisted, attended, no-show or cancelled. Holds the attendance source and scan id |
| `fitnessTasks`, `fitnessDrafts` | The kit's task and draft shapes |

**Existing tables** gain optional fields:
- `hasibMemberships`: plan, price, billing, activation, renewal link, freezes, cancellation. The status union widens to add `pending`, and there are new `by_contact` and `by_account_request` indexes.
- `hasibCredits`: `seatId` and `sourceEventId`, with a `by_account_source` index.
- `hasibSettings.fitness`.
- `blueMessages` and `blueCampaignRecipients`: `fitnessDraftId`.

Money stays on `hasibOrders`: each membership has one internal order (`fitness-membership:<id>`).

**Derived on read, never stored** (`fitnessDomain.js`), so no scheduler is needed:
- frozen, grace, expired;
- attendance gap (after the minimum observation time; the end of a freeze restarts the clock);
- renewal due.

The effective end is the term end plus frozen days.

**Automation** (`fitnessState.js`, `fitnessGym.js`):

| Staff records | Hasib does |
|---|---|
| A payment | Activates a pending membership once its order is fully paid (a renewal starts at the old end). A replayed payment changes nothing |
| A check-in (class seat, open gym, or a scan with `sourceEventId`) | Records one visit and consumes one class-pack credit once. A repeat scan returns the same visit |
| A booking | Checks the entitlement at class time (paid, in term, not frozen, a credit left). A full class goes to the waitlist |
| Cancelling a seat or a class, or a freeze | Gives each freed place to the first waitlisted person still entitled, and writes them a "place opened" draft |
| A trial check-in | Opens "Offer a membership". The first paid membership within the window is the conversion |
| A renewal | A linked successor. It counts as a renewal, never a new member. After the grace period a return is a new membership |

**Follow-ups** (`fitnessFollowups.js`):
- **Seven filters:** Today · Overdue · Scheduled · Waiting on customer · Needs decision · Blocked/Failed · Completed.
- **Self-closing tasks** cannot be marked done: payment due, attendance unrecorded, in grace.
- **Three rules** start on, in draft mode: trial preparation, attendance gap, renewal. Drafts are deterministic EN/AR text built from recorded facts, never for opted-out customers, with no health claims. Approval goes through `workspace/drafts.js`: 24-hour window, approved UTILITY template, opt-out.

**Layla intake** (`fitnessTurn.js`): an enquiry opens one "Book a trial" request. None of the customer's words are copied, so no health detail is stored.

**Insights** (`fitnessInsights.js`):
- **Headline:** trial-to-member (matured window), membership renewal (matured grace; freezes move the end), members with an attendance gap (as of now; frozen left out and disclosed; check-in coverage), class attended occupancy (cancelled classes leave both sides).
- **Diagnostics:** opening-cohort retention, net growth (new + reactivated − ended), recurring revenue (monthly run rate, as of now, frozen left out), no-show rate (unknown outcomes disclosed, not counted).
- **Trial funnel by source:** cost per attended trial is shown as unavailable.
- **Also:** 8-week trends; breakdowns by plan, source, class type, and frozen vs active; exact drill-down with Back to Insights.

**UI:**
- **Components:** `src/components/hasib/FitnessDashboard.jsx` and `src/components/hasib/fitness/`.
- **Six tabs:** Chats · **Memberships** · Customers · Broadcasts · Insights · Settings. Coaches and front desk see the first three.
- **Work views:** Members (the action list with Trial follow-up · Attendance gap · Expiring · Frozen) · Classes (roster, one-tap check-in, no-show, waitlist, cancel) · Plans · Follow-ups.
- **Record:** one member record (Overview · Attendance & credits · Payments · Renewal history · Follow-ups · Activity), plus `FitnessContext` beside Chats and Customers.
- **Staff limits:** staff never see prices, payments or the revenue run rate.

## Requirement → code → automated assertion

| Requirement | Code | Assertion (`tests/ascend-fitness-growth.test.mjs` unless named) |
|---|---|---|
| Six tabs, Memberships label, views, aliases, staff limits | `navigation.js`, `config/hasib-packs.js` | "six tabs…"; `fitness-browser` §1–2, §9 |
| Fitness live without the preview harness | `HASIB_LIVE_PACKS` | "Fitness is a live pack…" |
| `fitness.membership_inquiry` | `fitnessTurn.js` | "membership_inquiry: one trial request…" |
| `fitness.activated` | `activateIfPaid` | B15 journey (part payment stays pending; replay changes nothing) |
| `fitness.class_booked` | `seatBook`, `coveringMembership` | "class_booked: entitlement…, reminder drafted once and withdrawn" |
| `fitness.waitlist_promoted` | `promoteWaitlist` | "waitlist_promoted: …first person still entitled…" |
| `fitness.attendance_recorded` | `checkin`, `seatStatus` | "attendance_recorded: a missing check-in stays unknown…" |
| `fitness.inactive` | `inAttendanceGap`, rule `attendance_gap` | "inactive: one supportive invitation per gap…" |
| `fitness.renewal_due` | `renew`, rule `renewal` | "renewal_due: …not a new member"; lapsed → reactivation |
| `fitness.freeze_cancel` | `freeze`, `cancel` | "freeze_cancel: a freeze releases its classes…" |
| B15 journey: 5 trials, 3 attended, 2 paid (60% / 66.7%), one credit for a repeated scan, 7-day freeze, no offer after opt-out | all of the above | "B15 journey…" |
| Acceptance: frozen not at risk; renewal ≠ acquisition; cancelled class leaves occupancy; waitlist respects capacity and entitlement | domain + insights | inactive, renewal_due, Insights, waitlist tests |
| K01–K08, empty = "no eligible records", drill-down equals population | `fitnessInsights.js` | "Insights: occupancy…, drill-down equals the population" |
| Follow-ups filters, self-closing, snooze version, context | `fitnessFollowups.js` | "Follow-ups: seven filters…" |
| Drafts through the shared send path | `workspace/drafts.js` | "drafts: approval sends inside the 24-hour window…" |
| Roles and tenant isolation | `MANAGER_ONLY`, `EMPLOYEE_DENIED`, `owned()` | "roles and tenants…" |
| EN/AR, 320/768/1440, axe, overflow, no errors | UI | `fitness-browser` §1 |

## Verification (2026-10-11, local)

| Check | Result |
|---|---|
| `node --test tests/*.test.mjs` | 923/923, including `ascend-fitness-growth` (15) and `fitness-workspace-ui` (3) |
| `npm test`, `npm run typecheck:convex`, `npm run build` | Pass |
| `node scripts/run-browser-tests.mjs` | All 10 suites passed; the owner suite now counts the live packs from config and prerenders `/owner/preview/fitness` |
| `node tests/hasib-industries-browser.mjs construction automotive` | 12/12 |
| `node tests/real-estate-browser.mjs` | 328/328 |
| `node tests/media-browser.mjs` | 314/314 |
| `node tests/fitness-browser.mjs` | 312/312 |

The Fitness browser run covers:
- manager and coach, EN/AR at 1440/768/320, with axe, overflow and error checks;
- the refusal before membership, then add → pay → active → freeze → end freeze;
- the waitlist filling a freed place by itself, and one-tap check-in;
- draft approval blocked outside the window, and self-closing tasks;
- Insights drill-down and Back after a reload;
- chat → member → Back, and customer → member;
- rules persisting, and coach limits.

**Demo:** `node scripts/hasib-demo.mjs 5381 --pack=fitness`, plus `--role=employee` for the coach. It runs without the preview harness, as production does.

## Not built (gaps against the full spec)

- **Automation:** automatic sending, scheduler and durable outbox (F03). Drafts wait for a manager.
- **Integrations:** access-control or scanner integration, and billing integration. Scans can be posted with a `sourceEventId`; payments are recorded on orders; nothing is charged automatically.
- **Acquisition:** ad spend and attribution (F02/F05). Cost per attended trial and payback show as unavailable.
- **Waitlist:** expiring waitlist offers. A freed place goes straight to the next entitled person, who is told in a draft.
- **Not modelled:** guardians for minors beyond the existing `guardianId`, and coaching assessments (deliberately not stored).
- **Concurrency:** true concurrent booking of the last place is protected by Convex OCC, which the serial in-memory harness cannot prove.
- **Signed-in use:** a signed-in fitness session on production remains an owner check.
