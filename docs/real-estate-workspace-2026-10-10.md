# Real Estate six-tab workspace (from ascend/real-estate.md)

Date: 2026-10-10. Status: built and verified locally against the real Convex state code. Not deployed. Ascend is still "in preparation — do not quote"; these screens appear only for Ascend workspaces on the real-estate pack.

## What changed

**Navigation.** Real Estate is six tabs, in the spec's order:

> Chats · Deals · Customers · Broadcasts · Insights · Settings

Section ids are `chats`, `work`, `customers`, `broadcasts`, `insights` and `settings`. Agents see Chats, Deals and Customers. Old links still work:

| Old link | Now opens |
|---|---|
| `today`, `orders` | Deals › Board |
| `stock` | Deals › Properties |
| `money` | Insights |
| `team` | Settings › Team |

The mapping is in `src/lib/dashboard/navigation.js`. Every other pack keeps its current navigation.

**Deals:**
- The page opens with the title, a *Needs attention* strip, then the view tabs.
- **Board:** a column for each real stage, with won and lost as filters. Each card shows the requirement, budget, next viewing, agent and next step. A *Move to* control moves the deal forward only.
- **Quick filters:** My deals, Unassigned, Awaiting response, Viewing due.
- **Desktop preview:** opens beside the board, with *Open full record*.
- **Full record:** has Overview, Follow-ups and Activity sections. Its viewings, offers and drafts are read by deal id.
- **Back:** returns to wherever the record was opened from (board, chat, customer, Insights records), keeping filters and scroll.
- **Viewings:** grouped as outcome to record, upcoming, and done.
- **Properties:** reads the freshness setting.
- **Follow-ups:** one queue with Today, Overdue, Scheduled, Needs approval, Blocked/Failed and Completed. Rows come from automatic tasks, rule tasks, rule or agent drafts, and dated follow-ups linked to a deal.

**Insights:**
- Four headline cards and four diagnostics, each with its numerator, denominator, window, as-of time and an Incomplete flag:

  | Headline | Diagnostic |
  |---|---|
  | Qualified-to-viewing (matured cohorts) | Qualified-to-close (rent and sale windows) |
  | Viewing attendance (timely cancellations excluded) | Time to viewing (median, P90) |
  | Unanswered qualified inquiries (as of now) | Listing freshness |
  | Commission overdue (order balance past its due date) | Offer decision backlog |

- **Trend:** cohort measures show an 8-week trend. Backlog measures show none.
- **Breakdowns:** rental vs sale, property type, lead source, agent.
- **Source records:** opens the exact population in Deals, and *Back to Insights* restores the view. Code: `convex/hasib/realEstateInsights.js`.

**Links:**
- A chat and a customer record show the customer's deals: stage, next viewing, latest offer and message, open follow-ups.
- They link to the same record in Deals (`real_estate_context`, `DealContext.jsx`).

**Settings → Follow-up rules** (`convex/hasib/realEstateRules.js`):
- **The three rules:** missing requirements, viewing confirmation, and decision after a viewing.
- **Defaults:** each rule is off until saved.
- **Modes:** *task* opens a task for the deal's agent; *draft* writes a message from approved records only, never availability or price.
- **Limits:** one firing per event, and records older than 30 days are not picked up.
- **Stops:**
  - a reply, a qualified or closed deal, or an offer;
  - a reschedule replaces the reminder;
  - nothing fires after a viewing starts;
  - an unsent rule draft is cancelled once its cause is gone.
- **Sending** stays with `draft_approve` and its window, template and opt-out checks.
- **No scheduler:** tasks are brought up to date when the dashboard or Layla's turn reads the account. Automatic sending is not built.
- **Measurement windows** are in the same screen, and each KPI definition names its value.

## Fixes found while inspecting

- The API dropped any workflow text over 100 characters, which broke offer terms, drafts, viewing outcomes, descriptions and locations. Each field now has the same limit Convex stores.
- `draft_save` now replays by request id, so a retried save no longer creates a duplicate.
- Deal details missed viewings, offers and drafts beyond the agency's newest 25. They are now read by deal, and the board pages through up to 1,000 deals.
- Finance labels now include the `approved` value Layla stores. The client's offer steps now match the server (countered → presented).
- *Mark paid* records the remaining balance as a payment on the commission's order, so the order is the one record of money. Commissions carry a due date, set at close from Settings → payment terms.
- Follow-ups can link to a deal (`linkedType: 'opportunity'`).

## Data changes (Convex)

All schema additions are optional, so existing records stay valid:

| Table | New field |
|---|---|
| `realEstateViewings` | `statusAt` |
| `realEstateOffers` | `decisionDueAt` |
| `realEstateCommissions` | `dueAt` |
| `realEstateDrafts` | `ruleId`, `ruleKey` |
| `realEstateTasks` | `snoozedUntil` |
| `hasibFollowups.linkedType` | new value `opportunity` |
| `hasibSettings` | `realEstate` (windows and rules) |

New operations: `real_estate_followups`, `real_estate_task_snooze`, `real_estate_context` and `real_estate_metric_records` (manager only).

A release needs `npx convex deploy` before the Vercel deploy.

## Verification (local)

- `node --test tests/*.test.mjs`. The new `tests/real-estate-workspace.test.mjs` covers:
  - each KPI's population;
  - cohort maturity;
  - timely vs late cancellation;
  - the unanswered SLA and a reply clearing it;
  - overdue only past a due date, with partial payments;
  - drill-down equals the population;
  - rules: off by default, dedupe, stop on reply, reschedule, expiry;
  - draft cancellation;
  - the queue merge, snooze version, and context;
  - long text kept;
  - draft replay;
  - the six-tab map and aliases;
  - board helpers.
- `node tests/real-estate-browser.mjs` runs against the demo agency, manager and agent:
  - every destination in EN and AR at 1440, 768 and 320, with no overflow, axe, and no errors;
  - old links;
  - listing to close;
  - filters kept after Back;
  - a stage move;
  - a lost deal;
  - rule draft approval blocked for a template;
  - snooze;
  - Insights drill-down and Back after a reload;
  - chat → deal → Back to chat;
  - a customer record's deal;
  - rules persisting;
  - agent limits.
- `node scripts/run-browser-tests.mjs`: all 10 suites.

**Demo:** `npm run build && node scripts/hasib-demo.mjs 5361 --pack=real-estate`, with `--role=employee` for the agent. It seeds a synthetic Muscat agency through the same API (`scripts/hasib-demo-real-estate.mjs`). Nothing reaches a provider.

**Not verified:** production authentication, real channel delivery, and live KPI accuracy on a real agency's history.
