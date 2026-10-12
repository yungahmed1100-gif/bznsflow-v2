# Automotive and Construction on the six-tab kit (2026-10-12)

Ahmed asked for the remaining live sectors to match the updated Ascend setup, and said to point at the functions they already had. This is Release A: Automotive and Construction. Retail and Phones & electronics follow in Release B.

## What changed

**Layout.** Both sectors now use the six Ascend tabs: Chats · Work · Customers · Broadcasts · Insights · Settings.
- **Automotive's Work** ("Workshop") has Board, Schedule, Parts and Follow-ups.
- **Construction's Work** ("Projects") has Projects, Procurement & site, and Follow-ups. Milestones, variations, claims and retention stay on each project.
- **Kept screens:** each view is the screen the sector already had (`AutomotiveDashboard.jsx`, `ConstructionDashboard.jsx`). Old links (`orders`, `stock`, `money`, `today`, `team`) land in the matching tab.
- **Settings:** now reaches BznsBrain, Channels, Business details and Accounts. Before this, Construction hid them and Automotive's Business and Accounts showed the workshop page. Each sector's own setup is under "Workshop setup" or "Project defaults".

**Rules** (Settings → Follow-up rules). Each rule can be set to Auto, Draft or Off, as Ahmed chose for Media: a recorded fact sends itself, and a decision waits.

| Sector | Auto (fact) | Draft | Task |
|---|---|---|---|
| Automotive | ready for collection, after a recorded quality check, with the balance | estimate reminder, next service due | promise at risk |
| Construction | certified balance past due, with the certified balance | variation decision | variation holding work up, milestone at risk |

Automatic messages pass the shared fences:
- inside the 24-hour window;
- not while the team handles the chat;
- not to a customer who opted out, and not while Layla is paused;
- only from the conversation's own number;
- at most 3 per customer per day.

**Follow-ups.** One queue per sector, with the seven standard filters. It holds the tasks the records open (each closes itself when its cause is gone), rule drafts, and estimates or variations waiting on the customer.
- **Bounded:** a refresh reads only active work through status indexes and opens at most 100 new tasks.
- **Automotive tasks:** appointment request, estimate waiting, past promise, ready but uncollected, waiting on a part.
- **Construction tasks:** materials due, certified payment overdue, project enquiry, signed variation required.

**Adiba.**
- **An Automotive estimate becomes an offer in the customer's chat.**
  - **When Hasib sends it himself:** only when every line is priced from the service list or a part's fixed price, and the total is within the workshop's limit (default 0, off). A price an advisor typed always goes to the owner.
  - **The customer's YES:** approves that exact estimate, recorded as WhatsApp or Instagram evidence.
  - **A revised estimate:** withdraws the old offer.
- **A Construction variation that adds to the contract becomes an offer the owner approves.** Approving it submits the variation.
  - **The client's YES:** is recorded on the variation (`customerApproval`) and opens a task to attach the signed copy. Only the owner approves the variation (Ahmed's choice).
  - **Never shown to the client:** the internal cost effect (`budgetDeltaMinor`).
  - **Credits and omissions:** stay manual.

**Layla.**
- **Automotive:** a service request opens one task.
- **Construction:** a project enquiry opens one task, but none for a client who already has a tender.

**Hasib.** Both sectors are on his 5-minute schedule (`AUTOMATION_PACKS`). The kit's `sendAutoRuleDrafts` now serves Media too.

**Staff.**
- **Technicians** see only their own work.
- **Construction employees** no longer see variation exposure, receivables, or money follow-ups.
- **Draft approval** is the manager's.

**Demo.** Construction now seeds real contracting records (baseline, active project, variation, commitment, a certified and partly paid claim) instead of a generic job.

## Requirement → code → check

| Requirement | Code | Check |
|---|---|---|
| Defaults: facts auto, decisions draft, risks task | `automotiveSettings.js`, `constructionSettings.js` | `ascend-*-growth` "defaults" tests |
| "Ready" only after a passed quality check, once | `automotiveRules.js` | `ascend-automotive-growth` "ready" test |
| Hasib sends only fact-priced estimates within the limit | `automotiveAutomation.js` `FACT_SOURCES` | "Hasib sends an estimate himself…"; caught by a mutation check |
| A YES approves only the estimate it was sent for | `adibaSubjects.js` `currentEstimate`, `automotive_approval_record` | "a revised estimate withdraws the offer…" |
| A variation YES is recorded, not approved; contract 1,050,000 | `adibaSubjects.js` `construction_variation` | `ascend-construction-growth` |
| Staff never see construction money | `constructionWorkspace.js` `siteOverview`, `MONEY_TASKS` | "a certified balance past due…" |
| Bounded at scale | `automotiveBoard.js`, `constructionBoard.js`, `reconcileTasks` `maxNew` | `hasib-automotive-load`, `hasib-construction-load` (under 2 s) |
| Six tabs in EN/AR at 320–1440, accessible | `AutomotiveWorkspace.jsx`, `ConstructionWorkspace.jsx` | `hasib-industries-browser.mjs construction automotive` 12/12 |

## Not built

- a work-order or project record page opened from a link; the links land on the board or projects list;
- an Insights drill-down (`*_metric_records`);
- appointment booking from chat (Layla opens a task; the team books);
- negative (credit) variation offers;
- templates sent outside the 24-hour window.
