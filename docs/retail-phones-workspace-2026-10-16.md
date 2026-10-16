# Retail and Phones & electronics on the six-tab kit (2026-10-16)

Release B of Ahmed's request (2026-10-12) to bring the remaining live sectors to the Ascend setup, pointing at the functions they already had. Release A (Automotive and Construction) is `docs/automotive-construction-workspace-2026-10-12.md`.

## What changed

**Layout.** Both store packs use the six tabs: Chats · Work · Customers · Broadcasts · Insights · Settings.

| Pack | Work | Views (each is the screen the store already had) |
|---|---|---|
| Retail | Orders | Orders (`OrdersView`) · Products (`StockView`) · Customer requests (`ProductRequests`) · Follow-ups |
| Phones & electronics | Store & repairs | Repairs (`ServiceView`, warranty and trade-ins) · Sales (`OrdersView`) · Devices (`StockView`, IMEIs) · Follow-ups |

- **Insights:** Overview (`InsightsView`) and Expenses (`ExpensesView`).
- **Settings:** BznsBrain, Follow-up rules, Team, Business, Channels and Accounts.
- **Old links still work:**
  - `today`, `orders`, `stock`, `service`, `money`, `expenses` and `team` open the matching tab and view.
  - `?tab=service&repair=…` still opens that repair.
- **Customers** keeps the manual "Add follow-up" panel. Those follow-ups also appear in the Follow-ups queue.
- **Employees** see Chats, Work and Customers, with the same Work views. Staff limits are unchanged (`staffPolicy.js`): no import, cash figures, costs, price edits, refunds or trade-ins.

**Rules** (Settings → Follow-up rules). Each rule is Auto, Draft, Task or Off. As Ahmed chose for Media, a message that states a recorded fact sends itself.

| Pack | Auto (fact) | Draft | Task |
|---|---|---|---|
| Retail | order ready for collection, with the balance (pickup only); back in stock, to the customer who asked, once per request | — | order Layla could not confirm |
| Phones | repair ready, with the device and the balance; back in stock | repair quote reminder | repair past its promised date |

Automatic messages pass the same send fences as every other sector. The rules are:
- inside the 24-hour window;
- not while the team handles the chat;
- not to a customer who opted out, and not while Layla is paused;
- only from the conversation's own number;
- at most 3 per customer per day.

A held draft keeps its reason (for example `window_closed`).

**Follow-ups.**
- **One queue for both packs** (`store_*` operations), with the seven standard filters. It holds:
  - the tasks the records open: low stock, ready but uncollected, repair ready but uncollected;
  - rule tasks and drafts, and the team's own dated follow-ups;
  - repair quotes waiting on the customer.
- **Bounded:** open orders and repairs are read through status indexes (at most 300 each), and a refresh opens at most 100 new tasks.

**Adiba (Phones).**
- **A repair quote waiting for the customer becomes an offer.**
  - Labour is the technician's figure, so the owner always approves it; Hasib never sends a repair quote by himself.
  - A part keeps its stock price.
- **The customer's YES:** records `repair_approval` (`approvedBy: <name> · OFR-xxx`) for the exact quote the customer was sent. After that, the repair can move to Repairing.
- **A revised quote:** withdraws the offer, so a late yes approves nothing.

**Adiba (both packs).** When Layla answered a price question from a stock line, Adiba no longer drafts an offer for the owner to price. This fixes the overlap noted in the plan.

**Layla (Phones).**
- A repair question opens one "Repair question from Layla" task, matched against a fixed word list, EN and AR.
- The task names no device or fault.
- It is not opened for a customer whose device is already in the shop, and it closes itself once that customer's repair is booked in.

**Hasib.** Both packs are on his 5-minute run (`AUTOMATION_PACKS`, `RUNNERS`). Choosing either pack puts the store on the schedule.

**Fixes along the way.**
- Construction's Follow-ups rows now name the record a task is about (for example `P-E2E · Villa extension · VO-E2E`), not only the project. Found by the end-to-end run.
- Variant options are stored as `[{ key, value }]`, so the back-in-stock message used to read "([object Object])". Found by the new test.
- The phone store's Work tab is now named "Store & repairs".

## Requirement → code → check

| Requirement | Code | Check |
|---|---|---|
| Defaults: facts auto, quote reminder draft, exceptions task | `retailSettings.js` | `ascend-retail-growth` "defaults" |
| Ready and back-in-stock messages: once, with recorded facts only, inside the fences | `retailRules.js`, `retailBoard.js`, `retailAutomation.js` | "ready for collection…", "back in stock…" |
| The owner approves repair quotes; a yes approves only that quote | `repairOffer.js`, `adibaSubjects.js` | "a repair quote becomes Adiba's offer…"; caught by a mutation check |
| No offer for a price Layla gave from stock | `adibaTurn.js` `stockMatched` | "Layla takes in a repair question…"; caught by a mutation check |
| Staff never approve drafts or see order amounts | `retailWorkspace.js` | "Follow-ups: an order Layla could not confirm…" |
| End to end: a customer writes in, Hasib runs, Adiba's offer is approved, the yes comes back (all four sectors, manager and employee) | `scripts/hasib-demo.mjs` `/demo/advance`, `/demo/run` | `tests/ascend-e2e-browser.mjs` (83) |
| Six tabs in EN and AR at 320–1440, accessible; old links land | `StoreWorkspace.jsx`, `navigation.js` | `retail-browser`, `retail-tech-browser` (603), `layla-dashboard-browser` |

## Not built
- multi-branch stock;
- trade-in valuation offers;
- a discount-requested offer on an order;
- templates sent outside the 24-hour window.
