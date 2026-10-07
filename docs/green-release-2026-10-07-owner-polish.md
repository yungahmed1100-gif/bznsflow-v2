# Owner experience polish, 2026-10-07

**Status:** live on 2026-10-07 as `dpl_5CFo3RpTexmDGgduu2fLqWAPSbkK` (source `c79e98b`). See Production evidence at the end.

Ahmed asked for a senior design pass on the owner surfaces once Instagram opened: simpler, sharper and more convenient. He likes the Layla on/off control. While the work was under way he made three product decisions:
- Catalyst includes broadcasts.
- Catalyst can upload a number list or add numbers by hand.
- bzns.md gets a team contact that Layla gives a customer who asks for a person.

## Decisions

| Decision | Choice |
|---|---|
| Switching on | Layla switches on automatically when a channel connects. An owner's pause is never overridden. |
| Switch model | One master switch in the dashboard header, plus one switch per channel in Settings → Channels. |
| Scope | Flow and controls. The Ledger visual system is kept. The inbox is not redesigned this round. |
| Catalyst plan | Gains `broadcasts` and `imports` (CSV/XLSX upload and manual entry). Exports stay with Ascend and Apex. |
| Team contact | An optional `## Team contact` section in bzns.md, stored as a new optional profile field `teamContact`. It is shared only when a customer asks for a person; the chat still waits in the inbox. A legacy `humanContact` kept from older setups in inbox mode is still never advertised. |

## What changed

**Setup goes from 4 steps to 3:** your business, connect a channel, Layla is live.
- The reading-only "Replies and human handoffs" step is now one line on the channels step.
- The "Go live" step is gone. When any channel replies, the page shows "Layla is live" with **Open your inbox**.
- The optional preview stays on the channels step as **Test Layla**.
- The outer setup shell uses the same three names. Its "Mark answer setup reviewed" button is removed: the flag it set gated nothing, and the button refused unless the "optional" preview had been run.
- Older saved steps (2, 3, 4) open the channels step.

**One switch, `LaylaSwitch`,** replaces the three Activate/Pause controls ("Activate Layla", "Activate replies", "Pause replies").
- It is a real `role="switch"` checkbox built on the existing `.ld-switch` styles, so it mirrors in RTL.
- It moves at once and moves back with the server's reason if refused.
- `ChannelSwitch` controls one channel. It takes state from the overview in the dashboard and reads its own on the setup page.

**Auto-on**
- The setup page asks for a switch-on only for a channel connected during that visit: the Instagram OAuth return, or a WhatsApp number whose status becomes connected while the page is open.
- The API (`activate` with `auto:true`) first reads state. Unless the reason is `not_activated`, it answers without contacting Meta.
- Convex skips an auto activation when a control row is active or carries any reason other than `not_activated`. A row with `owner_paused` is therefore never switched on.

**Dashboard header**
- The master switch covers every connected channel. Its subline names the channels, or says "On for Instagram · paused on WhatsApp".
- A single health signal links to Settings → Channels.
- It now works for Instagram-only owners. Before, they saw "Connect WhatsApp" and no status.
- The stale "x of 100 replies today" line is removed. The overview reports `RATE_LIMITS` (30/min, 1000/day).

**Channel cards**
- WhatsApp and Instagram share one layout: identity and health, the switch, then quiet Check connection and Disconnect.
- Instagram's five-button row is gone.
- The WhatsApp setup card's technical checks fold into "Connection details", which opens by itself when a check fails.
- "Blue connection verified" becomes "Messages reach BznsFlow". The raw Meta name status becomes plain words.

**Fixes found on the way**
- Automotive owners could not reach Settings → Channels. Settings now opens on the workshop page (the business view), with Channels as the next tab.
- The setup shell painted every secondary button solid black, and its margins did not flip in Arabic.
- The Arabic `activation_not_ready` copy and the stale "publish first" copy are corrected.

## Verification (local)

- **Unit tests:** 992 passing before the team contact work, plus the new suites:
  - `dashboard-channels`: master states, attention, and the master switch's partial failures.
  - Auto activation: never overrides `owner_paused`; reads state without Meta.
  - The journey test switches on automatically, then pauses, then reloads, and stays paused.
  - Catalyst plan gates.
  - Team contact: parsing, the profile, replies, and conversion from saved details.
- **Browser suites:**
  - Review onboarding proves the auto-on path in a browser: connect Instagram, return, switch on, "Layla is live", inbox.
  - Instagram channel switches.
  - Dashboard: 340 assertions at 320–1440px in English and Arabic.
  - bzns.md editor, WhatsApp connect, and Catalyst (199 assertions).
- **Final local run:**
  - 993/993 unit tests and the Convex typecheck pass.
  - All 9 shared browser suites pass, as do Catalyst (199), retail (441), retail-tech (490), dental (341) and real estate (202).
  - Construction and automotive pass 12/12, after the automotive Settings fix.

## Production notes

- **Broadcasting is off on Green for every plan:** `GREEN_BROADCAST_ENABLED` is not set in Vercel production. Turning it on also needs the Convex `blueMessagingSettings` row `broadcast` set to `enabled:true`. Both changes need Ahmed's go.
- **Team contact applies after the owner adds the section and republishes.** Existing published documents have no `teamContact` until then.
- **Live-path check (harness):** "I want to talk to a real person" and "ابي اكلم موظف" get the same reply on WhatsApp and Instagram: "I’ll leave this conversation for our team to follow up here. You can contact our team: WhatsApp +968 9123 4567 (Huda, rentals)". The handoff reason is `customer_requested`.
- **Convex changes are additive:** the optional `auto` argument and the optional `profile.teamContact` in `blueReviewSessions` (`convex/schema.ts`, `convex/review.ts`). Rollback stays compatible.

## Production evidence

| Item | Value |
|---|---|
| Source | `c79e98b`, clean `git archive` build, 12 functions |
| Verification | Full `npm run test:release` passed on the final code: 993/993 unit tests, Convex typecheck, build, audit with 0 vulnerabilities, all 9 browser suites, Catalyst 199, retail 441, retail-tech 490, dental 341, real estate 202, construction and automotive 12/12 |
| Vercel | `dpl_5CFo3RpTexmDGgduu2fLqWAPSbkK`, promoted 2026-10-07 by Claude at Ahmed's request ("verify then push for production") |
| Convex | `rare-fish-465` deployed after a dry run: schema validation complete, no index deletions, only the empty Node-actions version line |
| Rollback | `npx vercel promote dpl_BJi4kXG5SGZHSHpg6eUdP2GKcJ37 --yes`, keeping Convex. Do not roll Convex back once any profile stores `teamContact`: the old schema would refuse those rows. |

**Smoke checks after promotion**
- Pages `/`, `/en`, `/catalyst/setup`, `/en/catalyst/setup`, `/layla/setup`, `/layla/dashboard`, `/en/layla/dashboard` and `/signin` returned 200 in under 0.3 s, over three rounds.
- One round had four 20-second client timeouts. They never reached Vercel, nothing logged a 5xx, and they did not repeat.
- An unauthenticated messaging GET returns 401, and so does a POST with `auto:true` and no session.
- `?surface=instagram` returns `sign_in_required`.
- An unsigned webhook POST returns 403.
- **Runtime logs** for the 10 minutes after promotion show no 5xx. `layla-meta-worker` returns 200, so the Convex crons are draining. Its 401s come from the stale Cloudflare scheduler, which is known.

**Not yet seen on production:** a real owner connecting a channel and Layla switching on by herself, and a live team-contact reply. Both wait on Ahmed's live test. Broadcasting stays off until `GREEN_BROADCAST_ENABLED` and the Convex `broadcast` setting are enabled.
