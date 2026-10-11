# Media & production six-tab workspace (from ascend/media.md)

Date: 2026-10-11. Status: built and verified locally against the real Convex state code. **Not deployed and not live.** Media is a *preview* pack (it now has its own configuration) and is not in `HASIB_LIVE_PACKS`, so real accounts are refused (`pack_not_live`); only the local demo and tests run it, through the synthetic preview harness. Ascend is still "in preparation — do not quote".

Decisions (Ahmed, 2026-10-11): build Media on a shared sector kit rather than the full F01–F08 growth engine; rules open tasks or drafts that a manager approves (no scheduler, no automatic sending); build and test locally, with turning Media on left to a separate decision.

## What was built

**Shared sector kit.** Real Estate now runs on it too, unchanged in behaviour.

| Backend `convex/hasib/workspace/` | Frontend `src/components/hasib/workspace/` |
|---|---|
| `tasks.js` task reconciliation (automatic tasks close themselves; a rule fires once) | `useWorkspaceActions` (one change at a time, confirm, refusal messages) |
| `queue.js` due buckets, sorting, snooze limits | `AttentionStrip`, `queue.jsx` (filters, snooze) |
| `metrics.js` rate, quantile, population summaries, weekly windows | `kpi.jsx` (cards, basis, trend, diagnostics table, drill-down chips) |
| `settings.js` windows + rules with range checks | `WorkContext` (the sector's record beside a chat or customer) |
| `drafts.js` the one send path for approved drafts (opt-out, 24-hour window, approved no-variable utility template) | `src/styles/workspace.css` (shared), `real-estate.css` and `media.css` (sector colours) |
| `overlap.js` indexed interval conflicts | |

**Navigation.** `SIX_TAB_PACKS` in `src/lib/dashboard/navigation.js`.
- **Tabs:** Chats · Productions · Customers · Broadcasts · Insights · Settings. Producers see Chats, Productions and Customers.
- **Productions views:** Board · Shoot calendar · Resources · Follow-ups.
- **Settings:** BznsBrain · Follow-up rules · Team · Business · Channels · Accounts.
- **Old links:** `today`/`orders` → board, `stock` → resources, `money` → Insights, `team` → Settings › Team.

**Records.** `convex/hasib/mediaSchema.ts`, additive only. A production links one commercial order per accepted scope; approved change orders get their own orders. Tables:
- `mediaProductions` (brief, quote version, deposit, revision allowance, usage rights, preparation checklist, shoot and handoff evidence)
- `mediaCuts` (exact versions)
- `mediaChangeOrders`
- `mediaResources`
- `mediaReservations` (tentative and confirmed)
- `mediaCosts`
- `mediaEvents`, `mediaTasks`, `mediaDrafts`

**Optional fields added to existing tables:**
- `hasibSettings.media`;
- `blueMessages.mediaProductionId` / `mediaDraftId` and `blueCampaignRecipients.mediaDraftId`, kept up to date by the delivery callbacks;
- `hasibFollowups.linkedType` accepts `production`.

**Lifecycle and guards** (`mediaDomain.js`, `mediaState.js`):

```
brief → quoted → awaiting acceptance → booked → preproduction → shooting → editing ⇄ review → accepted → delivered → closed
```

On hold and cancelled are side states.

| Step | Guard |
|---|---|
| Quote | Needs the full brief |
| Acceptance | Must name the current quote version |
| Booking | Needs acceptance, the deposit received on the order, and every hold confirmed |
| Shoot start | Needs the critical preparation items verified |
| Editing | Starts only from a recorded shoot completion with footage received, never from the clock |
| New cut | Supersedes the open one and cancels its reminders |
| Cut decision | Must name the current version and come from its named approver |
| Revision round beyond the allowance | Becomes one priced change order; no new cut until the manager approves, waives or declines it (declined withdraws the round) |
| Handoff | Needs the accepted cut, cleared rights when usage channels are set, and an https link |
| Scope and shoot dates | Lock at acceptance |

The production order only moves with its production (`use_production_status`).

**Holds:**
- Two confirmed bookings can never share a resource.
- A hold over a confirmed booking is refused.
- Tentative holds may overlap; the clash is shown as a task and on the calendar.
- Holds expire at the configured time or at their start, whichever is sooner.

**Follow-ups:**
- **Seven filters:** Today · Overdue · Scheduled · Waiting on customer · Needs decision · Blocked/Failed · Completed.
- **The queue merges:** automatic tasks, rule tasks and drafts, cuts with the client, and dated follow-ups.
- **Three rules**, off until saved, task or draft: prep and brief inputs, current-cut approval, delivery/payment/rights. Rights expiry is always an internal task.
- **Drafts:** deterministic EN/AR text from recorded facts only. Sending stays with `media_draft_approve`.
- **Self-closing tasks** cannot be marked done.

**Insights** (`mediaInsights.js`):
- **Headline:** on-time final delivery, approval wait (median/P90, pending age apart), revision overrun (matured cohort), project contribution (net order revenue − recorded direct costs; incomplete until costs are confirmed).
- **Diagnostics:** quote-to-booked, shoot readiness, committed utilisation (tentative hours shown, never counted), unapproved extra-scope cost (as of now).
- **Other cards:** first-cut timeliness and change orders.
- **Trend:** 8-week trend for period measures.
- **Breakdowns:** production type, client cohort, deliverable format, resource category.
- **Drill-down:** exact population, with Back to Insights.
- An empty population is "no eligible records", never 0.

**Layla intake** (`mediaTurn.js`): a project message creates or updates one open brief per customer from the facts they gave. It runs only where the Media pack is open (the preview harness today).

**UI:** `src/components/hasib/MediaDashboard.jsx` and `src/components/hasib/media/`.
- **Board:** cards show the spec's row (production/deliverable, current cut, shoot/delivery date, approval blocker, producer). Quick filters: Brief incomplete · Shoot at risk · Cut awaiting approval · Extra scope.
- **Preview drawer** at ≥1100px.
- **Full record:** Overview · Holds · Cuts & feedback · Revisions & costs · Follow-ups · Activity.
- **Chats and Customers** show the customer's productions and link to the same record, with Back to chat.
- **Producers** never see quotes, payments, costs or contribution.

## Requirement → code → automated assertion

| Requirement (ascend/media.md) | Code | Assertion |
|---|---|---|
| Six tabs, Productions label, views, aliases, producer limits | `navigation.js`, `config/hasib-packs.js` | `ascend-media-growth` "six tabs…"; `media-browser` §1–2, §9 |
| Media stays off for real accounts | `hasibState.js` live-pack gate | "Media stays off for real accounts" |
| `media.brief_received` | `mediaTurn.js` | "events: brief received…" (one brief, reply updates it, task once) |
| `media.quote_ready` | `quote` | same test (refused until the brief is complete; stale acceptance refused) |
| `media.booking_confirmed` | `manualMoveRefusal`, `reservationStatus` | same test (deposit and holds required; expired hold refused) |
| `media.shoot_preparation` | `currentTasks` shoot_at_risk | same test (one task inside the cutoff; stops when verified) |
| `media.shoot_completed` | `shootComplete` | "events: shoot completed…" (time passing opens a task, never moves the stage) |
| `media.cut_submitted` | `cutSubmit` | same test (one chase; v1 chase cancelled when v2 arrives) |
| `media.revision_or_acceptance` | `cutDecide` | spec journey (v1 cannot accept v2; third round → one change order) |
| `media.final_handoff` | `handoff`, rule `delivery_balance` | spec journey; balance task stops on payment |
| Spec journey (2 rounds, 20% deposit, competing crew, v1→v2, third revision, rights/link, balance 80 000) | all of the above | "spec journey…"; `media-browser` §3–5 |
| K01–K08 | `mediaInsights.js` | "Insights: the eight KPIs…" (golden values, empty = unavailable, correction by voiding a cost, drill-down equals population) |
| Follow-ups filters, badge, snooze version, context | `mediaFollowups.js` | "Follow-ups: the seven filters…"; `media-browser` §6, §8 |
| Draft approval through the shared send path | `workspace/drafts.js` | "drafts: approval goes through the shared send path…"; `media-browser` §6 |
| Tenant isolation, foreign ids | `owned()` everywhere | "brief:… foreign ids are refused" |
| EN/AR, 320/768/1440, axe, no overflow, no errors | UI | `media-browser` §1 |

## Verification (2026-10-11, local)

- `node --test tests/*.test.mjs`: 905/905, including `tests/ascend-media-growth.test.mjs` (9) and `tests/media-workspace-ui.test.mjs` (4).
- `npm test`, `npm run typecheck:convex`, `npm run build`: pass.
- Browser suites: `node scripts/run-browser-tests.mjs` all 10 passed; `node tests/real-estate-browser.mjs` 328/328 (unchanged after the kit refactor); `node tests/media-browser.mjs` 314/314 (manager and producer, EN/AR at 1440/768/320 with axe, overflow and error checks, plus journeys: brief → delivered through the forms, refusal messages, resource conflict, extra scope, draft approval blocked outside the window, Insights drill-down and Back after a reload, chat → production → Back, customer → production, rules persist, producer limits).
- **Demo:** run `npm run build`, then `node scripts/hasib-demo.mjs 5371 --pack=media` for the manager. Add `--role=employee` for the producer.

## Not built (gaps against the full spec)

- **Automation:** automatic sending, a scheduler and the durable outbox (F03). Rules only open tasks or approved drafts.
- **Acquisition:** lead-source touchpoints, attribution, spend and the acquisition funnel (F02/F05).
- **Connectors:** review and storage connectors. Cut and handoff links are entered by hand (https only).
- **Pricing:** package catalogue price rules. Quotes are entered; the deposit follows Settings.
- **Schedule changes:** rescheduling a booked shoot. Shoot dates lock at acceptance; changing them needs a new production or a manual unlock design.
- **Concurrency:** real Convex transaction behaviour for competing holds. The in-memory harness replays requests one after another; an isolated backend is needed to prove true concurrency.
- **Go-live:** turning Media on for real accounts (`HASIB_LIVE_PACKS`), a Convex deploy and a website deploy all need Ahmed's go.
